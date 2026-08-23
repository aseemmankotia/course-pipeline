#!/usr/bin/env node
/**
 * clip-queue.js — track which question clips have been published, per platform, so the
 * same question never goes out twice on the same surface.
 *
 * Modelled on marketing/email/announced.json (the per-slug dedupe that keeps a course
 * from being blasted to the newsletter twice). Same idea, finer grain: the key is
 * "<slug>#<questionIndex>" and the value records which platforms have had it.
 *
 * A clip CAN legitimately go to several platforms — that's the whole point of rendering
 * one 1080x1920 asset — so dedupe is per (clip, platform), not per clip.
 *
 * Store: marketing/clips/published.json
 *
 * Usage:
 *   node scripts/clip-queue.js next --platform=tiktok [--count=3] [--slug=<slug>]
 *   node scripts/clip-queue.js mark --platform=tiktok --clip=<slug>#45 [--url=...]
 *   node scripts/clip-queue.js status
 *   node scripts/clip-queue.js status --platform=tiktok
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE_DIR = path.join(ROOT, 'marketing', 'clips');
const STORE = path.join(STORE_DIR, 'published.json');
const CLIPS = path.join(ROOT, 'exports', 'clips');

const PLATFORMS = ['tiktok', 'youtube', 'instagram', 'facebook'];

const argv = process.argv.slice(2);
const cmd = argv[0];
const args = Object.fromEntries(argv.slice(1).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

function load() {
  if (!fs.existsSync(STORE)) return { clips: {} };
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch { return { clips: {} }; }
}
function save(db) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(db, null, 1));
}

/** Every rendered clip on disk, as {key, slug, index, mp4, meta}. */
function rendered() {
  if (!fs.existsSync(CLIPS)) return [];
  const out = [];
  for (const slug of fs.readdirSync(CLIPS)) {
    const dir = path.join(CLIPS, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(.*)-q(\d+)\.mp4$/);
      if (!m) continue;
      const jsonPath = path.join(dir, f.replace(/\.mp4$/, '.json'));
      let meta = {};
      if (fs.existsSync(jsonPath)) { try { meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch {} }
      out.push({
        key: `${slug}#${parseInt(m[2], 10)}`,
        slug, index: parseInt(m[2], 10),
        mp4: path.join(dir, f), meta,
      });
    }
  }
  return out;
}

function publishedOn(db, key, platform) {
  return Boolean(db.clips[key] && db.clips[key][platform]);
}

if (cmd === 'next') {
  const platform = String(args.platform || '').toLowerCase();
  if (!PLATFORMS.includes(platform)) {
    console.error(`--platform must be one of: ${PLATFORMS.join(', ')}`);
    process.exit(1);
  }
  const count = parseInt(args.count || '1', 10);
  const db = load();
  let pool = rendered().filter(c => !publishedOn(db, c.key, platform));
  if (args.slug) pool = pool.filter(c => c.slug === args.slug);

  // Prefer commonly_missed (stronger hook), then spread across courses so the feed
  // doesn't show four Terraform questions in a row.
  pool.sort((a, b) => {
    const am = a.meta.commonly_missed ? 0 : 1, bm = b.meta.commonly_missed ? 0 : 1;
    if (am !== bm) return am - bm;
    return a.key.localeCompare(b.key);
  });
  const seen = new Set(), picked = [];
  for (const c of pool) {
    if (picked.length >= count) break;
    if (seen.has(c.slug)) continue;      // one per course on the first pass
    seen.add(c.slug); picked.push(c);
  }
  for (const c of pool) {                // top up if we ran out of distinct courses
    if (picked.length >= count) break;
    if (!picked.includes(c)) picked.push(c);
  }
  if (!picked.length) {
    console.log(`No unpublished clips for ${platform}. Render more: python3 scripts/make-question-clip.py --all --count=3`);
    process.exit(0);
  }
  for (const c of picked) {
    console.log(`\n${c.key}`);
    console.log(`  file:    ${path.relative(ROOT, c.mp4)}`);
    if (c.meta.exam_code) console.log(`  exam:    ${c.meta.exam_code}  (${c.meta.domain || '-'})`);
    if (c.meta.caption)   console.log(`  caption: ${c.meta.caption}`);
    if (c.meta.hashtags)  console.log(`  tags:    ${c.meta.hashtags.join(' ')}`);
    console.log(`  mark:    node scripts/clip-queue.js mark --platform=${platform} --clip='${c.key}'`);
  }
} else if (cmd === 'mark') {
  const platform = String(args.platform || '').toLowerCase();
  const key = args.clip;
  if (!PLATFORMS.includes(platform) || !key) {
    console.error("usage: mark --platform=<tiktok|youtube|instagram|facebook> --clip='<slug>#<n>' [--url=...]");
    process.exit(1);
  }
  const db = load();
  db.clips[key] = db.clips[key] || {};
  db.clips[key][platform] = { at: new Date().toISOString(), url: typeof args.url === 'string' ? args.url : null };
  save(db);
  console.log(`marked ${key} as published on ${platform}`);
} else if (cmd === 'status') {
  const db = load();
  const all = rendered();
  const filter = args.platform ? [String(args.platform).toLowerCase()] : PLATFORMS;
  console.log(`rendered clips: ${all.length}`);
  for (const p of filter) {
    const done = all.filter(c => publishedOn(db, c.key, p)).length;
    console.log(`  ${p.padEnd(10)} published ${String(done).padStart(4)}   remaining ${String(all.length - done).padStart(4)}`);
  }
  const bySlug = {};
  for (const c of all) bySlug[c.slug] = (bySlug[c.slug] || 0) + 1;
  const top = Object.entries(bySlug).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) {
    console.log('\nrendered per course (top 8):');
    for (const [s, n] of top) console.log(`  ${String(n).padStart(4)}  ${s}`);
  }
} else {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
  process.exit(1);
}
