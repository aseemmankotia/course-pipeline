#!/usr/bin/env node
// scripts/load-practice-tests.js
// Pipeline step: load a course's practice tests into Udemy via the API, driven by the
// course's own exports/<slug>/shell-spec.json (no separate config). Idempotent; skips
// tests already complete, cleans partials, respects Udemy's 2-practice-tests-per-course
// cap and the eventual-consistency lag after deletes. Auto-publishes each test.
//
// Auth: reads UDEMY_COOKIE from .env (repo root). Capture once — see
//       scripts/udemy/README or ClaudeFolder/udemy-autopublish/docs/udemy-auth.md.
//
// Usage:
//   node scripts/load-practice-tests.js --slug=<slug> --course=<udemyCourseId>
//   node scripts/load-practice-tests.js --slug=<slug>          # uses shell-spec.courseId
//   node scripts/load-practice-tests.js --slug=<slug> --dry-run
//
// When --course is given and shell-spec.courseId is null, it is written back so later
// steps (and re-runs) know the course id. Result is written to
// exports/<slug>/practice-tests-log.json.

'use strict';
const fs = require('fs');
const path = require('path');
const { UdemyClient } = require('./udemy/client');
const { loadCourseTests } = require('./udemy/practice-tests');

const ROOT = path.join(__dirname, '..');
function arg(name, def) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  const i = hit.indexOf('=');
  return i === -1 ? true : hit.slice(i + 1);
}

(async () => {
  const slug = arg('slug');
  if (!slug) { console.error('Missing --slug=<course-slug>'); process.exit(1); }
  const dryRun = !!arg('dry-run', false);
  const specPath = path.join(ROOT, 'exports', slug, 'shell-spec.json');
  if (!fs.existsSync(specPath)) { console.error(`No shell-spec at ${specPath}`); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  let courseId = arg('course', null);
  courseId = courseId ? Number(courseId) : spec.courseId;
  if (!courseId) {
    console.error('No Udemy course id. Pass --course=<id> (from the created shell), or set courseId in shell-spec.json.');
    process.exit(1);
  }
  // persist courseId back into the shell-spec if newly provided
  if (spec.courseId !== courseId) {
    spec.courseId = courseId;
    if (!dryRun) fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  }

  const csvDir = path.join(ROOT, 'exports', 'practice-test-csvs');
  const tests = (spec.practiceTests || [])
    .filter((t) => t.csv)
    .map((t) => {
      const csv = path.join(csvDir, t.csv);
      if (!fs.existsSync(csv)) throw new Error(`CSV not found: ${csv}`);
      return { csv, title: t.title, duration: t.durationMin || 90, passPercent: t.passPercent || 70 };
    });
  if (!tests.length) { console.error(`No practiceTests with CSVs in shell-spec for ${slug}.`); process.exit(1); }

  if (dryRun) {
    const { csvToAssessments } = require('./udemy/practice-tests');
    console.log(`[dry-run] course ${courseId} (${slug}) — ${tests.length} practice test(s):`);
    for (const t of tests) {
      const n = csvToAssessments(t.csv).length;
      console.log(`  - "${t.title}"  ${n} questions  (${t.duration}min, pass ${t.passPercent}%)  <- ${path.basename(t.csv)}`);
    }
    console.log('[dry-run] no changes made. Remove --dry-run to load.');
    process.exit(0);
  }

  const client = new UdemyClient({ dryRun });
  if (!dryRun) {
    const me = await client.whoami().catch((e) => { console.error(String(e)); process.exit(1); });
    console.log(`Authenticated as: ${me.display_name || '(unknown)'}`);
  }
  console.log(`Loading ${tests.length} practice test(s) into course ${courseId} (${slug})`);

  const results = await loadCourseTests(client, courseId, tests);

  const logPath = path.join(ROOT, 'exports', slug, 'practice-tests-log.json');
  const summary = { slug, courseId, when: new Date().toISOString(), dryRun, results };
  if (!dryRun) fs.writeFileSync(logPath, JSON.stringify(summary, null, 2));
  const failed = results.reduce((a, r) => a + (r.failed || 0), 0);
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`\nDONE. tests=${results.length} skipped=${skipped} question-failures=${failed}`);
  if (!dryRun) console.log(`log -> ${path.relative(ROOT, logPath)}`);
  process.exit(failed > 0 ? 2 : 0);
})().catch((e) => { console.error('\nFATAL:', String(e)); process.exit(1); });
