#!/usr/bin/env node
/**
 * course-render-all.js — Batch render all chapters
 *
 * Usage: npm run render:all
 *
 * Reads the curriculum from the most recently exported course-render-input.json
 * files (one per chapter, named course-render-input-N.json) and renders each.
 * Alternatively, pass --from-app to use localStorage export (if available).
 *
 * Expects files: course-render-input-1.json, course-render-input-2.json, ...
 * in the project root. These are downloaded one at a time from the Render tab.
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function log(msg) { console.log(msg); }

async function main() {
  // Find all chapter input files
  const files = fs.readdirSync(ROOT)
    .filter(f => /^course-render-input(-\d+)?\.json$/.test(f))
    .sort();

  if (!files.length) {
    console.error('No course-render-input*.json files found in project root.');
    console.error('Download render inputs from the Render tab — one per chapter.');
    process.exit(1);
  }

  log(`📚 Found ${files.length} chapter input file(s): ${files.join(', ')}`);

  for (const file of files) {
    const inputSrc  = path.join(ROOT, file);
    const inputDest = path.join(ROOT, 'course-render-input.json');

    log(`\n${'─'.repeat(60)}`);
    log(`🎬 Rendering: ${file}`);

    // Copy this chapter's input as the active input file
    fs.copyFileSync(inputSrc, inputDest);

    try {
      execSync('node render/course-render.js', {
        cwd: ROOT,
        stdio: 'inherit',
      });
      log(`✅ Done: ${file}`);
    } catch (err) {
      console.error(`❌ Failed on ${file}: ${err.message}`);
      // Continue to next chapter
    }
  }

  log(`\n${'═'.repeat(60)}`);
  log(`✅ All chapters processed. Check project root for chapter-*.mp4 files.`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
