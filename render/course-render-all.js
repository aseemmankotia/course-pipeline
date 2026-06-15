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

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const CHAPTERS_DIR = path.join(__dirname, 'chapters');

function log(msg) { console.log(msg); }

function loadCurriculum() {
  const dirs = fs.existsSync(CHAPTERS_DIR)
    ? fs.readdirSync(CHAPTERS_DIR).filter(d => /^chapter-\d+$/.test(d)).sort()
    : [];
  if (dirs.length) return dirs.length;

  const rootFiles = fs.readdirSync(ROOT)
    .filter(f => /^course-render-input(-\d+)?\.json$/.test(f));
  return rootFiles.length;
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

  log(`\n📚 Rendering ${totalChapters} chapter(s)…${FORCE_FLAG ? ' (--force)' : ''}\n`);

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

    log(`${'─'.repeat(60)}`);
    log(`🎬 Chapter ${n} of ${totalChapters}: ${input.chapter_title || ''}`);
    log(`   Input: ${inputFile}`);

    const args = [renderScript, String(n)];
    if (FORCE_FLAG) args.push('--force');

    const res = spawnSync(process.execPath, args, {
      cwd: ROOT,
      stdio: 'inherit',
    });

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
      results.push({ chapter: n, status: 'failed', error: err });
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
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
