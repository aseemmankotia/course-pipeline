#!/usr/bin/env node
/**
 * fix-multiselect.js — repair multi-select questions in a generated course.
 *
 * The pipeline schema stores ONE correct answer per question (an integer
 * correct_index). Questions phrased "(Select TWO)" / "(Choose THREE)" /
 * "Which combination..." cannot be represented: the learner is asked for
 * several answers but can only pick one, and the answer key marks a single
 * option correct. They are defects wherever they appear.
 *
 * This script finds every such question across chapter quizzes, chapter
 * materials, and both practice tests, then regenerates each one in place as a
 * proper single-answer question that tests the same concept and domain.
 *
 * Usage:
 *   node scripts/fix-multiselect.js --slug=<slug>            # repair
 *   node scripts/fix-multiselect.js --slug=<slug> --dry-run  # report only
 *
 * Safe to re-run: already-clean questions are left untouched. A timestamped
 * backup of state.json is written before any change.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/fix-multiselect.js --slug=<slug> [--dry-run]'); process.exit(1); }

require('dotenv').config({ path: path.join(ROOT, '.env') });
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.COURSE_GEN_MODEL || 'claude-sonnet-5';
if (!API_KEY && !args['dry-run']) { console.error('ANTHROPIC_API_KEY missing in .env'); process.exit(1); }

// Only "select/choose N" phrasing is a defect. "Which combination ...?" is FINE:
// each option bundles several actions and exactly one option is correct, which the
// single-answer schema represents perfectly. Do not rewrite those.
const MULTISELECT = /\bselect\s+(two|three|four|2|3|4)\b|\bchoose\s+(two|three|four|2|3|4)\b|\(select\b|\(choose\b/i;

const DIR = path.join(ROOT, 'generated', args.slug);
const STATE_FILE = path.join(DIR, 'state.json');
if (!fs.existsSync(STATE_FILE)) { console.error(`No state.json for slug "${args.slug}"`); process.exit(1); }
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

// ---------- API ----------
async function callClaude(system, user, maxTokens = 2000, label = '') {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      // Join all text blocks — Sonnet 5 may emit a leading non-text (reasoning)
      // block, so content[0] is not reliably the text block.
      const text = (json.content || []).map(b => (b && typeof b.text === 'string') ? b.text : '').join('');
      if (!text.trim()) throw new Error(`empty/non-text response (stop_reason=${json.stop_reason})`);
      return text;
    } catch (e) {
      const retriable = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket|network|HTTP 5|HTTP 429/i.test(e.message);
      if (attempt === 6 || !retriable) throw e;
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      console.log(`   ⏳ ${label}: ${e.message.slice(0, 60)} — retrying in ${wait / 1000}s (${attempt}/6)`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

function parseJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  if (start > 0) body = body.slice(start);
  const lastObj = body.lastIndexOf('}');
  if (lastObj !== -1) body = body.slice(0, lastObj + 1);
  return JSON.parse(body);
}

const SYSTEM = `You write certification practice questions. Respond with ONLY a single valid JSON object, no commentary.

ABSOLUTE RULE: the question must have exactly 4 options and exactly ONE correct answer.
Never write "(Select TWO)", "(Choose TWO)", "(Select THREE)", "Which combination", or any
wording asking for more than one answer. If the concept naturally needs two actions, bundle
them into a single option (e.g. "Delete the access key AND review CloudTrail for misuse")
and make the distractors bundle plausible-but-wrong action pairs.`;

async function regenerate(q, ctx) {
  const user = `The practice question below is broken: it asks the learner to select multiple answers, but the delivery format stores only ONE correct answer.

Rewrite it as a single-answer question testing the SAME underlying concept at the same difficulty.

Certification: ${ctx.cert} (${ctx.code})
Exam domain: ${q.domain || ctx.domain || 'as per the original question'}

BROKEN QUESTION:
${q.question}
Options: ${JSON.stringify(q.options, null, 1)}

Return ONLY this JSON object:
{"question":"...","options":["...","...","...","..."],"correct_index":<0-3>,"domain":"${(q.domain || ctx.domain || '').replace(/"/g, "'")}","why_correct":"...","why_others_wrong":["...","...","..."],"commonly_missed":${q.commonly_missed === true}}

Vary which index holds the correct answer. Keep the scenario style and technical depth of the original.`;

  const out = parseJSON(await callClaude(SYSTEM, user, 2000, ctx.label));
  if (!Array.isArray(out.options) || out.options.length !== 4) throw new Error('regenerated question does not have 4 options');
  if (!Number.isInteger(out.correct_index) || out.correct_index < 0 || out.correct_index > 3) throw new Error('regenerated question has bad correct_index');
  if (MULTISELECT.test(out.question)) throw new Error('regenerated question is still multi-select');
  // preserve fields the rest of the pipeline expects
  return { ...q, ...out };
}

// ---------- collect targets ----------
const targets = [];
for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
  (ch.quiz_questions || []).forEach((q, i) => {
    if (MULTISELECT.test(q.question || '')) targets.push({ kind: 'quiz', label: `ch${ch.number} quiz${i + 1}`, get: () => ch.quiz_questions[i], set: v => { ch.quiz_questions[i] = v; }, domain: ch.domain });
  });
  const m = (state.materials || {})[`ch${ch.number}`];
  (m && m.questions || []).forEach((q, i) => {
    if (MULTISELECT.test(q.question || '')) targets.push({ kind: 'materials', label: `ch${ch.number} matQ${i + 1}`, get: () => m.questions[i], set: v => { m.questions[i] = v; }, domain: ch.domain });
  });
}
for (const k of Object.keys(state.tests || {})) {
  (state.tests[k] || []).forEach((q, i) => {
    if (MULTISELECT.test(q.question || '')) targets.push({ kind: 'tests', label: `${k} #${i + 1}`, get: () => state.tests[k][i], set: v => { state.tests[k][i] = v; }, domain: (k.split(':')[1] || '').trim() });
  });
}

const cert = (state.curriculum && state.curriculum.course_title) || args.slug;
const code = (state.curriculum && state.curriculum.exam_code) || '';

console.log(`\n🔍 ${args.slug}: found ${targets.length} multi-select question(s)`);
for (const t of targets) console.log(`   • [${t.kind}] ${t.label}`);
if (!targets.length) { console.log('✅ nothing to repair\n'); process.exit(0); }
if (args['dry-run']) { console.log('\n(dry run — no changes written)\n'); process.exit(0); }

// ---------- repair ----------
(async () => {
  const backup = path.join(DIR, `state.backup.${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(state, null, 2));
  console.log(`\n💾 backup: ${path.relative(ROOT, backup)}\n`);

  let fixed = 0, failed = 0;
  for (const t of targets) {
    process.stdout.write(`   ↻ ${t.label} ... `);
    try {
      t.set(await regenerate(t.get(), { cert, code, domain: t.domain, label: t.label }));
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); // checkpoint each fix
      fixed++;
      console.log('fixed');
    } catch (e) {
      failed++;
      console.log(`FAILED (${e.message.slice(0, 80)})`);
    }
  }

  console.log(`\n✅ repaired ${fixed}/${targets.length}${failed ? ` — ${failed} failed, re-run to retry` : ''}`);
  console.log(`\nNext: node scripts/generate-course.js --config=course-configs/<config>.json --stage=assemble`);
  console.log(`Then: npm run qa -- --slug=${args.slug}\n`);
  process.exit(failed ? 1 : 0);
})();
