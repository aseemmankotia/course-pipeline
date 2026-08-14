#!/usr/bin/env node
/**
 * normalize-questions.js — deterministic, no-model structural repair for the
 * question pools, run BEFORE QA (like normalize-domains / balance-answers).
 *
 * The generator occasionally emits a question as a single-item (or multi-item)
 * LIST where the schema expects a bare object — e.g. `[{question,options,...}]`
 * instead of `{question,options,...}`. QA then reports it as "question with
 * !=4 options" / "bad correct_index" and NO existing healer fixes it, so the
 * run hard-blocks (this bit the AIPMM CDPM build). This pass flattens any such
 * nested arrays back into their parent question array, in place, across:
 *   • chapter quiz pools        (curriculum.chapters[].quiz_questions)
 *   • chapter material banks    (materials["ch<N>"].questions)
 *   • both practice tests       (tests[<key>])
 *
 * It only unwraps array-wrapped questions; well-formed questions are untouched.
 * Safe to re-run; writes a timestamped state.json backup before any change.
 *
 * Usage:
 *   node scripts/normalize-questions.js --slug=<slug>
 *   node scripts/normalize-questions.js --slug=<slug> --dry-run
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/normalize-questions.js --slug=<slug> [--dry-run]'); process.exit(2); }

const DIR = path.join(ROOT, 'generated', args.slug);
const STATE_FILE = path.join(DIR, 'state.json');
if (!fs.existsSync(STATE_FILE)) { console.error(`No state.json for slug "${args.slug}"`); process.exit(1); }
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

const looksLikeQuestion = q => q && typeof q === 'object' && !Array.isArray(q) &&
  (typeof q.question === 'string' || Array.isArray(q.options));

// Recursively pull bare question objects out of any array nesting.
function flattenInto(out, item) {
  if (Array.isArray(item)) { for (const el of item) flattenInto(out, el); return; }
  out.push(item);
}

let unwrapped = 0;
// Rebuild an array in place, flattening any array-wrapped questions. Returns
// the number of nested wrappers removed from this array.
function normalizeArray(arr) {
  if (!Array.isArray(arr)) return 0;
  let changed = 0;
  const out = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      const inner = [];
      flattenInto(inner, item);
      // Only flatten when the wrapper holds question-shaped objects; otherwise
      // leave it alone (don't corrupt some other legitimate array field).
      if (inner.length && inner.every(looksLikeQuestion)) { for (const q of inner) out.push(q); changed += 1; continue; }
    }
    out.push(item);
  }
  if (changed) { arr.length = 0; arr.push(...out); }
  return changed;
}

// Second structural defect: the generator sometimes appends the correct answer
// a SECOND time as a 5th option and points correct_index at that duplicate,
// e.g. options=[A,B,C,D,D'] with correct_index=4. QA then reports "!=4 options /
// bad correct_index" and no healer fixes it (it is not array-wrapping, and it is
// not multi-select). Deterministically de-duplicate: if a question has >4 options
// and dropping EXACT-duplicate strings leaves exactly 4, keep the 4 unique
// options and remap correct_index to the surviving identical option. Only acts
// when the result is unambiguous (exactly 4 uniques); otherwise leaves it for QA.
let deduped = 0;
function dedupeOptions(q) {
  if (!q || typeof q !== 'object' || !Array.isArray(q.options) || q.options.length <= 4) return 0;
  const seen = new Map();       // normalized option text -> index in kept[]
  const kept = [];
  const oldToNew = [];
  q.options.forEach((o, idx) => {
    const key = String(o).trim();
    if (seen.has(key)) { oldToNew[idx] = seen.get(key); }
    else { seen.set(key, kept.length); oldToNew[idx] = kept.length; kept.push(o); }
  });
  if (kept.length !== 4) return 0; // ambiguous — let QA flag it
  const ci = q.correct_index;
  if (Number.isInteger(ci) && ci >= 0 && ci < q.options.length) q.correct_index = oldToNew[ci];
  q.options = kept;
  return 1;
}

// Every question-object pool in the state, for the per-question dedupe pass.
function eachQuestion(fn) {
  for (const ch of (state.curriculum && state.curriculum.chapters) || [])
    for (const q of (ch.quiz_questions || [])) if (looksLikeQuestion(q)) fn(q);
  for (const k of Object.keys(state.materials || {}))
    for (const q of ((state.materials[k] && state.materials[k].questions) || [])) if (looksLikeQuestion(q)) fn(q);
  for (const k of Object.keys(state.tests || {}))
    for (const q of (state.tests[k] || [])) if (looksLikeQuestion(q)) fn(q);
}

const report = [];
for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
  const c = normalizeArray(ch.quiz_questions);
  if (c) { unwrapped += c; report.push(`ch${ch.number} quiz unwrapped: ${c}`); }
}
for (const k of Object.keys(state.materials || {})) {
  const m = state.materials[k];
  if (m && Array.isArray(m.questions)) {
    const c = normalizeArray(m.questions);
    if (c) { unwrapped += c; report.push(`materials ${k} unwrapped: ${c}`); }
  }
}
for (const k of Object.keys(state.tests || {})) {
  const c = normalizeArray(state.tests[k]);
  if (c) { unwrapped += c; report.push(`tests ${k} unwrapped: ${c}`); }
}
// Dedupe pass runs AFTER unwrapping so freshly-flattened questions are covered.
eachQuestion(q => { const d = dedupeOptions(q); if (d) deduped += d; });

console.log(`\n🧩 normalize-questions: ${unwrapped} array-wrapped unwrapped, ${deduped} over-long option list(s) de-duplicated`);
report.forEach(r => console.log('   • ' + r));
if (!unwrapped && !deduped) { console.log('✅ nothing to normalize\n'); process.exit(0); }
if (args['dry-run']) { console.log('\n(dry run — no changes written)\n'); process.exit(0); }

const backup = path.join(DIR, `state.backup.${Date.now()}.json`);
fs.writeFileSync(backup, JSON.stringify(state, null, 2));
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
console.log(`\n💾 backup: ${path.relative(ROOT, backup)}`);
console.log(`✅ wrote ${path.relative(ROOT, STATE_FILE)} — re-run assemble + QA.\n`);
