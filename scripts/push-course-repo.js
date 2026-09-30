#!/usr/bin/env node
/**
 * push-course-repo.js — create (if needed) and push a course's materials repo to GitHub.
 *
 * Repo name: course-<slug>. Content comes from exports/<slug>/repo/ (build-course-repo.js).
 * Requires the `gh` CLI authenticated on this machine (gh auth login). Idempotent:
 * re-running commits + pushes any changes; if the repo already exists it just pushes.
 *
 * Usage: node scripts/push-course-repo.js --slug=<slug> [--udemy=<url>]
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const slug = args.slug;
if (!slug) { console.error('Usage: node scripts/push-course-repo.js --slug=<slug> [--udemy=<url>]'); process.exit(1); }
const repoDir = path.join(ROOT, 'exports', slug, 'repo');
if (!fs.existsSync(path.join(repoDir, 'README.md'))) {
  console.error(`No generated repo at ${repoDir}. Run: node scripts/build-course-repo.js --slug=${slug}`); process.exit(1);
}
const name = `course-${slug}`;
const owner = 'aseemmankotia';
const run = (cmd) => execSync(cmd, { cwd: repoDir, stdio: 'inherit' });
const q = (cmd) => { try { return execSync(cmd, { cwd: repoDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };

if (!q('command -v gh')) {
  console.error(`gh CLI not found. Install it (brew install gh) and run: gh auth login\nThen re-run this, or manually:\n  cd exports/${slug}/repo && git init && git add -A && git commit -m "Course materials" && gh repo create ${owner}/${name} --public --source=. --push`);
  process.exit(1);
}
if (!fs.existsSync(path.join(repoDir, '.git'))) { run('git init -q'); run('git checkout -q -B main'); }
run('git add -A');
if (q('git status --porcelain')) {
  run('git -c user.name="TechNuggets Academy" -c user.email="noreply@technuggets.academy" commit -q -m "Update course study materials"');
} else { console.log('No changes to commit.'); }

const repoExists = (() => { try { execSync(`gh repo view ${owner}/${name}`, { stdio: 'ignore' }); return true; } catch { return false; } })();
if (!q('git remote get-url origin')) {
  if (repoExists) run(`git remote add origin https://github.com/${owner}/${name}.git`);
  else { run(`gh repo create ${owner}/${name} --public --source=. --remote=origin --description="Free study materials for ${slug} — TechNuggets Academy"`); }
}
run('git branch -M main');
run('git push -u origin main');
console.log(`✓ pushed https://github.com/${owner}/${name}`);
