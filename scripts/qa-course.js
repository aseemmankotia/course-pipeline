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

// Questions phrased as multi-select ("Select TWO", "Choose THREE") cannot be
// represented by this pipeline's single-answer schema (one integer correct_index).
// They render as unanswerable for the learner and mark only one option correct,
// so they are blocking regardless of how many options they carry.
const MULTISELECT = /\bselect\s+(two|three|four|2|3|4)\b|\bchoose\s+(two|three|four|2|3|4)\b|\(select\b|\(choose\b/i;

const issues = [];   // blocking
const warns = [];    // non-blocking
const stats = [];

function chk(cond, msg, blocking = true) { if (!cond) (blocking ? issues : warns).push(msg); }

// ---------- curriculum ----------
chk(!!cur, 'Curriculum missing');
if (cur) {
  // Udemy compliance: no outcome promises in public-facing copy
  const BANNED = [/first[- ]attempt/i, /guarantee/i, /\bpass\b(?![a-z])/i, /you will pass/i];
  for (const [field, val] of [['title', cur.course_title], ['subtitle', cur.course_subtitle], ['description', cur.course_description]]) {
    for (const re of BANNED) {
      if (re.test(val || '')) issues.push(`${field}: overpromising language matching ${re} (Udemy rejects outcome promises)`);
    }
  }
  // Domain names must match the config's official exam blueprint. The model
  // sometimes recalls a RETIRED version of the exam (e.g. SCS-C02 domain names
  // on an SCS-C03 course), which then surfaces on the Udemy landing page,
  // section headers, and the per-domain practice-test score breakdown.
  try {
    const cfgPath = fs.readdirSync(path.join(ROOT, 'course-configs'))
      .map(f => path.join(ROOT, 'course-configs', f))
      .find(f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).slug === args.slug; } catch { return false; } });
    if (cfgPath) {
      const officialList = (JSON.parse(fs.readFileSync(cfgPath, 'utf8')).domains || []).map(d => d.name);
      const official = new Set(officialList);
      const isSummary = d => /^all domains/i.test(d || '');

      // Strip decoration the model likes to add — a trailing "(17%)" weight or a
      // " - Subtopic" qualifier — before comparing. Those are cosmetic.
      const base = d => String(d || '').replace(/\s*\(\s*~?\d+\s*%?\s*\)\s*$/, '').replace(/\s+[-–—]\s+.*$/, '').trim();
      const numOf = d => (String(d || '').match(/^domain\s*(\d+)/i) || [])[1];
      const officialByNum = new Map(officialList.map(n => [numOf(n), n]));

      // Cosmetic  = same domain, decorated or more granular  -> warning
      // Wrong     = maps to a different domain number, or nothing at all -> blocking,
      //             which is how a retired exam version's names show up.
      function classify(d) {
        if (!d || official.has(d) || isSummary(d)) return null;
        const b = base(d), n = numOf(d);
        if (official.has(b)) return 'cosmetic';
        if (n && officialByNum.has(n)) {
          const canonical = officialByNum.get(n);
          return base(canonical).toLowerCase() === b.toLowerCase() ? 'cosmetic' : 'wrong';
        }
        if (officialList.some(o => base(o).toLowerCase() === b.toLowerCase())) return 'cosmetic';
        return 'wrong';
      }

      const wrong = new Map(), cosmetic = new Map();
      const record = (d, where) => {
        const c = classify(d); if (!c) return;
        const m = c === 'wrong' ? wrong : cosmetic;
        m.set(d, (m.get(d) || 0) + 1);
        if (c === 'wrong' && where) wrong.set(d, wrong.get(d)); // count only
      };
      for (const ch of cur.chapters || []) {
        if (classify(ch.exam_domain) === 'wrong') issues.push(`ch${ch.number}: exam_domain "${ch.exam_domain}" does not match any official domain for this exam — check it was not recalled from a retired exam version`);
        const m = (state.materials || {})[`ch${ch.number}`];
        for (const q of (m && m.questions) || []) record(q.domain);
      }
      for (const k of Object.keys(state.tests || {})) for (const q of state.tests[k] || []) record(q.domain);

      for (const [d, n] of wrong) issues.push(`${n} question(s) tagged with domain "${d}", which matches no official domain — wrong names would show in the practice-test score breakdown`);
      const cosmeticTotal = [...cosmetic.values()].reduce((a, b) => a + b, 0);
      if (cosmeticTotal) warns.push(`${cosmeticTotal} question(s) use a decorated or more granular domain label (e.g. "${[...cosmetic.keys()][0]}") — harmless, but the score breakdown reads cleaner with the exact domain name`);
    }
  } catch { /* config lookup is best-effort */ }

  chk(cur.course_title && cur.course_title.length <= 65, `Course title >65 chars (${(cur.course_title || '').length})`, false);
  chk(cur.course_subtitle && cur.course_subtitle.length <= 125, `Subtitle >125 chars`, false);
  chk((cur.chapters || []).length >= 8, `Only ${(cur.chapters || []).length} chapters`);
  for (const ch of cur.chapters || []) {
    chk((ch.quiz_questions || []).length >= 2, `ch${ch.number}: <2 quiz questions`, false);
    for (const [qi, q] of (ch.quiz_questions || []).entries()) {
      chk(!MULTISELECT.test(q.question || ''), `ch${ch.number} quiz${qi + 1}: multi-select phrasing ("Select TWO"/"Choose TWO") but schema stores a single correct answer — regenerate as single-answer`);
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
    chk(!MULTISELECT.test(q.question || ''), `ch${ch.number} matQ${qi + 1}: multi-select phrasing ("Select TWO"/"Choose TWO") but schema stores a single correct answer — regenerate as single-answer`);
    chk(Array.isArray(q.options) && q.options.length === 4, `ch${ch.number} matQ${qi + 1}: needs 4 options`);
    chk(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3, `ch${ch.number} matQ${qi + 1}: bad correct_index`);
  }
}

