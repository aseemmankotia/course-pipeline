#!/usr/bin/env node
/**
 * course-render-all.js — Batch render all chapters
 *
 * Usage: npm run render:all
 *
 * Reads course-render-input.json from each chapter's directory:
 *   render/chapters/chapter-01/course-render-input.json
 *   render/chapters/chapter-02/course-render-input.json
 *   ...
 *
 * Falls back to course-render-input-N.json in the project root.
 * Requires heygen-chapter-NN.{mp4,webm,mov,avi,mkv} in each chapter dir (or ~/Downloads) for PIP overlay.
 */

const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

// Every run is captured to a timestamped log so a failed chapter's error
// survives the terminal scrollback (autopilot runs can be long).
const LOG_DIR  = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_PATH = path.join(LOG_DIR, `render-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Synchronous append so nothing is lost if a failure path calls process.exit().
function logToFile(chunk) { try { fs.appendFileSync(LOG_PATH, chunk); } catch {} }

// Run one chapter render, streaming output live to the console AND the log.
function runChapter(args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['inherit', 'pipe', 'pipe'] });
    child.stdout.on('data', d => { process.stdout.write(d); logToFile(d); });
    child.stderr.on('data', d => { process.stderr.write(d); logToFile(d); });
    child.on('error', err => resolve({ status: -1, error: err }));
    child.on('close', code => resolve({ status: code, error: null }));
  });
}

const ROOT         = path.join(__dirname, '..');
const CHAPTERS_DIR = path.join(__dirname, 'chapters');

function log(msg) { console.log(msg); logToFile(msg + '\n'); }

function loadCurriculum() {
  const dirs = fs.existsSync(CHAPTERS_DIR)
    ? fs.readdirSync(CHAPTERS_DIR).filter(d => /^chapter-\d+$/.test(d)).sort()
    : [];

  // Highest numbered root input — the staged course may have more chapters
  // than there are leftover chapter dirs, so take the max of both signals.
  let maxRootN = 0;
  for (const f of fs.readdirSync(ROOT)) {
    const m = f.match(/^course-render-input-(\d+)\.json$/);
    if (m) maxRootN = Math.max(maxRootN, parseInt(m[1]));
  }
  return Math.max(dirs.length, maxRootN);
}

function findInputFile(n) {
  const paddedNum = String(n).padStart(2, '0');
  const locations = [
    path.join(CHAPTERS_DIR, `chapter-${paddedNum}`, 'course-render-input.json'),
    path.join(ROOT, `course-render-input-${n}.json`),
    path.join(ROOT, 'course-render-input.json'),
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

const FORCE_FLAG = process.argv.includes('--force');

async function main() {
  const totalChapters = loadCurriculum();

  if (!totalChapters) {
    console.error('No chapter inputs found.');
    console.error('Download render inputs from the Render tab — one per chapter.');
    process.exit(1);
  }

  log(`\n📚 Rendering ${totalChapters} chapter(s)…${FORCE_FLAG ? ' (--force)' : ''}`);
  log(`📝 Full output logged to: ${LOG_PATH}\n`);

  const renderScript = path.join(__dirname, 'course-render.js');

  const results = [];

  for (let n = 1; n <= totalChapters; n++) {
    const paddedNum  = String(n).padStart(2, '0');
    const inputFile  = findInputFile(n);

    if (!inputFile) {
      log(`⏭  Skipping Chapter ${n} — no course-render-input.json found`);
      results.push({ chapter: n, status: 'skipped', reason: 'no input file' });
      continue;
    }

    let input;
    try { input = JSON.parse(fs.readFileSync(inputFile, 'utf8')); }
    catch (e) {
      log(`⏭  Skipping Chapter ${n} — could not parse input: ${e.message}`);
      results.push({ chapter: n, status: 'skipped', reason: 'bad input file' });
      continue;
    }

    // Resume support: skip chapters already rendered for this same course
    const existingFinal = path.join(CHAPTERS_DIR, `chapter-${paddedNum}`, `chapter-${paddedNum}-final.mp4`);
    const sentinel = path.join(CHAPTERS_DIR, `chapter-${paddedNum}`, 'slides', '.last-course-id');
    if (!FORCE_FLAG && fs.existsSync(existingFinal) && fs.existsSync(sentinel)
        && fs.readFileSync(sentinel, 'utf8').trim() === String(input.course_id)) {
      log(`↷  Chapter ${n} already rendered for this course — skipping (--force to re-render)`);
      results.push({ chapter: n, status: 'done', path: existingFinal });
      continue;
    }

    log(`${'─'.repeat(60)}`);
    log(`🎬 Chapter ${n} of ${totalChapters}: ${input.chapter_title || ''}`);
    log(`   Input: ${inputFile}`);

    const args = [renderScript, String(n)];
    if (FORCE_FLAG) args.push('--force');

    const res = await runChapter(args);

    if (res.status === 0) {
      const finalPath = path.join(
        CHAPTERS_DIR, `chapter-${paddedNum}`, `chapter-${paddedNum}-final.mp4`
      );
      log(`✅ Chapter ${n} → ${finalPath}`);
      results.push({ chapter: n, status: 'done', path: finalPath });
    } else {
      const err = res.error
        ? res.error.message
        : `exited with code ${res.status}`;
      console.error(`❌ Chapter ${n} failed: ${err}`);
      logToFile(`❌ Chapter ${n} failed: ${err}\n`);
      results.push({ chapter: n, status: 'failed', error: err });
    }
  }

  // Second pass: retry failed chapters once in fresh processes — screenshot
  // hangs are flaky and usually succeed on a clean attempt.
  const firstPassFailed = results.filter(r => r.status === 'failed');
  if (firstPassFailed.length) {
    log(`\n🔁 Retrying ${firstPassFailed.length} failed chapter(s)…`);
    for (const r of firstPassFailed) {
      const n = r.chapter;
      const paddedNum = String(n).padStart(2, '0');
      log(`${'─'.repeat(60)}`);
      log(`🎬 Retry Chapter ${n}`);
      const args2 = [renderScript, String(n)];
      const res2 = await runChapter(args2);
      if (res2.status === 0) {
        const idx = results.findIndex(x => x.chapter === n);
        results[idx] = { chapter: n, status: 'done', path: path.join(CHAPTERS_DIR, `chapter-${paddedNum}`, `chapter-${paddedNum}-final.mp4`) };
        log(`✅ Chapter ${n} succeeded on retry`);
      } else {
        log(`❌ Chapter ${n} failed again`);
      }
    }
  }

  // Summary
  log(`\n${'═'.repeat(60)}`);
  log('📊 Render Summary:');
  results.forEach(r => {
    const icon = r.status === 'done' ? '✅' : r.status === 'skipped' ? '⏭ ' : '❌';
    const detail = r.status === 'skipped' ? ` (${r.reason})` : r.status === 'failed' ? ` — ${r.error}` : '';
    log(`   ${icon} Chapter ${r.chapter}: ${r.status}${detail}`);
  });

  const done = results.filter(r => r.status === 'done').length;
  log(`\n🎉 ${done} / ${totalChapters} chapter(s) rendered successfully`);

  if (done > 0) {
    log('\nFinal videos:');
    results.filter(r => r.status === 'done').forEach(r => log(`  ${r.path}`));
    log('\nGo to the Publish tab to upload to YouTube.');
  }

  // Batch is only a success if every chapter with an input file rendered.
  const failed = results.filter(r => r.status === 'failed').length;
  if (failed > 0 || done === 0) process.exit(1);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
