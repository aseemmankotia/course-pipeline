#!/usr/bin/env node
/**
 * backfill-course-repos.js — generate + push the GitHub "course materials" repo for
 * every LIVE course that has a course-data-export.json. Idempotent: existing repos are
 * just updated. Runs ON THE MAC (needs gh CLI auth + network).
 *
 * Usage:
 *   node scripts/backfill-course-repos.js              # all live buildable courses
 *   node scripts/backfill-course-repos.js --dry-run    # list what it would do
 *   node scripts/backfill-course-repos.js --only=slug1,slug2
 *   node scripts/backfill-course-repos.js --skip-existing   # skip repos that already exist on GitHub
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

// Discover live courses from the promo-all registry (source of truth for `live`).
const reg = fs.readFileSync(path.join(ROOT, 'scripts', 'promo-all.js'), 'utf8');
const entries = [...reg.matchAll(/\{\s*slug:\s*'([^']+)'[\s\S]*?live:\s*(true|false)/g)];
let slugs = [...new Set(entries.filter(m => m[2] === 'true').map(m => m[1]))];
// Only courses we can actually build a repo for.
slugs = slugs.filter(s => fs.existsSync(path.join(ROOT, 'exports', s, 'course-data-export.json')));
if (args.only) { const want = new Set(String(args.only).split(',')); slugs = slugs.filter(s => want.has(s)); }

console.log(`Backfilling course repos for ${slugs.length} live courses.\n`);
if (args['dry-run']) { slugs.forEach(s => console.log('  ' + s)); process.exit(0); }

const ok = [], failed = [];
for (const slug of slugs) {
  const name = `course-${slug}`;
  if (args['skip-existing']) {
    try { execSync(`gh repo view aseemmankotia/${name}`, { stdio: 'ignore' }); console.log(`skip ${name} (exists)`); ok.push(slug); continue; } catch {}
  }
  try {
    console.log(`\n=== ${slug} ===`);
    execFileSync('node', ['scripts/build-course-repo.js', `--slug=${slug}`], { cwd: ROOT, stdio: 'inherit' });
    execFileSync('node', ['scripts/push-course-repo.js', `--slug=${slug}`], { cwd: ROOT, stdio: 'inherit' });
    ok.push(slug);
  } catch (e) {
    console.error(`FAILED ${slug}: ${String(e.message || e).slice(0, 200)}`);
    failed.push(slug);
  }
}
console.log(`\n\nDone. ${ok.length} ok, ${failed.length} failed.`);
if (failed.length) console.log('Failed:\n  ' + failed.join('\n  '));
