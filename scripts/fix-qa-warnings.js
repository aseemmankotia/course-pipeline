#!/usr/bin/env node
/**
 * fix-qa-warnings.js — clear the non-blocking QA warnings for a course.
 *
 * Handles the two warnings the pipeline can repair automatically:
 *
 *   1. Duplicate practice-test questions. The second copy is regenerated as a
 *      fresh question in the same domain, so the test keeps its question count.
 *   2. Over-length chapter scripts (>4200 words). The script is condensed by
 *      removing repetition and filler while preserving every exam callout, the
 *      lab pause, and all technical specifics.
 *
 * Usage:
 *   node scripts/fix-qa-warnings.js --slug=<slug>            # repair
 *   node scripts/fix-qa-warnings.js --slug=<slug> --dry-run  # report only
 *   node scripts/fix-qa-warnings.js --slug=<slug> --only=dupes|scripts
 *
 * NOTE: condensing a script changes narration, so that chapter must be
 * re-rendered (its TTS audio and slides are rebuilt from the new text).
 * Duplicate-question fixes do not affect video.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/fix-qa-warnings.js --slug=<slug> [--dry-run] [--only=dupes|scripts]'); process.exit(1); }

require('dotenv').config({ path: path.join(ROOT, '.env') });
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.COURSE_GEN_MODEL || 'claude-sonnet-5';
if (!API_KEY && !args['dry-run']) { console.error('ANTHROPIC_API_KEY missing in .env'); process.exit(1); }

const WORD_CAP = 4200;
const WORD_TARGET = 3900;          // aim under the cap, not at it
const MULTISELECT = /\bselect\s+(two|three|four|2|3|4)\b|\bchoose\s+(two|three|four|2|3|4)\b|\(select\b|\(choose\b/i;

// Filler/throat-clearing phrases QA blocks on. Kept in sync with qa-course.js.
// These are removed DETERMINISTICALLY (no model call) so the self-heal loop can
// always clear them — otherwise a single "welcome back" hard-fails the whole run.
const FLUFF = [
  'welcome back', 'great question', 'without further ado', 'dive right in',
  'in this section we will', 'hope that makes sense', 'hey everyone',
  'hi everyone', 'hello everyone', "let's take a moment", 'as i mentioned earlier',
  'moving on to our next topic', 'in today’s video', "in today's video",
];
function stripFluff(text) {
  let out = String(text || '');
  for (const f of FLUFF) {
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // remove the phrase plus any immediately trailing punctuation/space
    out = out.replace(new RegExp('\\s*' + esc + '\\s*[,.!:;]?\\s*', 'gi'), ' ');
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?;:])/g, '$1').replace(/(-)\s{2,}/g, '$1 ');
}
function findFluff() {
  const out = [];
  for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
    const t = String((state.scripts && state.scripts[ch.number]) || '').toLowerCase();
    const hits = FLUFF.filter(f => t.includes(f));
    if (hits.length) out.push({ number: ch.number, title: ch.title, hits });
  }
  return out;
}

const DIR = path.join(ROOT, 'generated', args.slug);
const STATE_FILE = path.join(DIR, 'state.json');
if (!fs.existsSync(STATE_FILE)) { console.error(`No state.json for slug "${args.slug}"`); process.exit(1); }
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

const only = args.only || 'all';
const wants = k => only === 'all' || only === k;
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const sig = q => String(q || '').toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 120);

// ---------- API ----------
async function callClaude(system, user, maxTokens, label) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      // Join all text blocks — Sonnet 5 may emit a leading non-text (reasoning) block.
      const text = (j.content || []).map(b => (b && typeof b.text === 'string') ? b.text : '').join('');
      if (!text.trim()) throw new Error(`empty/non-text response (stop_reason=${j.stop_reason})`);
      return text;
    } catch (e) {
      const retriable = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket|network|HTTP 5|HTTP 429/i.test(e.message);
      if (attempt === 6 || !retriable) throw e;
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      console.log(`   ⏳ ${label}: ${e.message.slice(0, 60)} — retry in ${wait / 1000}s (${attempt}/6)`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

function parseJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/); if (start > 0) body = body.slice(start);
  const last = body.lastIndexOf('}'); if (last !== -1) body = body.slice(0, last + 1);
  return JSON.parse(body);
}

const cert = (state.curriculum && state.curriculum.course_title) || args.slug;

// ---------- 1. duplicate practice-test questions ----------
function findDuplicates() {
  const seen = new Map(); const dupes = [];
  for (const k of Object.keys(state.tests || {})) {
    (state.tests[k] || []).forEach((q, i) => {
      const s = sig(q.question);
      if (seen.has(s)) dupes.push({ key: k, idx: i, first: seen.get(s), question: q.question, domain: q.domain || (k.split(':')[1] || '').trim() });
      else seen.set(s, `${k} #${i + 1}`);
    });
  }
  return dupes;
}

async function regenerateDuplicate(d) {
  const existing = Object.values(state.tests || {}).flat().map(q => q.question).filter(Boolean);
  const system = `You write certification practice questions. Respond with ONLY one valid JSON object, no commentary.

ABSOLUTE RULE: exactly 4 options, exactly ONE correct answer. Never write "(Select TWO)",
"(Choose TWO)", "(Select THREE)" or any wording asking for more than one answer. If a concept
needs two actions, bundle them into a single option.`;

  const user = `This practice question duplicates another question already in the test bank for ${cert}.

Write a REPLACEMENT question for exam domain "${d.domain}" that tests a DIFFERENT concept within that domain.

DUPLICATE TO REPLACE:
${d.question}

Do not repeat the scenario or the concept of any of these existing questions:
${existing.slice(0, 60).map(q => '- ' + String(q).slice(0, 110)).join('\n')}

Return ONLY:
{"question":"...","options":["...","...","...","..."],"correct_index":<0-3>,"domain":"${String(d.domain).replace(/"/g, "'")}","why_correct":"...","why_others_wrong":["...","...","..."],"commonly_missed":false}

Vary which index is correct. Match the scenario style and difficulty of a real exam question.`;

  const out = parseJSON(await callClaude(system, user, 2000, `dupe ${d.key} #${d.idx + 1}`));
  if (!Array.isArray(out.options) || out.options.length !== 4) throw new Error('replacement lacks 4 options');
  if (!Number.isInteger(out.correct_index) || out.correct_index < 0 || out.correct_index > 3) throw new Error('bad correct_index');
  if (MULTISELECT.test(out.question)) throw new Error('replacement is multi-select');
  if (sig(out.question) === sig(d.question)) throw new Error('replacement is still a duplicate');
  return out;
}

// ---------- 2. over-length chapter scripts ----------
function findLongScripts() {
  const out = [];
  for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
    const w = words(state.scripts && state.scripts[ch.number]);
    if (w > WORD_CAP) out.push({ number: ch.number, title: ch.title, words: w });
  }
  return out;
}

async function condense(ch) {
  const original = state.scripts[ch.number];
  const examBefore = (original.match(/exam note/gi) || []).length;
  const hadLab = /pause here/i.test(original);
  let lastErr, feedback = '';

  // Condensing is a judgement task and one pass often lands just over the cap,
  // so retry with the actual miss fed back in and a progressively lower target.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const target = Math.round(WORD_TARGET - (attempt - 1) * 250); // 3900 → 3150
    try {
      const r = await condenseOnce(ch, original, target, feedback, attempt);
      if (r.w > WORD_CAP) throw new Error(`still ${r.w} words (cap ${WORD_CAP})`);
      if (r.w < target * 0.6) throw new Error(`over-cut to ${r.w} words`);
      if (r.examAfter < examBefore) throw new Error(`lost exam callouts (${examBefore} → ${r.examAfter})`);
      if (hadLab && !/pause here/i.test(r.revised)) throw new Error('lost the lab pause instruction');
      return r;
    } catch (e) {
      lastErr = e;
      if (attempt === 4) break;
      feedback = `\n\nYour previous attempt was rejected: ${e.message}. Cut harder this time, but keep every exam callout and the full lab walkthrough intact.`;
      console.log(`\n      ⚠️  attempt ${attempt}: ${e.message} — retrying with target ${Math.round(WORD_TARGET - attempt * 250)}w`);
      process.stdout.write('      ');
    }
  }
  throw lastErr;
}

async function condenseOnce(ch, original, target, feedback, attempt) {
  const system = `You are a top certification-course scriptwriter. You are editing an existing
narration script down to length. Return ONLY the revised script text — no preamble, no commentary,
no markdown fences.`;

  const user = `This chapter narration for "${cert}" runs ${ch.words} words. Tighten it to about ${target} words (hard maximum ${WORD_CAP}).${feedback}

Chapter ${ch.number}: ${ch.title}

CUT: repetition, restated points, throat-clearing transitions, over-long preambles, redundant recaps,
and any sentence that adds words without adding information.

PRESERVE EXACTLY, without weakening:
- every "Exam note" / exam callout (there must be at least as many as the original has)
- the "pause here" lab instruction and the full lab walkthrough steps
- all technical specifics: service names, API and CLI syntax, configuration values, limits, numbers
- the teaching order and the chapter's opening hook and closing summary
- the spoken, second-person instructional voice

Do not introduce new claims or new services. This is an edit for concision, not a rewrite.

SCRIPT:
${original}`;

  const revised = (await callClaude(system, user, 8000, `ch${ch.number} condense a${attempt}`)).trim();
  return {
    revised,
    w: words(revised),
    examBefore: (original.match(/exam note/gi) || []).length,
    examAfter: (revised.match(/exam note/gi) || []).length,
  };
}

// ---------- run ----------
(async () => {
  const dupes = wants('dupes') ? findDuplicates() : [];
  const longs = wants('scripts') ? findLongScripts() : [];
  const fluffs = wants('fluff') ? findFluff() : [];

  console.log(`\n🔍 ${args.slug}`);
  console.log(`   duplicate practice-test questions: ${dupes.length}`);
  dupes.forEach(d => console.log(`     • ${d.key} #${d.idx + 1} (duplicates ${d.first})`));
  console.log(`   over-length scripts (>${WORD_CAP} words): ${longs.length}`);
  longs.forEach(l => console.log(`     • ch${l.number} — ${l.words} words — ${l.title}`));
  console.log(`   scripts with fluff phrases: ${fluffs.length}`);
  fluffs.forEach(f => console.log(`     • ch${f.number} — ${f.hits.join(', ')}`));

  if (!dupes.length && !longs.length && !fluffs.length) { console.log('\n✅ no warnings to fix\n'); process.exit(0); }
  if (args['dry-run']) { console.log('\n(dry run — no changes written)\n'); process.exit(0); }

  const backup = path.join(DIR, `state.backup.${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(state, null, 2));
  console.log(`\n💾 backup: ${path.relative(ROOT, backup)}\n`);

  let failed = 0;
  const rerender = [];

  for (const d of dupes) {
    process.stdout.write(`   ↻ duplicate ${d.key} #${d.idx + 1} ... `);
    try {
      state.tests[d.key][d.idx] = await regenerateDuplicate(d);
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.log('replaced');
    } catch (e) { failed++; console.log(`FAILED (${e.message.slice(0, 70)})`); }
  }

  for (const l of longs) {
    process.stdout.write(`   ↻ ch${l.number} ${l.words}w ... `);
    try {
      const r = await condense(l);
      state.scripts[l.number] = r.revised;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      rerender.push(l.number);
      console.log(`condensed to ${r.w}w (exam notes ${r.examBefore} → ${r.examAfter})`);
    } catch (e) { failed++; console.log(`FAILED (${e.message.slice(0, 70)})`); }
  }

  for (const f of fluffs) {
    const before = state.scripts[f.number];
    const after = stripFluff(before);
    if (after !== before) {
      state.scripts[f.number] = after;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      if (!rerender.includes(f.number)) rerender.push(f.number);
      console.log(`   ✂ ch${f.number} fluff removed (${f.hits.join(', ')})`);
    } else { failed++; console.log(`   ⚠ ch${f.number} fluff not removable cleanly (${f.hits.join(', ')})`); }
  }

  console.log(`\n${failed ? '⚠️ ' : '✅ '}done${failed ? ` — ${failed} failed, re-run to retry` : ''}`);
  console.log(`\nNext: node scripts/generate-course.js --config=course-configs/<config>.json --stage=assemble`);
  console.log(`Then: npm run qa -- --slug=${args.slug}`);
  if (rerender.length) {
    console.log(`\n⚠️  Narration changed for chapter(s) ${rerender.join(', ')} — those chapters must be`);
    console.log(`   re-rendered so audio and slides match the new script. Everything else is unaffected.`);
  }
  console.log('');
  process.exit(failed ? 1 : 0);
})();
