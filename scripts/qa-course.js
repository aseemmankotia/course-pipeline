#!/usr/bin/env node
/**
 * qa-course.js — Automated quality audit for a generated course.
 *
 * Checks every chapter script, materials set, and practice test against the
 * certification-course quality bar (prompts/certification-course-prompt.md)
 * and writes a QA report.
 *
 * Usage:
 *   node scripts/qa-course.js --slug=<slug>
 *   npm run qa -- --slug=<slug>
 *
 * Exit code 0 = publishable, 1 = issues found (see report).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/qa-course.js --slug=<slug>'); process.exit(1); }

const DIR = path.join(ROOT, 'generated', args.slug);
const state = JSON.parse(fs.readFileSync(path.join(DIR, 'state.json'), 'utf8'));
const cur = state.curriculum;

const FLUFF = [
  'welcome back', 'great question', 'without further ado', 'dive right in',
  'in this section we will', 'hope that makes sense', 'hey everyone',
  'hi everyone', 'hello everyone', "let's take a moment", 'as i mentioned earlier',
  'moving on to our next topic', 'in today’s video', "in today's video",
];

const issues = [];   // blocking
const warns = [];    // non-blocking
const stats = [];

function chk(cond, msg, blocking = true) { if (!cond) (blocking ? issues : warns).push(msg); }

// ---------- curriculum ----------
chk(!!cur, 'Curriculum missing');
if (cur) {
  chk(cur.course_title && cur.course_title.length <= 65, `Course title >65 chars (${(cur.course_title || '').length})`, false);
  chk(cur.course_subtitle && cur.course_subtitle.length <= 125, `Subtitle >125 chars`, false);
  chk((cur.chapters || []).length >= 8, `Only ${(cur.chapters || []).length} chapters`);
  for (const ch of cur.chapters || []) {
    chk((ch.quiz_questions || []).length >= 2, `ch${ch.number}: <2 quiz questions`, false);
    for (const [qi, q] of (ch.quiz_questions || []).entries()) {
      chk(Array.isArray(q.options) && q.options.length === 4, `ch${ch.number} quiz${qi + 1}: needs 4 options`);
      chk(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3, `ch${ch.number} quiz${qi + 1}: bad correct_index`);
    }
  }
}

// ---------- scripts ----------
for (const ch of (cur && cur.chapters) || []) {
  const t = state.scripts[ch.number];
  if (!t) { issues.push(`ch${ch.number}: script missing`); continue; }
  const words = t.split(/\s+/).length;
  const lower = t.toLowerCase();
  const fluffFound = FLUFF.filter(f => lower.includes(f));
  const examNotes = (t.match(/exam note/gi) || []).length;
  const labPause = /pause here/i.test(t);
  const isFinal = ch.number === cur.chapters.length;
  stats.push(`ch${ch.number}: ${words}w, ${examNotes} exam notes, lab pause: ${labPause ? 'y' : 'n'}${fluffFound.length ? ', FLUFF: ' + fluffFound.join('|') : ''}`);
  chk(words >= 1800, `ch${ch.number}: script too short (${words} words)`, !isFinal);
  chk(words <= 4200, `ch${ch.number}: script too long (${words} words)`, false);
  chk(fluffFound.length === 0, `ch${ch.number}: fluff phrases: ${fluffFound.join(', ')}`);
  chk(examNotes >= 3 || isFinal, `ch${ch.number}: only ${examNotes} exam callouts`, false);
  chk(labPause || isFinal, `ch${ch.number}: no lab pause instruction`, false);
}

// ---------- materials ----------
for (const ch of (cur && cur.chapters) || []) {
  const m = state.materials[`ch${ch.number}`];
  if (!m) { issues.push(`ch${ch.number}: materials missing`); continue; }
  chk((m.questions || []).length >= 6, `ch${ch.number}: only ${(m.questions || []).length} practice questions`, false);
  chk((m.flashcards || []).length >= 8, `ch${ch.number}: only ${(m.flashcards || []).length} flashcards`, false);
  chk((m.cheatsheet || '').length > 200, `ch${ch.number}: cheatsheet too thin`, false);
  for (const [qi, q] of (m.questions || []).entries()) {
    chk(Array.isArray(q.options) && q.options.length === 4, `ch${ch.number} matQ${qi + 1}: needs 4 options`);
    chk(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3, `ch${ch.number} matQ${qi + 1}: bad correct_index`);
  }
}

// ---------- practice tests ----------
const testKeys = Object.keys(state.tests || {});
const seen = new Set();
let dupes = 0, totalQ = { 1: 0, 2: 0 };
for (const k of testKeys) {
  const n = k.startsWith('t1') ? 1 : 2;
  for (const q of state.tests[k] || []) {
    totalQ[n]++;
    const sig = (q.question || '').toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 120);
    if (seen.has(sig)) dupes++;
    seen.add(sig);
    chk(Array.isArray(q.options) && q.options.length === 4, `${k}: question with !=4 options`);
    chk(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3, `${k}: bad correct_index`);
  }
}
chk(totalQ[1] >= 40, `Practice test 1 has only ${totalQ[1]} questions`, false);
chk(totalQ[2] >= 40, `Practice test 2 has only ${totalQ[2]} questions`, false);
chk(dupes === 0, `${dupes} duplicate questions across practice tests`, false);

// answer-position balance (all-B tests are a tell)
const dist = [0, 0, 0, 0];
for (const k of testKeys) for (const q of state.tests[k] || []) if (Number.isInteger(q.correct_index)) dist[q.correct_index]++;
const total = dist.reduce((a, b) => a + b, 0) || 1;
const maxShare = Math.max(...dist) / total;
chk(maxShare < 0.45, `Answer positions unbalanced: ${dist.join('/')} (max ${(maxShare * 100).toFixed(0)}%)`, false);

// ---------- report ----------
const report = `# QA Report — ${cur ? cur.course_title : args.slug}
Generated: ${new Date().toISOString()}

## Verdict: ${issues.length === 0 ? '✅ PUBLISHABLE' : '❌ BLOCKING ISSUES'}

## Blocking issues (${issues.length})
${issues.map(i => `- ❌ ${i}`).join('\n') || '- none'}

## Warnings (${warns.length})
${warns.map(w => `- ⚠️ ${w}`).join('\n') || '- none'}

## Chapter stats
${stats.map(s => `- ${s}`).join('\n')}

## Practice tests
- Test 1: ${totalQ[1]} questions · Test 2: ${totalQ[2]} questions · duplicates: ${dupes}
- Answer position distribution (A/B/C/D): ${dist.join(' / ')}
`;
fs.writeFileSync(path.join(DIR, 'qa-report.md'), report);
console.log(report);
process.exit(issues.length === 0 ? 0 : 1);
