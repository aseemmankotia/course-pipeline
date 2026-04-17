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
 * Audio is generated automatically via ElevenLabs — no HeyGen video needed.
 */

const { execSync } = require('child_process');
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

async function main() {
  const totalChapters = loadCurriculum();

  if (!totalChapters) {
    console.error('No chapter inputs found.');
    console.error('Download render inputs from the Render tab — one per chapter.');
    process.exit(1);
  }

  log(`\n📚 Rendering ${totalChapters} chapter(s)…\n`);

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

    try {
      execSync(`node render/course-render.js ${n}`, {
        cwd: ROOT,
        stdio: 'inherit',
      });

      const finalPath = path.join(
        CHAPTERS_DIR, `chapter-${paddedNum}`, `chapter-${paddedNum}-final.mp4`
      );
      log(`✅ Chapter ${n} → ${finalPath}`);
      results.push({ chapter: n, status: 'done', path: finalPath });

    } catch (err) {
      console.error(`❌ Chapter ${n} failed: ${err.message}`);
      results.push({ chapter: n, status: 'failed', error: err.message });
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
