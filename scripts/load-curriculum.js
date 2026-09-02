#!/usr/bin/env node
// scripts/load-curriculum.js
// Pipeline step: build a course's VIDEO CURRICULUM via the Udemy instructor API.
// Creates one chapter + one lecture per chapter title (from shell-spec.curriculum) and
// attaches each chapter's already-uploaded library video, matched by filename.
//
// NON-DESTRUCTIVE (2026-09-02): it does NOT wipe the existing curriculum. Udemy refuses
// to delete the first section when it is not empty ("Cannot delete the first section
// since it is not empty") — which it is, because practice tests were loaded first. So we
// APPEND 12 chapter-sections above whatever exists, remove only the empty placeholder
// "Introduction" lecture, and rename that first section to "Practice Exams". Practice
// tests are preserved — no pt:load re-run needed.
//
// Run AFTER the chapter videos are uploaded to the content library (Bulk Uploader).
// Auth: UDEMY_COOKIE in .env (same as load-practice-tests.js).
//
// Usage:
//   node scripts/load-curriculum.js --slug=<slug> --course=<cid>
//   node scripts/load-curriculum.js --slug=<slug>            # uses shell-spec.courseId
//   node scripts/load-curriculum.js --slug=<slug> --dry-run  # preview asset matches, no writes

'use strict';
const fs = require('fs');
const path = require('path');
const { UdemyClient } = require('./udemy/client');
const { attachVideo } = require('./udemy/course-lifecycle');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function arg(name, def) {
  const h = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!h) return def;
  const i = h.indexOf('=');
  return i === -1 ? true : h.slice(i + 1);
}
const chapNum = (fn) => { const m = fn.match(/-chapter-(\d+)/i); return m ? parseInt(m[1], 10) : null; };
const norm = (t) => String(t == null ? '' : t).trim().toLowerCase();

function videoFiles(slug) {
  for (const sub of ['videos-rev1', 'videos']) {
    const d = path.join(ROOT, 'exports', slug, sub);
    if (!fs.existsSync(d)) continue;
    const files = fs.readdirSync(d).filter((f) => /-chapter-\d+.*\.mp4$/i.test(f));
    if (files.length) { files.sort((a, b) => (chapNum(a) || 0) - (chapNum(b) || 0)); return { dir: sub, files }; }
  }
  return { dir: null, files: [] };
}

async function findAsset(client, filename) {
  const stem = filename.replace(/\.mp4$/i, '').toLowerCase();
  const keyM = filename.match(/^(.*-chapter-\d+)/i);
  const key = keyM ? keyM[1] : filename.replace(/\.mp4$/i, '');
  const res = await client.get('/api-2.0/users/me/assets/', {
    query: { page: 1, page_size: 50, 'fields[asset]': 'title,status,asset_type,created', ordering: '-created', asset_type: 'Video', search: key },
  });
  const items = res.results || [];
  const n = (t) => String(t || '').replace(/\.mp4$/i, '').toLowerCase();
  let hit = items.find((a) => n(a.title) === stem) || items.find((a) => n(a.title).startsWith(stem));
  if (!hit && items.length === 1) hit = items[0];
  return { hit, candidates: items.length };
}

// Append 12 chapters+lectures ABOVE existing content, idempotently (reuse by title).
// Returns new lectures in chapter order [{id,title}], and cleans up the placeholder lecture.
async function appendCurriculum(client, cid, titles, log) {
  const base = `/api-2.0/users/me/taught-courses/${cid}`;
  const [chs0, lecs0] = await Promise.all([
    client.get(`${base}/chapters/`, { query: { page_size: 200, 'fields[chapter]': 'title,sort_order' } }),
    client.get(`${base}/lectures/`, { query: { page_size: 200, 'fields[lecture]': 'title,sort_order' } }),
  ]);
  const preChapters = chs0.results || [];
  const preLectures = lecs0.results || [];
  const titleSet = new Set(titles.map(norm));
  const maxSort = Math.max(0, ...preChapters.map((c) => c.sort_order || 0), ...preLectures.map((l) => l.sort_order || 0));

  const chBy = Object.fromEntries(preChapters.map((c) => [norm(c.title), c]));
  const lecBy = Object.fromEntries(preLectures.map((l) => [norm(l.title), l]));
  // create any missing chapter/lecture (idempotent re-run safe)
  for (const t of titles) {
    if (!chBy[norm(t)]) await client.post(`${base}/chapters/`, { title: t });
    if (!lecBy[norm(t)]) await client.post(`${base}/lectures/`, { title: t, is_downloadable: false });
  }
  const [chs, lecs] = await Promise.all([
    client.get(`${base}/chapters/`, { query: { page_size: 200, 'fields[chapter]': 'title,sort_order' } }),
    client.get(`${base}/lectures/`, { query: { page_size: 200, 'fields[lecture]': 'title,sort_order' } }),
  ]);
  const chMap = Object.fromEntries((chs.results || []).map((c) => [norm(c.title), c]));
  const lecMap = Object.fromEntries((lecs.results || []).map((l) => [norm(l.title), l]));

  // place the 12 chapter+lecture pairs at the TOP, in order ch1..chN (Udemy sorts DESC)
  const n = titles.length;
  const topBase = maxSort + 2 * n + 50;
  for (let i = 0; i < n; i++) {
    const ch = chMap[norm(titles[i])];
    const lec = lecMap[norm(titles[i])];
    const cNeed = topBase - 2 * i;
    if (ch) await client.patch(`${base}/chapters/${ch.id}/`, { sort_order: cNeed });
    if (lec) await client.patch(`${base}/lectures/${lec.id}/`, { sort_order: cNeed - 1 });
  }
  // remove leftover placeholder lectures that predate this build and aren't ours (e.g. "Introduction")
  for (const l of preLectures) {
    if (!titleSet.has(norm(l.title))) {
      await client.del(`${base}/lectures/${l.id}/`).catch((e) => log(`  (couldn't remove placeholder lecture "${l.title}": ${String(e.message).slice(0, 60)})`));
    }
  }
  // rename a leftover "Introduction" first section (now holding only the practice tests)
  const intro = preChapters.find((c) => norm(c.title) === 'introduction');
  if (intro) await client.patch(`${base}/chapters/${intro.id}/`, { title: 'Practice Exams' }).catch(() => {});

  return titles.map((t) => ({ id: lecMap[norm(t)] && lecMap[norm(t)].id, title: t }));
}

