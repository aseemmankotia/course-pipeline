#!/usr/bin/env node
/**
 * collect-videos.js — preserve rendered chapter videos into a per-course folder.
 *
 * The renderer writes finals to render/chapters/chapter-NN/chapter-NN-final.mp4,
 * which is a SHARED directory wiped by `rm -rf render/chapters` between courses.
 * Run this immediately AFTER `npm run render:all` and BEFORE rendering the next
 * course, so each course's videos are saved (and named by chapter title) under
 * exports/<slug>/videos/ — the folder the Udemy Bulk Uploader pulls from.
 *
 * Usage:
 *   node scripts/collect-videos.js --slug=<slug>
 *   node scripts/collect-videos.js --slug=<slug> --move   # move instead of copy
 *
 * Naming: exports/<slug>/videos/<exam-code>-chapter-NN-<slugified-title>.mp4
 * The <exam-code> prefix makes every video filename GLOBALLY UNIQUE across the
 * whole catalog. Without it, courses that share a chapter title — most commonly
 * the final "chapter-12-full-practice-exam-simulation-and-time-management-strategy"
 * — produce byte-identical filenames, so the Udemy asset library holds several
 * assets with the same title and attach-by-filename can grab the wrong course's
 * video (this bit NCP-OUSD vs NCA-ADS vs CPM on 2026-08-03). A per-course prefix
 * removes the ambiguity end-to-end (collect → shell-spec → API attach).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/collect-videos.js --slug=<slug> [--move]'); process.exit(1); }

const CHAPTERS_DIR = path.join(ROOT, 'render', 'chapters');
if (!fs.existsSync(CHAPTERS_DIR)) { console.error(`❌ ${CHAPTERS_DIR} does not exist — nothing to collect (did the render run?).`); process.exit(1); }

// chapter titles for nice filenames (best-effort)
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
let titles = {};
for (const p of [path.join(ROOT, 'generated', args.slug, 'course-data-export.json'), path.join(ROOT, 'course-data-export.json')]) {
  try { const j = JSON.parse(fs.readFileSync(p, 'utf8')); (j.chapters || []).forEach(c => { titles[c.number] = c.title; }); if (Object.keys(titles).length) break; } catch {}
}

// Per-course unique filename prefix. Prefer the config's exam_code (short and
// unique per course, e.g. "dea-c01", "ncp-ousd"); fall back to the slug. This is
// what guarantees globally-unique video filenames across the catalog.
let examCode = '';
try {
  const cfgDir = path.join(ROOT, 'course-configs');
  for (const f of fs.readdirSync(cfgDir)) {
    if (!f.endsWith('.json')) continue;
    try { const c = JSON.parse(fs.readFileSync(path.join(cfgDir, f), 'utf8')); if (c.slug === args.slug) { examCode = c.exam_code || ''; break; } } catch {}
  }
} catch {}
const PREFIX = slugify(examCode) || slugify(args.slug);

// --rev marks a REMEDIATION pass (audio-aligned re-render). Remediated videos go
// into their own folder (exports/<slug>/videos-<revTag>/) and carry a -<revTag>
// suffix in the filename. Two reasons: (1) they're instantly identifiable as the
// fixed version, and (2) the distinct filename means Udemy's asset library stores
// them as NEW assets — so attach-by-filename replaces the stale originals instead
// of silently re-grabbing the old same-named asset.
//   --rev            → revTag "rev1"
//   --rev=2          → revTag "rev2"
//   --rev=rev3       → revTag "rev3"
const revTag = args.rev === true ? 'rev1'
  : args.rev ? (String(args.rev).startsWith('rev') ? String(args.rev) : `rev${args.rev}`)
  : '';
const revSuffix = revTag ? `-${revTag}` : '';

const OUT = path.join(ROOT, 'exports', args.slug, revTag ? `videos-${revTag}` : 'videos');
fs.mkdirSync(OUT, { recursive: true });

const chapterDirs = fs.readdirSync(CHAPTERS_DIR).filter(d => /^chapter-\d+$/.test(d)).sort();
let copied = 0, missing = [];
for (const d of chapterDirs) {
  const num = parseInt(d.match(/\d+/)[0], 10);
  const src = path.join(CHAPTERS_DIR, d, `chapter-${String(num).padStart(2, '0')}-final.mp4`);
  if (!fs.existsSync(src)) { missing.push(num); continue; }
  const title = titles[num] ? '-' + slugify(titles[num]) : '';
  const dst = path.join(OUT, `${PREFIX}-chapter-${String(num).padStart(2, '0')}${title}${revSuffix}.mp4`);
  fs.copyFileSync(src, dst);
  if (args.move) fs.rmSync(src, { force: true });
  console.log(`  ${args.move ? 'moved' : 'copied'}  ${path.basename(dst)}  (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB)`);
  copied++;
}

console.log(`\n${copied ? '✅' : '⚠️'} ${copied} video(s) → ${path.relative(ROOT, OUT)}`);
if (missing.length) console.log(`   missing finals for chapter(s): ${missing.join(', ')} — re-render those.`);
if (copied) console.log(`\nNow upload ${path.relative(ROOT, OUT)}/*.mp4 to Udemy (Bulk Uploader), THEN it's safe to \`rm -rf render/chapters\` for the next course.`);
