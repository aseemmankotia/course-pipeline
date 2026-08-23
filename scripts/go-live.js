#!/usr/bin/env node
/**
 * go-live.js — fire the whole Phase-B marketing chain for a course the MOMENT it
 * is approved & live on Udemy. One command replaces the manual register -> build
 * site -> promo -> announce sequence. Idempotent (each underlying step is safe to
 * re-run). Runs ON THE MAC (needs the repo, ffmpeg/display for promo, and the
 * .env creds for YouTube + Brevo).
 *
 * Usage:
 *   node scripts/go-live.js --slug=<slug> --udemy=<liveCourseUrl>
 *       # register + rebuild site (dry-run announce) — safe default, no external sends
 *   node scripts/go-live.js --slug=<slug> --udemy=<url> --promo
 *       # also render + upload the YouTube Short (public)
 *   node scripts/go-live.js --slug=<slug> --udemy=<url> --promo --announce-live
 *       # full send: also email the Brevo list (deduped per slug)
 *   node scripts/go-live.js --slug=<slug> --udemy=<url> --dry-run
 *       # print the steps without running them
 *
 * Flags:
 *   --promo          render the 9:16 Short and upload it to YouTube
 *   --announce-live  send the launch email to the Brevo list (else dry-run preview)
 *   --no-site        skip the practice-site rebuild (e.g. batch several, build once)
 *   --dry-run        print commands only
 *
 * NOTE: only run this once the course status is LIVE on Udemy — the site + promo
 * links 404 until Udemy approves it.
 */
'use strict';
const { execSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const slug = args.slug, udemy = args.udemy;
if (!slug || !udemy) {
  console.error('Usage: node scripts/go-live.js --slug=<slug> --udemy=<liveCourseUrl> [--promo] [--announce-live] [--no-site] [--dry-run]');
  process.exit(1);
}
const DRY = !!args['dry-run'];

const steps = [];
// 1. Register into site/promo/reviews registries (+ auto-announce: live if requested, else dry-run preview)
steps.push(`node scripts/register-course.js --slug=${slug} --udemy=${udemy}` +
  (args['announce-live'] ? ' --announce-live' : ''));
// 2. Rebuild the practice site (only live courses; the freshly-registered one is now included)
if (!args['no-site']) steps.push(`node scripts/build-practice-site.js`);
// 3. Promo Short: render this course's 9:16 Short, then upload pending Shorts of LIVE courses
if (args.promo) {
  steps.push(`node scripts/promo-all.js --slug=${slug}`);
  steps.push(`node scripts/promo-all.js --upload`);
}

console.log(`\n=== go-live: ${slug} ===`);
console.log(`live url: ${udemy}`);
console.log(`steps (${steps.length}):`);
steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
if (DRY) { console.log('\n[dry-run] nothing executed.'); process.exit(0); }

for (const cmd of steps) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(`\nSTEP FAILED: ${cmd}\n${String(e.message || e)}`);
    console.error('Fix the issue and re-run go-live.js (steps are idempotent).');
    process.exit(1);
  }
}
console.log(`\n✅ go-live complete for ${slug}.`);
if (!args.promo) console.log('   (skipped promo Short — add --promo to render+upload it)');
if (!args['announce-live']) console.log('   (launch email was a DRY-RUN preview — add --announce-live to send)');
console.log('   Reminder: commit + push the site repo to publish the rebuilt practice site.');
