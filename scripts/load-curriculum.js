#!/usr/bin/env node
// scripts/load-curriculum.js
// Pipeline step: build a course's VIDEO CURRICULUM via the Udemy instructor API.
// Creates one chapter + one lecture per chapter title (from shell-spec.curriculum),
// then attaches each chapter's already-uploaded library video, matched by filename.
//
// Run this AFTER the chapter videos are uploaded to the content library (Bulk
// Uploader) and the shell exists. It reuses the validated buildCurriculum +
// attachVideo from scripts/udemy/course-lifecycle.js and the asset-search endpoint
// the "Add from library" picker uses.
//
// NOTE: buildCurriculum wipes existing lectures & chapters (fresh-shell assumption),
// so any practice tests loaded earlier should be RE-LOADED afterwards — this script
// prints the exact pt:load command to run. pt:load is idempotent.
//
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
const { buildCurriculum, attachVideo } = require('./udemy/course-lifecycle');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function arg(name, def) {
  const h = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!h) return def;
  const i = h.indexOf('=');
  return i === -1 ? true : h.slice(i + 1);
}
const chapNum = (fn) => { const m = fn.match(/-chapter-(\d+)/i); return m ? parseInt(m[1], 10) : null; };

// The chapter videos on disk — prefer the remediated (audio-aligned) videos-rev1/.
function videoFiles(slug) {
  for (const sub of ['videos-rev1', 'videos']) {
    const d = path.join(ROOT, 'exports', slug, sub);
    if (!fs.existsSync(d)) continue;
    const files = fs.readdirSync(d).filter((f) => /-chapter-\d+.*\.mp4$/i.test(f));
    if (files.length) { files.sort((a, b) => (chapNum(a) || 0) - (chapNum(b) || 0)); return { dir: sub, files }; }
  }
  return { dir: null, files: [] };
}

// Find the uploaded library asset whose title matches this chapter's video filename.
// Search by the "<prefix>-chapter-NN" key (what the web picker searches by), then
// require an EXACT filename match so ch1 never grabs ch10, and a -rev1 file gets the
// -rev1 asset rather than a stale non-rev asset.
async function findAsset(client, filename) {
  const stem = filename.replace(/\.mp4$/i, '').toLowerCase();
  const keyM = filename.match(/^(.*-chapter-\d+)/i);
  const key = keyM ? keyM[1] : filename.replace(/\.mp4$/i, '');
  const res = await client.get('/api-2.0/users/me/assets/', {
    query: {
      page: 1, page_size: 50,
      'fields[asset]': 'title,status,asset_type,created',
      ordering: '-created', asset_type: 'Video', search: key,
    },
  });
  const items = res.results || [];
  const norm = (t) => String(t || '').replace(/\.mp4$/i, '').toLowerCase();
  let hit = items.find((a) => norm(a.title) === stem);          // exact filename
  if (!hit) hit = items.find((a) => norm(a.title).startsWith(stem)); // prefix
  if (!hit && items.length === 1) hit = items[0];
  return { hit, candidates: items.length };
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
    ? spec.curriculum
    : files.map((f) => `Chapter ${chapNum(f)}`);

  // Preview asset matches first (also the whole job when --dry-run).
  console.log('  Matching library assets:');
  const matches = [];
  for (const fn of files) {
    const { hit, candidates } = await findAsset(client, fn);
    matches.push({ fn, hit });
    console.log(`   ch${String(chapNum(fn)).padStart(2)}: ${hit ? `✓ asset ${hit.id} [${hit.status}]` : `✗ NOT FOUND`}  (${candidates} cand.)  ${fn.slice(0, 46)}`);
    await sleep(150);
  }
  const missing = matches.filter((m) => !m.hit);
  if (missing.length) console.log(`\n⚠ ${missing.length} chapter video(s) not found in the library yet (still uploading/processing?).`);
  if (dryRun) { console.log('\n[dry-run] no changes made. Re-run without --dry-run to build the curriculum.'); return; }
  if (missing.length === files.length) { console.error('No assets matched at all — is the library upload done? Aborting.'); process.exit(1); }

  // Build chapters + lectures (validated). WIPES existing lectures/chapters.
  const lectures = await buildCurriculum(client, cid, titles, (m) => console.log('  ' + m));

  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    const m = matches[i];
    const lec = lectures[i];
    if (!m.hit) { console.log(`  ✗ ch${chapNum(m.fn)}: skipped (no asset)`); continue; }
    if (!lec) { console.log(`  ✗ ch${chapNum(m.fn)}: no lecture slot`); continue; }
    await attachVideo(client, cid, lec.id, m.hit.id);
    console.log(`  ✓ ch${chapNum(m.fn)} → "${String(lec.title).slice(0, 44)}"  (asset ${m.hit.id})`);
    ok++;
    await sleep(300);
  }

  console.log(`\nDone: ${ok}/${files.length} videos attached to lectures.`);
  console.log(`  ↻ Restore practice tests (curriculum rebuild removed them):`);
  console.log(`     npm run pt:load -- --slug=${slug} --course=${cid}`);
})().catch((e) => { console.error('load-curriculum failed:', String(e.message || e)); process.exit(1); });
