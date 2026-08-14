#!/usr/bin/env node
'use strict';
/**
 * pipeline-parallel.js — run course GENERATION or REMEDIATION for many courses
 * at once, safely, with per-course isolation and auto-recovery.
 *
 * Each course runs inside its OWN isolated working directory (pipeline-worker.js)
 * so there are ZERO shared-file collisions: staged render inputs, the root
 * heygen-chapter-NN.mp4 + .words.json narration tracks, and render/chapters/ all
 * live under the worker, while node_modules / generated / exports are symlinked
 * (each course only ever writes its own <slug> subtree). The only global hazard —
 * autopilot's `pkill chrome` — is disabled here via PIPELINE_PARALLEL=1.
 *
 * A pool runs up to --jobs courses concurrently. Every course's whole command is
 * retried on failure (the underlying stage/tts/render steps are checkpointed, so
 * a retry resumes where it stopped — that's the "auto recovery within each
 * process"). The orchestrator is the SOLE writer of the aggregate progress log,
 * so parallel workers never corrupt it.
 *
 * Usage:
 *   node scripts/pipeline-parallel.js --mode=remediate --jobs=2
 *   node scripts/pipeline-parallel.js --mode=generate  --jobs=2 --only=slugA,slugB
 *   node scripts/pipeline-parallel.js --mode=remediate --list
 *   node scripts/pipeline-parallel.js --mode=remediate --dry-run
 *   node scripts/pipeline-parallel.js --mode=remediate --jobs=3 --rev=rev2 --keep-workers
 *
 * Flags:
 *   --mode=remediate|generate   what to run per course (default remediate)
 *   --jobs=N                     max concurrent courses (default 2; see throttle note)
 *   --only=a,b,c                 explicit slug list (comma-separated)
 *   --rev=revN                   remediation revision tag (default rev1)
 *   --retries=N                  per-course retries after first failure (default 1)
 *   --include-live               remediate: also already-published courses
 *   --include-refresh            remediate: also *-refresh-* builds
 *   --keep-workers               don't delete worker dirs (debugging)
 *   --list / --dry-run           show targets / print commands without running
 *   --mock                       run a dummy per-course command (for testing the pool)
 *
 * THROTTLE NOTE: the edge-tts stage is network-bound and Microsoft rate-limits
 * sustained use. Higher --jobs multiplies the request rate and can trigger
 * throttling; tts-generate retries with backoff, but keep --jobs modest (2–3) for
 * the free engine. The CPU-bound render stage is what benefits most from
 * parallelism. ElevenLabs (paid) has no such limit.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const worker = require('./pipeline-worker.js');

const ROOT = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load the repo .env so every worker sub-stage has the API keys in its
// environment. Without this, workers only inherit the shell's process.env — and
// stages that read keys straight from process.env (ai-client-node.js) or prefer
// process.env over the on-disk .env (generate-course.js) would fail with a fatal
// auth/credit error even though .env is correct. .env values win over a stale
// shell export.
function loadDotenv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const DOTENV = loadDotenv();

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const MODE = (args.mode || 'remediate').toLowerCase();
if (!['remediate', 'generate'].includes(MODE)) { console.error(`--mode must be remediate|generate (got ${MODE})`); process.exit(1); }
let JOBS = Math.max(1, parseInt(args.jobs || '2', 10));
const RETRIES = Math.max(0, parseInt(args.retries || '1', 10));
const REV = args.rev ? (String(args.rev).startsWith('rev') ? String(args.rev) : `rev${args.rev}`) : 'rev1';
const KEEP = !!args['keep-workers'];
const LOG = path.join(ROOT, 'remediation', `parallel-${MODE}-log.json`);

// ── target discovery ───────────────────────────────────────────────────────────
function liveSlugs() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-practice-site.js'), 'utf8');
    return new Set([...src.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]));
  } catch { return new Set(); }
}
function stageableSlugs() {
  const GEN = path.join(ROOT, 'generated');
  if (!fs.existsSync(GEN)) return [];
  return fs.readdirSync(GEN).filter(slug => {
    try {
      return fs.statSync(path.join(GEN, slug)).isDirectory() &&
        fs.readdirSync(path.join(GEN, slug)).some(f => /^course-render-input-\d+\.json$/.test(f));
    } catch { return false; }
  });
}
function configSlugs() {
  const dir = path.join(ROOT, 'course-configs');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try { const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (c.slug) out.push(c.slug); } catch {}
  }
  return out;
}
function hasBuiltVideos(slug) {
  const d = path.join(ROOT, 'exports', slug, 'videos');
  try { return fs.readdirSync(d).some(f => f.endsWith('.mp4')); } catch { return false; }
}
// Already remediated = has a videos-<REV>/ folder with mp4s (audio-aligned re-render done).
function alreadyRemediated(slug) {
  try {
    return fs.readdirSync(path.join(ROOT, 'exports', slug))
      .some(d => new RegExp(`^videos-${REV}$`).test(d) &&
        fs.readdirSync(path.join(ROOT, 'exports', slug, d)).some(f => f.endsWith('.mp4')));
  } catch { return false; }
}

function targets() {
  if (args.only) return String(args.only).split(',').map(s => s.trim()).filter(Boolean);
  if (MODE === 'remediate') {
    const live = liveSlugs();
    // --published: remediate ONLY already-live courses that still have the timing
    // bug (skip any already remediated for this REV). Refreshes are updates to live
    // courses → included only with --include-refresh.
    if (args.published) {
      return stageableSlugs()
        .filter(slug => live.has(slug) || (args['include-refresh'] && /refresh/i.test(slug)))
        .filter(slug => !alreadyRemediated(slug))
        .sort();
    }
    const includeRefresh = args['include-refresh'] || args['include-live'];
    return stageableSlugs()
      .filter(slug => (args['include-live'] ? true : !live.has(slug)))
      .filter(slug => includeRefresh || !/refresh/i.test(slug))
      .filter(slug => !alreadyRemediated(slug))
      .sort();
  }
  // generate: configs not yet built (no exports videos)
  return configSlugs().filter(slug => !hasBuiltVideos(slug)).sort();
}

// ── per-course command ─────────────────────────────────────────────────────────
function cmdArgs(slug) {
  if (args.mock) {
    return ['-e', `const ms=800+Math.random()*1200;console.log('mock ${MODE} start');setTimeout(()=>{console.log('mock done');process.exit(process.env.MOCK_FAIL==='1'?1:0)},ms)`];
  }
  if (MODE === 'generate') return ['scripts/autopilot.js', `--only=${slug}`];
  return ['scripts/remediate.js', `--only=${slug}`, `--rev=${REV}`];
}

// ── aggregate log (orchestrator is the ONLY writer) ────────────────────────────
function loadLog() {
  if (fs.existsSync(LOG)) { try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch {} }
  return { mode: MODE, jobs: JOBS, rev: REV, created: new Date().toISOString(), courses: {} };
}
let logState = loadLog();
function logUpsert(slug, patch) {
  logState.courses[slug] = { ...(logState.courses[slug] || { slug }), ...patch, updatedAt: new Date().toISOString() };
  logState.jobs = JOBS; logState.mode = MODE;
  if (!args['dry-run']) {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.writeFileSync(LOG, JSON.stringify(logState, null, 2));
  }
}
function collectedVideos(slug) {
  const dir = MODE === 'remediate'
    ? path.join(ROOT, 'exports', slug, `videos-${REV}`)
    : path.join(ROOT, 'exports', slug, 'videos');
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).sort(); } catch { return []; }
}

// ── prefixed streaming spawn ────────────────────────────────────────────────────
function spawnPrefixed(cmd, cmdArgv, opts, prefix) {
  return new Promise(resolve => {
    const child = spawn(cmd, cmdArgv, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    const wire = stream => {
      let buf = '';
      stream.on('data', d => {
        buf += d.toString();
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          process.stdout.write(`${prefix} ${buf.slice(0, nl)}\n`);
          buf = buf.slice(nl + 1);
        }
      });
      stream.on('end', () => { if (buf.trim()) process.stdout.write(`${prefix} ${buf}\n`); });
    };
    wire(child.stdout); wire(child.stderr);
    child.on('close', code => resolve(code == null ? 1 : code));
    child.on('error', e => { process.stdout.write(`${prefix} spawn error: ${e.message}\n`); resolve(1); });
  });
}

// ── one course, isolated + retried ──────────────────────────────────────────────
async function processCourse(slug) {
  const prefix = `[${slug}]`;
  const t0 = Date.now();
  logUpsert(slug, { status: 'starting', mode: MODE, rev: MODE === 'remediate' ? REV : undefined, attempts: 0 });

  let dir;
  try { dir = worker.create(slug, { force: false }); }
  catch (e) { logUpsert(slug, { status: 'error', error: `worker setup: ${e.message}` }); return { slug, ok: false }; }
  const v = worker.verify(slug);
  if (!v.ok) { logUpsert(slug, { status: 'error', error: `isolation check failed: ${v.problems.join('; ')}` }); return { slug, ok: false }; }

  const maxAttempts = RETRIES + 1;
  let code = 1, attempt = 0;
  for (attempt = 1; attempt <= maxAttempts; attempt++) {
    logUpsert(slug, { status: 'running', attempt, worker: path.relative(ROOT, dir) });
    process.stdout.write(`${prefix} ▶ ${MODE} attempt ${attempt}/${maxAttempts}\n`);
    code = await spawnPrefixed(process.execPath, cmdArgs(slug),
      { cwd: dir, env: { ...process.env, ...DOTENV, PIPELINE_PARALLEL: '1', SLUG: slug } }, prefix);
    if (code === 0) break;
    if (attempt < maxAttempts) {
      process.stdout.write(`${prefix} ⚠ exit ${code} — retrying in 15s (resumes from checkpoint)\n`);
      await sleep(15000);
    }
  }

  const videos = collectedVideos(slug);
  const ok = code === 0;
  logUpsert(slug, {
    status: ok ? 'done' : 'error', attempts: attempt > maxAttempts ? maxAttempts : attempt,
    exitCode: code, videos, videoCount: videos.length,
    seconds: Math.round((Date.now() - t0) / 1000),
    finishedAt: new Date().toISOString(),
    error: ok ? undefined : `command exited ${code} after ${maxAttempts} attempt(s)`,
  });
  process.stdout.write(`${prefix} ${ok ? '✅ done' : '❌ failed'} — ${videos.length} video(s), ${Math.round((Date.now() - t0) / 1000)}s\n`);
  if (ok && !KEEP) worker.destroy(slug);
  else if (!ok) process.stdout.write(`${prefix} worker kept at ${path.relative(ROOT, dir)} for inspection\n`);
  return { slug, ok, videos };
}

// ── fixed-size worker pool ──────────────────────────────────────────────────────
async function runPool(items, jobs, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function lane() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, lane));
  return results;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async function main() {
  const tgts = targets();
  if (!tgts.length) { console.log(`No ${MODE} targets found${args.only ? ' for --only' : ''}.`); return; }

  if (args.list) {
    console.log(`\n${MODE} targets (${tgts.length}), jobs=${JOBS}${MODE === 'remediate' ? `, rev=${REV}` : ''}:\n`);
    tgts.forEach(s => console.log(`  • ${s}`));
    return;
  }
  if (args['dry-run']) {
    console.log(`\nDRY RUN — ${MODE}, ${tgts.length} course(s), jobs=${JOBS}. Per-course command (in isolated worker):`);
    tgts.forEach(s => console.log(`  [${s}]  node ${cmdArgs(s).join(' ')}   (cwd=.workers/${s}, PIPELINE_PARALLEL=1)`));
    return;
  }

  // Generation is API-heavy (many sequential LLM calls per course). generate-course
  // retries 429/5xx, so moderate concurrency is fine; if the LLM provider rate-limits
  // hard, lower --jobs. (The earlier all-courses generate failure was NOT concurrency
  // — it was the worker missing the prompts/ dir; fixed in pipeline-worker.js.)
  console.log(`\n🚀 parallel ${MODE} — ${tgts.length} course(s), ${JOBS} at a time${MODE === 'remediate' ? `, ${REV}` : ''}${args.mock ? ' [MOCK]' : ''}\n`);
  let stopping = false;
  process.on('SIGINT', () => { if (!stopping) { stopping = true; console.log('\n⏹  SIGINT — no new courses will start; letting running ones finish (Ctrl-C again to force).'); } else process.exit(130); });

  const t0 = Date.now();
  const results = await runPool(tgts, JOBS, async (slug) => {
    if (stopping) { logUpsert(slug, { status: 'skipped', error: 'interrupted' }); return { slug, ok: false, skipped: true }; }
    return processCourse(slug);
  });

  const done = results.filter(r => r && r.ok);
  const failed = results.filter(r => r && !r.ok && !r.skipped);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 parallel ${MODE} complete in ${Math.round((Date.now() - t0) / 1000)}s — ${done.length} ok, ${failed.length} failed`);
  for (const r of results) if (r) console.log(`   ${r.ok ? '✅' : (r.skipped ? '⏭ ' : '❌')} ${r.slug}${r.videos ? ` (${r.videos.length} vids)` : ''}`);
  console.log(`\nLog: ${path.relative(ROOT, LOG)}`);
  if (failed.length) { console.log(`\nRe-run to retry failures (finished courses are skipped by the underlying checkpoints).`); process.exit(1); }
})();