// ---------- practice tests ----------
const testKeys = Object.keys(state.tests || {});
const seen = new Set();
let dupes = 0, totalQ = { 1: 0, 2: 0 }, autoFixed = 0;
for (const k of testKeys) {
  const n = k.startsWith('t1') ? 1 : 2;
  for (const q of state.tests[k] || []) {
    // auto-heal: extra options beyond 4 when the correct answer is unaffected.
    // NEVER trim a multi-select question — its other correct answers live in the
    // options being dropped, so trimming silently destroys the answer key.
    if (Array.isArray(q.options) && q.options.length > 4 && Number.isInteger(q.correct_index) && q.correct_index < 4
        && !MULTISELECT.test(q.question || '')) {
      q.options = q.options.slice(0, 4);
      autoFixed++;
    }
    totalQ[n]++;
    const sig = (q.question || '').toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 120);
    if (seen.has(sig)) dupes++;
    seen.add(sig);
    chk(!MULTISELECT.test(q.question || ''), `${k}: multi-select phrasing ("Select TWO"/"Choose TWO") but schema stores a single correct answer — regenerate as single-answer`);
    chk(Array.isArray(q.options) && q.options.length === 4, `${k}: question with !=4 options`);
    chk(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3, `${k}: bad correct_index`);
  }
}
if (autoFixed) {
  fs.writeFileSync(path.join(DIR, 'state.json'), JSON.stringify(state, null, 2));
  warns.push(`auto-trimmed ${autoFixed} question(s) with >4 options (correct answer preserved) — re-run assemble stage`);
}
chk(totalQ[1] >= 40, `Practice test 1 has only ${totalQ[1]} questions`, false);
chk(totalQ[2] >= 40, `Practice test 2 has only ${totalQ[2]} questions`, false);
chk(dupes === 0, `${dupes} duplicate questions across practice tests`, false);

// answer-position balance (all-B tests are a tell)
const dist = [0, 0, 0, 0];
for (const k of testKeys) for (const q of state.tests[k] || []) if (Number.isInteger(q.correct_index)) dist[q.correct_index]++;
const total = dist.reduce((a, b) => a + b, 0) || 1;

// Check chapter quizzes and materials separately — they are their own pools, and
// checking only the practice tests once let a 95%-on-B quiz bank through unnoticed.
for (const [label, pool] of [
  ['chapter quizzes', (cur && cur.chapters || []).flatMap(ch => ch.quiz_questions || [])],
  ['chapter materials', (cur && cur.chapters || []).flatMap(ch => ((state.materials || {})[`ch${ch.number}`] || {}).questions || [])],
]) {
  const d = [0, 0, 0, 0];
  for (const q of pool) if (Number.isInteger(q.correct_index) && q.correct_index < 4) d[q.correct_index]++;
  const n = d.reduce((a, b) => a + b, 0);
  if (n < 12) continue;
  const share = Math.max(...d) / n;
  chk(share < 0.50, `${label}: answer positions badly unbalanced ${d.join('/')} (max ${(share * 100).toFixed(0)}%) — run scripts/balance-answers.js`);
  chk(share < 0.40, `${label}: answer positions uneven ${d.join('/')} (max ${(share * 100).toFixed(0)}%)`, false);
}
const maxShare = Math.max(...dist) / total;
// Models bias heavily toward B. Past 50% on one letter, "always guess B" beats
// chance badly enough that the test bank is misleading rather than merely uneven,
// so that is blocking. Between 40% and 50% it is a warning worth acting on.
// Fix with: node scripts/balance-answers.js --slug=<slug>
chk(maxShare < 0.50, `Answer positions badly unbalanced: ${dist.join('/')} (max ${(maxShare * 100).toFixed(0)}%) — guessing one letter would beat chance; run scripts/balance-answers.js`);
chk(maxShare < 0.40, `Answer positions uneven: ${dist.join('/')} (max ${(maxShare * 100).toFixed(0)}%) — consider scripts/balance-answers.js`, false);
const emptySlots = dist.filter(d => total >= 40 && d / total < 0.05).length;
chk(emptySlots === 0, `${emptySlots} answer position(s) almost never used: ${dist.join('/')} — learners notice a letter that is never correct`, false);

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
