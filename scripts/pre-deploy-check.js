#!/usr/bin/env node
'use strict';
/**
 * pre-deploy-check.js — Cross-platform pre-deployment checks.
 *
 * Mirrors the behavior of pre-deploy-check.sh but runs on both
 * macOS and Windows. Invoked by `npm run predeploy`.
 */

const { spawnSync } = require('child_process');
const fs            = require('fs');
const path          = require('path');

const ROOT = path.resolve(__dirname, '..');

function log(msg) { console.log(msg); }

log('🚀 Course Pipeline — Pre-deployment checks');
log('===========================================');

// ── Run tests ────────────────────────────────────────────────────────────────
log('');
log('📋 Running test suite...');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const testResult = spawnSync(npmCmd, ['test'], {
  cwd:   ROOT,
  stdio: 'inherit',
});

if (testResult.status !== 0) {
  log('');
  log('❌ Tests failed — fix before deploying.');
  process.exit(testResult.status || 1);
}
log('✅ Tests passed');

// ── Check required files ─────────────────────────────────────────────────────
log('');
log('📁 Checking required files...');

const FILES = [
  'index.html',
  'app.js',
  'styles.css',
  'package.json',
  'components/curriculum.js',
  'components/chapter.js',
  'components/slides.js',
  'components/publish.js',
  'render/course-render.js',
  'render/course-render-all.js',
];

let allOk = true;
for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    log(`  ✅ ${rel}`);
  } else {
    log(`  ❌ Missing: ${rel}`);
    allOk = false;
  }
}

if (!allOk) {
  log('');
  log('❌ One or more required files are missing. Fix before deploying.');
  process.exit(1);
}

// ── Check .env ───────────────────────────────────────────────────────────────
log('');
if (!fs.existsSync(path.join(ROOT, '.env'))) {
  log('⚠️  Warning: .env file not found.');
  log('   Copy .env.example to .env and add your API keys before running locally.');
} else {
  log('✅ .env exists');
}

// ── Check node_modules ───────────────────────────────────────────────────────
if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
  log("⚠️  Warning: node_modules not found. Run 'npm install' first.");
} else {
  log('✅ node_modules installed');
}

log('');
log('✅ All pre-deployment checks passed — safe to deploy! 🚀');
