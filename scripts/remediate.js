#!/usr/bin/env node
/**
 * remediate.js — re-render courses with the AUDIO-ALIGNED slide timing fix and
 * track exactly which ones got remediated.
 *
 * Background: courses rendered before 2026-08-04 timed slides by an AI-guessed
 * duration scaled to the audio length, so the narration drifted out of sync with
 * the slides. The fix (render/slide-timing.js + edge-tts WordBoundary sidecars +
 * per-slide `cue`s) flips each slide exactly when the narrator reaches it. This
 * script re-runs the render half of the pipeline (NO content regeneration) for
 * every course that still needs it, names the outputs with a -<revTag> marker so
 * the fixed videos are identifiable and safely re-attachable via the Udemy API,
 * and records progress in remediation/remediation-log.json.
 *
 * Runs ON THE MAC (needs ffmpeg + a display for slide capture and network for
 * edge-tts). The sandbox cannot render.
 *
 * Usage:
 *   node scripts/remediate.js --list                 # show target courses, do nothing
 *   node scripts/remediate.js                         # remediate every waiting course
 *   node scripts/remediate.js --only=<slug>           # just one course
 *   node scripts/remediate.js --status                # print the tracking table
 *   node scripts/remediate.js --include-live          # also target already-published courses
 *   node scripts/remediate.js --rev=2                 # bump the revision tag (default rev1)
 *   node scripts/remediate.js --force                 # redo courses already marked done
 *   node scripts/remediate.js --dry-run               # print the commands, don't execute
 *
 * Default target set = "waiting to be published": has a staged/generated render
 * input BUT is not yet registered live in scripts/build-practice-site.js.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'generated');
const LOG_DIR = path.join(ROOT, 'remediation');
const LOG = path.join(LOG_DIR, 'remediation-log.json');
const FIX_ID = 'audio-aligned-timing-2026-08-04';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const REV_TAG = args.rev ? (String(args.rev).startsWith('rev') ? String(args.rev) : `rev${args.rev}`) : 'rev1';

// ── discovery ────────────────────────────────────────────────────────────────
function liveSlugs() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-practice-site.js'), 'utf8');
    return new Set([...src.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]));
  } catch { return new Set(); }
}
// A course is remediable if it has generated render inputs (so it can be staged
// and re-rendered without regenerating content).
function stageableSlugs() {
  if (!fs.existsSync(GEN)) return [];
  return fs.readdirSync(GEN).filter(slug => {
    const dir = path.join(GEN, slug);
    try {
      return fs.statSync(dir).isDirectory() &&
        fs.readdirSync(dir).some(f => /^course-render-input-\d+\.json$/.test(f));
    } catch { return false; }
  });
}
function examCodeFor(slug) {
  try {
    const cfgDir = path.join(ROOT, 'course-configs');
    for (const f of fs.readdirSync(cfgDir)) {
      if (!f.endsWith('.json')) continue;
      try { const c = JSON.parse(fs.readFileSync(path.join(cfgDir, f), 'utf8')); if (c.slug === slug) return c.exam_code || ''; } catch {}
    }
  } catch {}
  return '';
}
function chapterCount(slug) {
  try { return fs.readdirSync(path.join(GEN, slug)).filter(f => /^course-render-input-\d+\.json$/.test(f)).length; } catch { return 0; }
}

function targets() {
  const live = liveSlugs();
  // Default "waiting to be published" wave = stageable, not live, and NOT a
  // "*-refresh-*" build. Refreshes update courses that are already published, so
  // they belong to the later "all published courses" pass (--include-live), not
  // the net-new-drafts wave. --include-refresh forces them in on their own.
  const includeRefresh = args['include-refresh'] || args['include-live'];
  return stageableSlugs()
    .filter(slug => (args['include-live'] ? true : !live.has(slug)))
    .filter(slug => includeRefresh || !/refresh/i.test(slug))
    .sort();
}

// ── tracking log ───────────────────────────────────────────────────────────────
function loadLog() {
  if (fs.existsSync(LOG)) { try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch {} }
  return { fix: FIX_ID, revTag: REV_TAG, created: new Date().toISOString(), courses: {} };
}
function saveLog(log) {
  if (args['dry-run']) return; // never persist tracking state during a dry run
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
}
function upsert(log, slug, patch) {
  const cur = log.courses[slug] || { slug, status: 'pending', revTag: REV_TAG, notes: [] };
  log.courses[slug] = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  saveLog(log);
  return log.courses[slug];
}

// ── shell exec ─────────────────────────────────────────────────────────────────
function run(cmd, cmdArgs, label) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  if (args['dry-run']) return { status: 0, dry: true };
  // Stream the child's output LIVE (inherit) so long steps like tts-generate and
  // render:all show per-chapter progress instead of buffering silently. Render
  // alignment stats are recovered afterward from render/logs/*.log, not stdout.
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`${label} failed (exit ${r.status})`);
  return r;
}

// Alignment lines are written by the renderer to render/logs/*.log. After a
// render, read whatever log files were touched during it and parse the
// per-chapter "Audio-aligned timing: M/N" / "using proportional timing" markers.
function parseAlignmentSince(sinceMs) {
  const dir = path.join(ROOT, 'render', 'logs');
  let txt = '';
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.log')) continue;
      const p = path.join(dir, f);
      try { if (fs.statSync(p).mtimeMs >= sinceMs - 1500) txt += '\n' + fs.readFileSync(p, 'utf8'); } catch {}
    }
  } catch {}
  return parseAlignment(txt);
}

// Parse the renderer's per-chapter alignment lines out of combined stdout so the
// log records how well each chapter aligned (and flags proportional fallbacks).
function parseAlignment(stdout) {
  const matched = {}; const fallback = [];
  const reAligned = /Audio-aligned timing:\s*(\d+)\/(\d+)\s*slide cues matched/g;
  const reChapter = /Chapter:\s*(\d+)|Chapter\s+(\d+)\s+—/g; // best-effort chapter marker
  // Simpler: capture every aligned/fallback line in order; map to chapters 1..N by order.
  const lines = stdout.split(/\r?\n/);
  let ch = 0;
  for (const ln of lines) {
    const cm = ln.match(/Chapter:\s*(\d+)/) || ln.match(/—\s*Chapter\s+(\d+)/) || ln.match(/Chapter\s+(\d+)\b/);
    if (cm) ch = parseInt(cm[1], 10);
    const am = ln.match(/Audio-aligned timing:\s*(\d+)\/(\d+)/);
    if (am) matched[ch || Object.keys(matched).length + 1] = `${am[1]}/${am[2]}`;
    if (/using proportional timing/.test(ln)) fallback.push(ch || '?');
  }
  return { matched, fallback };
}

// ── one course ───────────────────────────────────────────────────────────────
function remediateCourse(log, slug) {
  const rec = log.courses[slug];
  if (rec && rec.status === 'collected' && !args.force) {
    console.log(`↷ ${slug}: already remediated (${rec.revTag}) — skip (use --force to redo)`);
    return;
  }
  const n = chapterCount(slug);
  console.log(`\n${'═'.repeat(64)}\n▶ Remediating ${slug}  (${n} chapters, ${REV_TAG})\n${'═'.repeat(64)}`);
  upsert(log, slug, { status: 'staging', revTag: REV_TAG, chapters: n, examCode: examCodeFor(slug), startedAt: new Date().toISOString() });

  run('node', ['scripts/stage-course.js', `--slug=${slug}`], 'stage');
  upsert(log, slug, { status: 'tts' });
  run('node', ['scripts/tts-generate.js', `--slug=${slug}`], 'tts-generate'); // regenerates audio + .words.json

  upsert(log, slug, { status: 'rendering' });
  const renderStart = Date.now();
  run('node', ['render/course-render-all.js'], 'render:all');
  const align = args['dry-run'] ? { matched: {}, fallback: [] } : parseAlignmentSince(renderStart);

  upsert(log, slug, { status: 'collecting', cueMatch: align.matched, proportionalFallbackChapters: align.fallback });
  const cr = run('node', ['scripts/collect-videos.js', `--slug=${slug}`, `--rev=${REV_TAG}`], 'collect-videos');

  // Record the produced rev video filenames for the later Udemy re-attach.
  const outDir = path.join(ROOT, 'exports', slug, `videos-${REV_TAG}`);
  let videos = [];
  try { videos = fs.readdirSync(outDir).filter(f => f.endsWith('.mp4')).sort(); } catch {}
  upsert(log, slug, {
    status: 'collected',
    videosDir: path.relative(ROOT, outDir),
    videos,
    collectedAt: new Date().toISOString(),
    reattached: false,
  });

  // Clean the shared chapter dir for the next course (safe: videos are collected).
  run('rm', ['-rf', 'render/chapters'], 'cleanup');
  console.log(`✅ ${slug}: ${videos.length} ${REV_TAG} videos → ${path.relative(ROOT, outDir)}`);
}

// ── status printer ─────────────────────────────────────────────────────────────
function printStatus(log) {
  const rows = Object.values(log.courses);
  if (!rows.length) { console.log('No remediation recorded yet.'); return; }
  console.log(`\nRemediation log — fix ${log.fix}\n`);
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('SLUG', 46), pad('STATUS', 12), pad('REV', 6), pad('VIDS', 5), 'RE-ATTACHED');
  console.log('─'.repeat(90));
  for (const r of rows.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const fb = (r.proportionalFallbackChapters || []).length ? ` ⚠fallback:${r.proportionalFallbackChapters.join(',')}` : '';
    console.log(pad(r.slug, 46), pad(r.status, 12), pad(r.revTag || '', 6), pad((r.videos || []).length, 5), (r.reattached ? 'yes' : 'no') + fb);
  }
  console.log('');
}

// ── main ───────────────────────────────────────────────────────────────────────
(function main() {
  const log = loadLog();

  if (args.status) { printStatus(log); return; }

  const tgts = args.only ? [String(args.only)] : targets();
  if (!tgts.length) { console.log('No target courses found (nothing waiting to be published, or generated/ is empty).'); return; }

  if (args.list) {
    const live = liveSlugs();
    console.log(`\nRemediation targets (${tgts.length}) — revTag ${REV_TAG}${args['include-live'] ? ' [including live]' : ' [waiting-to-publish only]'}:\n`);
    tgts.forEach(s => {
      const st = (log.courses[s] && log.courses[s].status) || 'pending';
      console.log(`  • ${s}  (${chapterCount(s)} ch, ${examCodeFor(s) || 'no-exam-code'})  [${st}]${live.has(s) ? '  (LIVE)' : ''}`);
    });
    console.log(`\nRun without --list to remediate. Videos → exports/<slug>/videos-${REV_TAG}/`);
    return;
  }

  console.log(`Remediating ${tgts.length} course(s) with ${FIX_ID} (${REV_TAG})${args['dry-run'] ? ' [DRY RUN]' : ''}`);
  const failures = [];
  for (const slug of tgts) {
    try { remediateCourse(log, slug); }
    catch (e) {
      console.error(`❌ ${slug}: ${e.message}`);
      upsert(log, slug, { status: 'error', notes: [...(log.courses[slug]?.notes || []), `${new Date().toISOString()}: ${e.message}`] });
      failures.push(slug);
    }
  }
  printStatus(log);
  if (failures.length) { console.error(`\n⚠ ${failures.length} course(s) failed: ${failures.join(', ')}`); process.exit(1); }
  console.log(`\n✅ Remediation pass complete. Next: re-attach the -${REV_TAG} videos on Udemy (see remediation/remediation-log.json).`);
})();