(async () => {
  const slug = arg('slug');
  if (!slug) { console.error('Missing --slug=<course-slug>'); process.exit(1); }
  const dryRun = !!arg('dry-run', false);
  const specPath = path.join(ROOT, 'exports', slug, 'shell-spec.json');
  if (!fs.existsSync(specPath)) { console.error(`No shell-spec at ${specPath}`); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  let cid = arg('course', null);
  cid = cid ? Number(cid) : spec.courseId;
  if (!cid) { console.error('No Udemy course id. Pass --course=<id> or set shell-spec.courseId.'); process.exit(1); }
  if (spec.courseId !== cid && !dryRun) { spec.courseId = cid; fs.writeFileSync(specPath, JSON.stringify(spec, null, 2)); }

  const client = new UdemyClient({ dryRun });
  const me = await client.whoami();
  console.log(`🎬 load-curriculum — ${slug} → course ${cid} (as ${me.display_name || '?'})${dryRun ? ' [DRY RUN]' : ''}`);

  const { dir, files } = videoFiles(slug);
  if (!files.length) { console.error(`No chapter videos under exports/${slug}/videos-rev1 or /videos`); process.exit(1); }
  console.log(`  ${files.length} chapter videos from exports/${slug}/${dir}/`);
  const titles = (Array.isArray(spec.curriculum) && spec.curriculum.length === files.length)
    ? spec.curriculum : files.map((f) => `Chapter ${chapNum(f)}`);

  console.log('  Matching library assets:');
  const matches = [];
  for (const fn of files) {
    const { hit, candidates } = await findAsset(client, fn);
    matches.push({ fn, hit });
    console.log(`   ch${String(chapNum(fn)).padStart(2)}: ${hit ? `✓ asset ${hit.id} [${hit.status}]` : `✗ NOT FOUND`}  (${candidates} cand.)  ${fn.slice(0, 46)}`);
    await sleep(120);
  }
  const missing = matches.filter((m) => !m.hit);
  if (missing.length) console.log(`\n⚠ ${missing.length} chapter video(s) not found in the library yet.`);
  if (dryRun) { console.log('\n[dry-run] no changes. Re-run without --dry-run to build the curriculum.'); return; }
  if (missing.length === files.length) { console.error('No assets matched — is the library upload done? Aborting.'); process.exit(1); }

  const lectures = await appendCurriculum(client, cid, titles, (m) => console.log(m));
  console.log(`  curriculum: ${titles.length} chapter-sections created/updated (practice tests preserved)`);

  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    const m = matches[i];
    const lec = lectures[i];
    if (!m.hit) { console.log(`  ✗ ch${chapNum(m.fn)}: skipped (no asset)`); continue; }
    if (!lec || !lec.id) { console.log(`  ✗ ch${chapNum(m.fn)}: no lecture slot`); continue; }
    await attachVideo(client, cid, lec.id, m.hit.id);
    console.log(`  ✓ ch${chapNum(m.fn)} → "${String(lec.title).slice(0, 44)}"  (asset ${m.hit.id})`);
    ok++;
    await sleep(250);
  }
  console.log(`\nDone: ${ok}/${files.length} videos attached. Practice tests untouched. Reload the Curriculum page to verify.`);
})().catch((e) => { console.error('load-curriculum failed:', String(e.message || e)); process.exit(1); });
