#!/usr/bin/env node
/**
 * expand-short-chapter.js — counterpart to the condenser in fix-qa-warnings.js.
 *
 * Finds chapter scripts under the QA word floor (1800 words) and expands them
 * to ~2300 words by deepening explanations, adding a worked example, and
 * strengthening exam-relevance — while preserving every existing "exam note"
 * callout, the "pause here" lab instruction, and all technical specifics.
 *
 * Usage:
 *   node scripts/expand-short-chapter.js --slug=<slug>            # repair all short chapters
 *   node scripts/expand-short-chapter.js --slug=<slug> --dry-run  # report only
 *
 * NOTE: expanding a script changes narration, so that chapter must be
 * re-rendered. Always re-run the assemble stage afterwards:
 *   node scripts/generate-course.js --config=<config> --stage=assemble
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/expand-short-chapter.js --slug=<slug> [--dry-run]'); process.exit(1); }

require('dotenv').config({ path: path.join(ROOT, '.env') });
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.COURSE_GEN_MODEL || 'claude-sonnet-5';
if (!API_KEY && !args['dry-run']) { console.error('ANTHROPIC_API_KEY missing in .env'); process.exit(1); }

const WORD_FLOOR = 1800;   // qa-course.js blocking threshold
const WORD_TARGET = 2300;  // comfortable margin above the floor

const DIR = path.join(ROOT, 'generated', args.slug);
const STATE_FILE = path.join(DIR, 'state.json');
if (!fs.existsSync(STATE_FILE)) { console.error(`No state.json for slug "${args.slug}"`); process.exit(1); }
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const examNotes = t => (String(t).match(/exam note/gi) || []).length;
const hasLabPause = t => /pause here/i.test(String(t));

async function callClaude(system, user, maxTokens, label) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()).content[0].text;
    } catch (e) {
      const retriable = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket|network|HTTP 5|HTTP 429/i.test(e.message);
      if (attempt === 6 || !retriable) throw e;
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      console.log(`   ⏳ ${label}: ${e.message.slice(0, 60)} — retry in ${wait / 1000}s (${attempt}/6)`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

const cert = (state.curriculum && state.curriculum.course_title) || args.slug;

function findShortScripts() {
  const out = [];
  const chapters = (state.curriculum && state.curriculum.chapters) || [];
  for (const ch of chapters) {
    const isFinal = ch.number === chapters.length;
    if (isFinal) continue; // final exam-sim chapter is exempt in QA
    const w = words(state.scripts && state.scripts[ch.number]);
    if (w && w < WORD_FLOOR) out.push({ number: ch.number, title: ch.title, words: w, domain: ch.exam_domain });
  }
  return out;
}

async function expandOne(ch) {
  const script = state.scripts[ch.number];
  const notesBefore = examNotes(script);
  const labBefore = hasLabPause(script);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const target = WORD_TARGET + (attempt - 1) * 200; // 2300 → 2700
    const system = `You expand certification-course narration scripts. Return ONLY the full revised script text — no commentary, no markdown headers, no word counts.`;
    const user = `This chapter narration for "${cert}" runs ${ch.words} words, which is too short. Expand it to about ${target} words (minimum ${WORD_FLOOR + 100}).

HOW TO EXPAND (in priority order):
1. Deepen the explanation of the most exam-relevant concepts — add the "why", tradeoffs, and when-to-use guidance.
2. Add one concrete worked example or realistic scenario per major section.
3. Add 1-2 new "Exam note:" callouts for genuinely testable facts (keep every existing one verbatim).
4. Strengthen transitions between sections.

HARD RULES:
- Preserve EVERY existing "Exam note:" callout (there are ${notesBefore}) — do not remove or reword them.
- Preserve the "pause here" lab instruction exactly where it appears.
- Keep all technical specifics accurate; never fabricate facts, numbers, or exam trivia.
- No filler phrases ("welcome back", "as we discussed", "in this chapter we will").
- Natural spoken narration style, matching the existing voice.

CHAPTER: ${ch.title} (exam domain: ${ch.domain || 'n/a'})

CURRENT SCRIPT:
${script}`;

    const out = (await callClaude(system, user, 8000, `expand ch${ch.number} (attempt ${attempt})`)).trim();
    const w = words(out);
    const problems = [];
    if (w < WORD_FLOOR + 50) problems.push(`still ${w} words`);
    if (examNotes(out) < notesBefore) problems.push(`lost exam notes (${examNotes(out)} < ${notesBefore})`);
    if (labBefore && !hasLabPause(out)) problems.push('lost lab pause');
    if (!problems.length) return { text: out, words: w, notes: examNotes(out) };
    console.log(`      ⚠️  attempt ${attempt}: ${problems.join(', ')} — retrying`);
  }
  throw new Error(`ch${ch.number}: expansion failed after 3 attempts`);
}

(async () => {
  const shorts = findShortScripts();
  console.log(`\n📏 Short chapters (<${WORD_FLOOR} words): ${shorts.length}`);
  shorts.forEach(s => console.log(`   ch${s.number}: ${s.words}w — ${s.title}`));
  if (!shorts.length || args['dry-run']) return;

  for (const ch of shorts) {
    console.log(`\n✏️  Expanding ch${ch.number} (${ch.words}w → ~${WORD_TARGET}w)…`);
    const r = await expandOne(ch);
    // backup then write
    const bak = path.join(DIR, `script-ch${ch.number}-pre-expand-${Date.now()}.txt.bak`);
    fs.writeFileSync(bak, state.scripts[ch.number]);
    state.scripts[ch.number] = r.text;
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`   ✅ ch${ch.number}: now ${r.words}w, ${r.notes} exam notes (backup: ${path.basename(bak)})`);
  }
  console.log(`\nNext: re-run assemble + QA:`);
  console.log(`  node scripts/generate-course.js --config=course-configs/<config>.json --stage=assemble`);
  console.log(`  node scripts/qa-course.js --slug=${args.slug}`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
