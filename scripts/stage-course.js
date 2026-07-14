#!/usr/bin/env node
/**
 * stage-course.js — Stage a generated course for rendering.
 *
 * Copies generated/<slug>/course-render-input-N.json files into the project
 * root (where course-render.js expects them), then prints the HeyGen
 * checklist for the chapters.
 *
 * Usage:
 *   node scripts/stage-course.js --slug=aws-certified-ai-practitioner-aif-c01
 *   npm run stage -- --slug=<slug>          (equivalent)
 *   node scripts/stage-course.js --list     (show available generated courses)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'generated');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

if (args.list || !args.slug) {
  console.log('Available generated courses:\n');
  if (!fs.existsSync(GEN)) { console.log('  (none — run npm run generate first)'); process.exit(0); }
  for (const d of fs.readdirSync(GEN)) {
    const dir = path.join(GEN, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    const done = fs.existsSync(path.join(dir, 'DONE'));
    const inputs = fs.readdirSync(dir).filter(f => /^course-render-input-\d+\.json$/.test(f)).length;
    console.log(`  ${done ? '✅' : '⏳'} ${d}  (${inputs} chapters${done ? ', complete' : ', in progress'})`);
  }
  if (!args.list) console.log('\nUsage: node scripts/stage-course.js --slug=<slug>');
  process.exit(0);
}

const srcDir = path.join(GEN, args.slug);
if (!fs.existsSync(srcDir)) { console.error(`❌ No such generated course: ${args.slug}`); process.exit(1); }

// Clear previously staged render inputs so two courses never mix
for (const f of fs.readdirSync(ROOT)) {
  if (/^course-render-input-\d+\.json$/.test(f)) fs.unlinkSync(path.join(ROOT, f));
}

const inputs = fs.readdirSync(srcDir).filter(f => /^course-render-input-\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
if (!inputs.length) { console.error('❌ No render inputs found — generation may not be complete.'); process.exit(1); }

console.log(`📦 Staging ${args.slug} (${inputs.length} chapters)\n`);
const checklist = [];
for (const f of inputs) {
  fs.copyFileSync(path.join(srcDir, f), path.join(ROOT, f));
  const j = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8'));
  checklist.push(`  ${j.heygen_local_file}  ←  ch${j.chapter_number}: ${j.chapter_title}`);
  console.log(`  ✅ ${f}  (${j.chapter_title})`);
}

// Also stage course-data-export.json for archive/promo tooling
const exp = path.join(srcDir, 'course-data-export.json');
if (fs.existsSync(exp)) {
  fs.copyFileSync(exp, path.join(ROOT, 'course-data-export.json'));
  console.log('  ✅ course-data-export.json');
}

console.log(`\n🎙  HeyGen checklist — generate these avatar videos (narration text in generated/${args.slug}/heygen/) and drop them in the project root:\n`);
console.log(checklist.join('\n'));
console.log(`\nThen render everything:\n  npm run render:all\n`);
