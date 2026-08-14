#!/usr/bin/env node
'use strict';
/**
 * pipeline-worker.js — build/destroy an ISOLATED working directory for one
 * course so multiple courses can generate or remediate in parallel with zero
 * collisions.
 *
 * WHY THIS EXISTS
 * The pipeline scripts root every shared scratch path at the repo dir
 * (`path.join(__dirname, '..')`): staged `course-render-input-N.json`, the root
 * `heygen-chapter-NN.mp4` + `.words.json`, and `render/chapters/`. Two courses
 * running at once in the same repo would clobber each other's staged inputs,
 * narration tracks and rendered chapters — which is exactly why the pipeline has
 * always run one course at a time.
 *
 * ISOLATION MODEL
 * Each worker is a directory that looks like the repo but has its OWN copy of the
 * code and its OWN empty scratch, while the big/shared, per-slug-namespaced dirs
 * are symlinked back to the real repo:
 *
 *   <worker>/scripts, render/*.js, package.json, ...   COPIED  (so ROOT resolves
 *                                                                to <worker>)
 *   <worker>/node_modules   -> real   (symlink, read-only shared)
 *   <worker>/course-configs -> real   (symlink, read-only shared)
 *   <worker>/.env           -> real   (symlink, read-only shared)
 *   <worker>/generated      -> real   (symlink; each course writes only its own
 *                                       generated/<slug>/ subtree → safe)
 *   <worker>/exports        -> real   (symlink; each course writes only its own
 *                                       exports/<slug>/ subtree → safe)
 *   <worker>/render/chapters, tts-temp, temp, slides, logs, promo   EMPTY dirs
 *                                       (per-worker scratch → never shared)
 *   <worker>/heygen-chapter-*.mp4, course-render-input-*.json       (land here,
 *                                       isolated, because ROOT == <worker>)
 *
 * Because the scripts run byte-for-byte unchanged (just with __dirname inside the
 * worker), there is NO edit to the 86 KB renderer. Deleting a worker only removes
 * the copied code + scratch and unlinks the symlinks — it never touches the real
 * node_modules / generated / exports.
 *
 * Usage (also callable as a module):
 *   node scripts/pipeline-worker.js create <slug>        # prints the worker dir
 *   node scripts/pipeline-worker.js destroy <slug>
 *   node scripts/pipeline-worker.js verify <slug>        # sanity-check isolation
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORKERS_ROOT = path.join(ROOT, '.workers');

// Shared, per-slug-namespaced or read-only dirs → symlinked into the worker.
const SYMLINK_SHARED = ['node_modules', 'generated', 'exports', 'course-configs', '.env', 'marketing', 'prompts'];
// Scratch dirs that must be per-worker and start empty.
const EMPTY_SCRATCH = [
  path.join('render', 'chapters'),
  path.join('render', 'tts-temp'),
  path.join('render', 'temp'),
  path.join('render', 'slides'),
  path.join('render', 'logs'),
  path.join('render', 'promo'),
];
// Copy ONLY what the generate/remediate pipeline needs into each worker (lean +
// safe — the repo also holds multi-GB exports/, render/ scratch and stray root
// media we must never duplicate). render/ is handled specially (code only).
const COPY_INCLUDE = ['scripts', 'package.json', 'package-lock.json', 'serve.js'];

function workerDir(slug) { return path.join(WORKERS_ROOT, slug); }

// Copy via system `cp -R` (universal on macOS + Linux and, unlike fs.cpSync,
// doesn't fail trying to reproduce the repo's restrictive 0600/0700 modes). Falls
// back to fs.cpSync on platforms without cp (e.g. Windows).
function cpR(src, dst) {
  const r = spawnSync('cp', ['-R', src, dst], { encoding: 'utf8' });
  if (r.status !== 0) fs.cpSync(src, dst, { recursive: true });
}

function copyRepoSkeleton(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of COPY_INCLUDE) {
    const s = path.join(src, name);
    if (!fs.existsSync(s)) continue;
    cpR(s, path.join(dst, name));
  }
  copyRenderCodeOnly(path.join(src, 'render'), path.join(dst, 'render'));
}

// From render/ copy ONLY code + small assets; never the heavy scratch subdirs.
function copyRenderCodeOnly(srcRender, dstRender) {
  fs.mkdirSync(dstRender, { recursive: true });
  const scratch = new Set(['chapters', 'tts-temp', 'temp', 'slides', 'logs', 'promo', 'Final Videos']);
  for (const name of fs.readdirSync(srcRender)) {
    if (scratch.has(name)) continue;
    const s = path.join(srcRender, name);
    let st; try { st = fs.lstatSync(s); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    cpR(s, path.join(dstRender, name));
  }
}

function linkShared(slug, dst) {
  for (const name of SYMLINK_SHARED) {
    const target = path.join(ROOT, name);
    if (!fs.existsSync(target)) continue;
    const link = path.join(dst, name);
    try { if (fs.existsSync(link) || fs.lstatSync(link)) fs.rmSync(link, { recursive: true, force: true }); } catch {}
    fs.symlinkSync(target, link);
  }
}

function makeScratch(dst) {
  for (const rel of EMPTY_SCRATCH) fs.mkdirSync(path.join(dst, rel), { recursive: true });
}

function create(slug, { force = false } = {}) {
  const dst = workerDir(slug);
  if (fs.existsSync(dst)) {
    if (force) { destroy(slug); }
    else {
      // REUSE (checkpoint-friendly resume): repair the symlinks + scratch dirs so
      // a kept worker from a failed run is valid again. linkShared/makeScratch are
      // idempotent, so any symlink that went missing (e.g. a partial teardown) is
      // restored. Re-copy code only if it's gone.
      if (!fs.existsSync(path.join(dst, 'scripts', 'stage-course.js'))) copyRepoSkeleton(ROOT, dst);
      linkShared(slug, dst);
      makeScratch(dst);
      return dst;
    }
  }
  fs.mkdirSync(WORKERS_ROOT, { recursive: true });
  copyRepoSkeleton(ROOT, dst);
  linkShared(slug, dst);
  makeScratch(dst);
  return dst;
}

// Safe teardown: unlink the shared symlinks FIRST (so recursive delete can never
// follow them into the real node_modules/generated/exports), then remove the dir.
function destroy(slug) {
  const dst = workerDir(slug);
  if (!fs.existsSync(dst)) return;
  for (const name of SYMLINK_SHARED) {
    const link = path.join(dst, name);
    try { const st = fs.lstatSync(link); if (st.isSymbolicLink()) fs.unlinkSync(link); } catch {}
  }
  fs.rmSync(dst, { recursive: true, force: true });
}

// Confirm the isolation invariants hold (used by tests + the CLI `verify`).
function verify(slug) {
  const dst = workerDir(slug);
  const problems = [];
  if (!fs.existsSync(dst)) return { ok: false, problems: ['worker dir missing'] };
  for (const name of SYMLINK_SHARED) {
    const link = path.join(dst, name);
    if (!fs.existsSync(path.join(ROOT, name))) continue;
    let st; try { st = fs.lstatSync(link); } catch { problems.push(`${name} not linked`); continue; }
    if (!st.isSymbolicLink()) problems.push(`${name} is not a symlink`);
    else { try { if (fs.realpathSync(link) !== fs.realpathSync(path.join(ROOT, name))) problems.push(`${name} points elsewhere`); } catch { problems.push(`${name} symlink is broken`); } }
  }
  for (const rel of EMPTY_SCRATCH) {
    const p = path.join(dst, rel);
    if (!fs.existsSync(p)) { problems.push(`missing scratch ${rel}`); continue; }
    if (fs.lstatSync(p).isSymbolicLink()) problems.push(`scratch ${rel} must not be a symlink`);
  }
  // code present + rooted in the worker
  for (const need of ['scripts/stage-course.js', 'scripts/tts-generate.js', path.join('render', 'course-render.js'), path.join('render', 'slide-timing.js')]) {
    const p = path.join(dst, need);
    if (!fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink()) problems.push(`code ${need} not copied into worker`);
  }
  // NOTE: we intentionally do NOT flag heygen-chapter-*.mp4 / course-render-input-*.json
  // in the worker as "stray" — a resumed worker legitimately accumulates those as its
  // own per-course scratch, and the include-list copy never inherits them from the repo.
  return { ok: problems.length === 0, problems, dir: dst };
}

module.exports = { create, destroy, verify, workerDir, WORKERS_ROOT };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const [cmd, slug] = process.argv.slice(2);
  if (!cmd || (cmd !== 'list' && !slug)) {
    console.error('Usage: node scripts/pipeline-worker.js <create|destroy|verify> <slug>');
    process.exit(1);
  }
  if (cmd === 'create') { console.log(create(slug, { force: process.argv.includes('--force') })); }
  else if (cmd === 'destroy') { destroy(slug); console.log(`destroyed ${workerDir(slug)}`); }
  else if (cmd === 'verify') { const r = verify(slug); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 2); }
  else { console.error(`unknown command: ${cmd}`); process.exit(1); }
}
