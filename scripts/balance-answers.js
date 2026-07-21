#!/usr/bin/env node
/**
 * balance-answers.js — even out which option position holds the correct answer.
 *
 * The generator is asked to randomise the correct option's position, but models
 * are strongly biased toward B (and away from D). Left alone this produces test
 * banks where "always guess B" scores far better than chance — AIGP shipped with
 * 63% of answers on B and exactly one on D across 90 questions.
 *
 * This rebalances deterministically by PERMUTING each question's options so the
 * correct answer lands on an evenly-distributed target position. No wording is
 * changed and no model call is made: option text, the correct answer, and each
 * distractor's own explanation all travel together.
 *
 * Usage:
 *   node scripts/balance-answers.js --slug=<slug>            # rebalance
 *   node scripts/balance-answers.js --slug=<slug> --dry-run  # report only
 *   node scripts/balance-answers.js --all                    # every course
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug && !args.all) {
  console.error('Usage: node scripts/balance-answers.js --slug=<slug> [--dry-run]   |   --all');
  process.exit(1);
}

// Deterministic PRNG so a given course always rebalances the same way.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function dist(questions) {
  const d = [0, 0, 0, 0];
  for (const q of questions) if (Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4) d[q.correct_index]++;
  return d;
}
const pct = d => { const n = d.reduce((a, b) => a + b, 0); return n ? Math.round(Math.max(...d) / n * 100) : 0; };

/**
 * Permute one question so its correct answer sits at `target`.
 * Keeps each option paired with its own explanation.
 */
function repositionCorrect(q, target) {
  const opts = q.options;
  if (!Array.isArray(opts) || opts.length !== 4) return false;
  const ci = q.correct_index;
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) return false;
  if (ci === target) return false;

  const wrongExpl = Array.isArray(q.why_others_wrong) ? q.why_others_wrong.slice() : null;

  // pair every option with the explanation that belongs to it
  let w = 0;
  const pairs = opts.map((text, i) => ({
    text,
    expl: i === ci ? null : (wrongExpl ? wrongExpl[w++] : undefined),
    correct: i === ci,
  }));

  const correctPair = pairs[ci];
  const rest = pairs.filter((_, i) => i !== ci);   // wrong options keep relative order
  rest.splice(target, 0, correctPair);             // drop the correct one at the target slot

  q.options = rest.map(p => p.text);
  q.correct_index = target;
  if (wrongExpl) q.why_others_wrong = rest.filter(p => !p.correct).map(p => p.expl);
  return true;
}

/**
 * Rebalance one pool of questions to a near-uniform A/B/C/D spread.
 */
function balance(questions, seedKey) {
  const usable = questions.filter(q => Array.isArray(q.options) && q.options.length === 4
    && Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4);
  if (usable.length < 4) return 0;

  // build an evenly-spread target list, then shuffle it deterministically
  const targets = usable.map((_, i) => i % 4);
  const rnd = mulberry32(seedFrom(seedKey));
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  let moved = 0;
  usable.forEach((q, i) => { if (repositionCorrect(q, targets[i])) moved++; });
  return moved;
}

function run(slug) {
  const dir = path.join(ROOT, 'generated', slug);
  const file = path.join(dir, 'state.json');
  if (!fs.existsSync(file)) { console.log(`skip ${slug}: no state.json`); return; }
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Pools are balanced independently so each test reads evenly on its own.
  const pools = [];
  const t1 = [], t2 = [];
  for (const k of Object.keys(state.tests || {})) (k.startsWith('t1') ? t1 : t2).push(...(state.tests[k] || []));
  if (t1.length) pools.push(['practice test 1', t1]);
  if (t2.length) pools.push(['practice test 2', t2]);
  const mats = [], quizzes = [];
  for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
    const m = (state.materials || {})[`ch${ch.number}`];
    if (m && m.questions) mats.push(...m.questions);
    if (ch.quiz_questions) quizzes.push(...ch.quiz_questions);
  }
  if (mats.length) pools.push(['chapter materials', mats]);
  if (quizzes.length) pools.push(['chapter quizzes', quizzes]);

  console.log(`\n${slug}`);
  let totalMoved = 0;
  for (const [name, qs] of pools) {
    const before = dist(qs);
    if (args['dry-run']) {
      console.log(`  ${name.padEnd(18)} ${before.join('/').padEnd(16)} max ${pct(before)}%`);
      continue;
    }
    const moved = balance(qs, slug + ':' + name);
    totalMoved += moved;
    const after = dist(qs);
    console.log(`  ${name.padEnd(18)} ${before.join('/').padEnd(16)} max ${String(pct(before)).padStart(3)}%  ->  ${after.join('/').padEnd(16)} max ${String(pct(after)).padStart(3)}%   (${moved} moved)`);
  }
  if (args['dry-run']) return;

  const backup = path.join(dir, `state.backup.balance.${Date.now()}.json`);
  fs.writeFileSync(backup, fs.readFileSync(file));
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  console.log(`  saved (${totalMoved} questions repositioned) · backup ${path.basename(backup)}`);
}

const slugs = args.all ? fs.readdirSync(path.join(ROOT, 'generated')).filter(s => fs.existsSync(path.join(ROOT, 'generated', s, 'state.json'))) : [args.slug];
for (const s of slugs) run(s);
if (!args['dry-run']) console.log('\nRe-run the assemble stage so exports pick up the new order.\n');
