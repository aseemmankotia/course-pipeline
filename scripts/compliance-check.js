#!/usr/bin/env node
/**
 * compliance-check.js — HARD gate for the Udemy publishing rules that have
 * bounced courses (see CLAUDE.md rules 1-3, 5). Run after assemble, before any
 * shell is built. Exits non-zero (and prints why) on any violation.
 *
 * Checks, against generated/<slug>/udemy-listing.md + the course card:
 *   1. Description's FIRST line is the verbatim Help-Center disclosure.
 *   2. A detailed "AI content disclosure:" paragraph is present.
 *   3. NO outcome-promise language ("pass the", "first attempt/try",
 *      "guarantee(d)", "100% pass") anywhere in the Description OR the
 *      Intended-Learners fields (What you'll learn / Requirements / Who this
 *      course is for) — the exact spot NCP-AIO slipped through twice.
 *   4. A text-free card exists at exports/course-images/<slug>-card-notext.png.
 *
 * Usage: node scripts/compliance-check.js --slug=<slug>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/compliance-check.js --slug=<slug>'); process.exit(2); }

const DISCLOSURE = 'This course contains the use of artificial intelligence.';
// Unconditional promise phrases — always a violation.
const PROMISE = /\b(pass the|pass your|on your first (attempt|try)|100% pass|ensure you pass|guaranteed to pass)\b/i;
// "guarantee" is only a violation when it is NOT negated. A disclaimer like
// "this does not guarantee a passing score" is compliant and must pass; a
// promise like "we guarantee you pass" must fail. We inspect the words
// immediately preceding each "guarantee" for a negation cue.
const GUARANTEE = /\bguarantee\w*\b/ig;
const NEGATED_BEFORE = /(?:\b(?:no|not|never|without|cannot|can\s?not|nor|isn|aren|doesn|don|won|wouldn|couldn|shouldn)\b|n['’]t)\W+(?:\w+\W+){0,3}$/i;

// Return the first genuine promise phrase in `text`, or null. Negated
// "guarantee" mentions (disclaimers) are ignored.
function findPromise(text) {
  const m = text.match(PROMISE);
  if (m) return m[0];
  let g;
  GUARANTEE.lastIndex = 0;
  while ((g = GUARANTEE.exec(text))) {
    const before = text.slice(Math.max(0, g.index - 40), g.index);
    if (!NEGATED_BEFORE.test(before)) return g[0];
  }
  return null;
}

const listingPath = path.join(ROOT, 'generated', args.slug, 'udemy-listing.md');
if (!fs.existsSync(listingPath)) {
  console.error(`❌ compliance: ${path.relative(ROOT, listingPath)} not found — run the assemble stage first.`);
  process.exit(1);
}
const md = fs.readFileSync(listingPath, 'utf8');

// pull a "## Section" block's body (split-based — robust to multiline $)
const blocks = md.split(/\n(?=##\s)/);
function section(name) {
  const nl = name.toLowerCase();
  for (const b of blocks) {
    const h = b.match(/^##\s+(.+)/);
    if (h && h[1].trim().toLowerCase().startsWith(nl)) return b.replace(/^##[^\n]*\n/, '').trim();
  }
  return '';
}

const fails = [];
const desc = section('Description');
const descNoComments = desc.replace(/<!--[\s\S]*?-->/g, '');

// 1. verbatim disclosure first line
const firstLine = descNoComments.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
if (firstLine !== DISCLOSURE) fails.push(`Description first line must be verbatim "${DISCLOSURE}" (got: "${firstLine.slice(0, 60)}")`);

// 2. detailed disclosure paragraph
if (!/AI content disclosure:/i.test(desc)) fails.push('Missing the detailed "AI content disclosure:" paragraph in the Description.');

// 3. promise-language scan across description + goals fields
const goals = ['What you\'ll learn', 'Requirements', 'Who this course is for'];
const scanTargets = { Description: descNoComments };
for (const g of goals) scanTargets[g] = section(g);
for (const [where, text] of Object.entries(scanTargets)) {
  const hit = findPromise(text);
  if (hit) fails.push(`Outcome-promise language "${hit}" found in the ${where} section — use "prepare for / exam-focused" framing.`);
}

// 4. text-free card exists
const card = path.join(ROOT, 'exports', 'course-images', `${args.slug}-card-notext.png`);
if (!fs.existsSync(card)) fails.push(`Text-free course card missing: exports/course-images/${args.slug}-card-notext.png (run scripts/make-card.py).`);

if (fails.length) {
  console.error(`\n❌ Compliance check FAILED for ${args.slug} (${fails.length} issue(s)):`);
  fails.forEach(f => console.error('   • ' + f));
  console.error('\nFix these before building the Udemy shell — they are the exact rules that bounce courses.');
  process.exit(1);
}
console.log(`✅ Compliance OK for ${args.slug}: disclosure top-line + detailed paragraph present, no promise language in description or goals, text-free card present.`);
