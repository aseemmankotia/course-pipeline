#!/usr/bin/env node
// load-practice-tests.js — run on your Mac (Node 18+). No browser, no console paste.
//
// Reads pt-config.json, resolves each course's two CSVs from csvDir, and loads the
// practice tests via the Udemy instructor API using UDEMY_COOKIE from .env.
// Idempotent: skips tests already complete, cleans up partials, respects the 2-test cap.
//
// Usage:
//   node load-practice-tests.js                 # all courses in pt-config.json
//   node load-practice-tests.js --only=7301139  # one course (repeatable: --only=a,b)
//   node load-practice-tests.js --dry-run       # print what it would do, change nothing
//   node load-practice-tests.js --config=other.json --csvdir=/abs/path

'use strict';
const fs = require('fs');
const path = require('path');
const { UdemyClient } = require('./lib/client');
const { loadCourseTests } = require('./lib/practice-tests');

function arg(name, def) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
}

(async () => {
  const dryRun = !!arg('dry-run', false);
  const configPath = path.resolve(__dirname, String(arg('config', 'pt-config.json')));
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const csvDir = path.resolve(__dirname, String(arg('csvdir', cfg.csvDir || '.')));
  const only = arg('only', null);
  const onlyIds = only ? String(only).split(',').map((s) => Number(s.trim())) : null;

  const client = new UdemyClient({ dryRun });
  if (!dryRun) {
    const me = await client.whoami().catch((e) => { console.error(String(e)); process.exit(1); });
    console.log(`Authenticated as: ${me.display_name || me.title || '(unknown)'}`);
  }

  let courses = cfg.courses;
  if (onlyIds) courses = courses.filter((c) => onlyIds.includes(c.courseId));
  if (!courses.length) { console.error('No matching courses in config.'); process.exit(1); }

  const grand = { created: 0, skipped: 0, failed: 0 };
  for (const c of courses) {
    console.log(`\n=== ${c.titlePrefix} (course ${c.courseId}) ===`);
    const tests = [1, 2].map((n) => {
      const csv = path.join(csvDir, `${c.slug}-test${n}.csv`);
      if (!fs.existsSync(csv)) throw new Error(`CSV not found: ${csv}`);
      return { csv, title: `${c.titlePrefix} ${n}`, duration: c.duration, passPercent: c.passPercent };
    });
    const res = await loadCourseTests(client, c.courseId, tests);
    for (const r of res) {
      if (r.skipped) grand.skipped++;
      else { grand.created += (r.inserted || 0) ? 1 : 0; grand.failed += r.failed || 0; }
    }
  }
  console.log(`\nALL DONE. courses=${courses.length}  (question failures: ${grand.failed})`);
  console.log('Open each course Curriculum to confirm 2 published practice tests.');
})().catch((e) => { console.error('\nFATAL:', String(e)); process.exit(1); });
