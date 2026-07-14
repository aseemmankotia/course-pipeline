#!/usr/bin/env node
/**
 * autopilot.js — One command from course configs to upload-ready packages.
 *
 * For each course config passed (or the two bundled 2026 certs by default):
 *   1. generate   — full course content (resumes if partially done)
 *   2. editorial  — one-time accuracy patches (idempotent)
 *   3. qa         — automated quality audit (stops on blocking issues)
 *   4. heygen     — avatar narration videos in Aseem's voice (skips existing)
 *   5. stage      — swap this course's render inputs into place
 *   6. render     — Puppeteer + FFmpeg chapter videos
 *   7. collect    — move finished videos + heygen sources to exports/<slug>/
 *   8. promo      — 60s promo (16:9) + YouTube Short (9:16)
 *
 * Usage:
 *   npm run autopilot                      # both bundled courses
 *   npm run autopilot -- --only=<slug>     # one course
 *   npm run autopilot -- --skip=heygen,render   # skip stages
 *
 * Everything is checkpointed: re-running skips completed work.
 * Udemy upload is intentionally NOT here — it's an interactive browser step.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const SKIP = new Set((args.skip || '').split(',').filter(Boolean));

const COURSES = [
  { config: 'course-configs/aws-ai-practitioner-aif-c01.json', slug: 'aws-certified-ai-practitioner-aif-c01', editorial: 'scripts/apply-editorial-aif.js' },
  { config: 'course-configs/comptia-secai-cy0-001.json', slug: 'comptia-secai-plus-cy0-001', editorial: null },
].filter(c => !args.only || c.slug === args.only);

function run(label, cmd, cmdArgs, opts = {}) {
  console.log(`\n━━━ ${label} ━━━`);
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`\n❌ autopilot stopped at: ${label}`);
    console.error('   Fix the issue and re-run npm run autopilot — completed work is skipped.');
    process.exit(1);
  }
  return r.status === 0;
}

function editorialNeeded(course) {
  if (!course.editorial) return false;
  const stateFile = path.join(ROOT, 'generated', course.slug, 'state.json');
  if (!fs.existsSync(stateFile)) return false;
  const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  // patch markers: fixed ch1 line present, or chapters 3/4 missing (already marked)
  return s.scripts && s.scripts['1'] && s.scripts['1'].includes('with a ten-minute minimum');
}

function quarantineLegacyMedia() {
  // Move pre-existing render outputs from earlier (manual) courses out of the
  // way so they can't leak into a new course's package.
  const legacyDir = path.join(ROOT, 'legacy-media');
  const moves = [];
  const fvDir = path.join(ROOT, 'render', 'Final Videos');
  if (fs.existsSync(fvDir)) {
    for (const f of fs.readdirSync(fvDir)) {
      if (f.endsWith('.mp4')) moves.push([path.join(fvDir, f), path.join(legacyDir, 'final-videos', f)]);
    }
  }
  for (const f of fs.readdirSync(ROOT)) {
    if (/^chapter-\d+.*\.mp4$/.test(f)) moves.push([path.join(ROOT, f), path.join(legacyDir, f)]);
  }
  // stale per-chapter finals from a previous course (collect() reads these paths)
  const chDir = path.join(ROOT, 'render', 'chapters');
  if (fs.existsSync(chDir)) {
    for (const d of fs.readdirSync(chDir)) {
      const fin = path.join(chDir, d, `${d}-final.mp4`);
      if (fs.existsSync(fin)) moves.push([fin, path.join(legacyDir, 'chapter-finals', `${d}-final.mp4`)]);
    }
  }
  if (!moves.length) return;
  for (const [src, dst] of moves) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    let dest = dst, i = 1;
    while (fs.existsSync(dest)) dest = dst.replace(/\.mp4$/, `-${i++}.mp4`);
    fs.renameSync(src, dest);
  }
  console.log(`🗄  Quarantined ${moves.length} legacy video file(s) → legacy-media/ (nothing deleted)`);
}

(async () => {
  console.log(`🚀 Autopilot — ${COURSES.length} course(s): ${COURSES.map(c => c.slug).join(', ')}`);
  quarantineLegacyMedia();

  for (const course of COURSES) {
    const gen = path.join(ROOT, 'generated', course.slug);
    console.log(`\n\n════════ ${course.slug} ════════`);

    // 1+2. generate (+ editorial + regenerate if needed)
    if (!SKIP.has('generate')) {
      run('generate', process.execPath, ['scripts/generate-course.js', `--config=${course.config}`]);
      if (editorialNeeded(course)) {
        run('editorial patch', process.execPath, [course.editorial]);
        run('regenerate patched chapters', process.execPath, ['scripts/generate-course.js', `--config=${course.config}`]);
      }
    }

    // 3. qa
    if (!SKIP.has('qa')) {
      const ok = run('qa audit', process.execPath, ['scripts/qa-course.js', `--slug=${course.slug}`], { allowFail: true });
      if (!ok) {
        console.error('❌ QA found blocking issues — see generated/' + course.slug + '/qa-report.md');
        process.exit(1);
      }
    }

    // 4. narration (voice) — TTS by default (free), HeyGen avatar if configured
    if (!SKIP.has('voice') && !SKIP.has('heygen')) {
      // restore previously generated narration from this course's package if a
      // prior collect() moved it out of the root
      const srcDir = path.join(ROOT, 'exports', course.slug, 'heygen-src');
      if (fs.existsSync(srcDir)) {
        for (const f of fs.readdirSync(srcDir)) {
          const dst = path.join(ROOT, f);
          if (/^heygen-chapter-\d+\.mp4$/.test(f) && !fs.existsSync(dst)) {
            fs.renameSync(path.join(srcDir, f), dst);
          }
        }
      }
      const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, course.config), 'utf8'));
      if (cfg.narration_mode === 'heygen') {
        run('heygen avatar videos', process.execPath, ['scripts/heygen-generate.js', `--slug=${course.slug}`]);
      } else {
        run('tts narration (free)', process.execPath, ['scripts/tts-generate.js', `--slug=${course.slug}`]);
      }
    }

    // 5. stage
    if (!SKIP.has('render')) {
      run('stage render inputs', process.execPath, ['scripts/stage-course.js', `--slug=${course.slug}`]);

      // 6. render all chapters
      run('render chapters', process.execPath, ['render/course-render-all.js']);

      // 7. collect outputs — finals land in render/chapters/chapter-NN/chapter-NN-final.mp4;
      // name each one from its render input's output_filename
      const outDir = path.join(ROOT, 'exports', course.slug);
      fs.mkdirSync(path.join(outDir, 'videos'), { recursive: true });
      fs.mkdirSync(path.join(outDir, 'heygen-src'), { recursive: true });
      const finals = [];
      const chaptersDir = path.join(ROOT, 'render', 'chapters');
      for (const f of fs.readdirSync(gen)) {
        const m = f.match(/^course-render-input-(\d+)\.json$/);
        if (!m) continue;
        const n = m[1], nn = String(n).padStart(2, '0');
        const ri = JSON.parse(fs.readFileSync(path.join(gen, f), 'utf8'));
        const finalPath = path.join(chaptersDir, `chapter-${nn}`, `chapter-${nn}-final.mp4`);
        if (fs.existsSync(finalPath)) {
          fs.renameSync(finalPath, path.join(outDir, 'videos', ri.output_filename || `chapter-${nn}-final.mp4`));
          finals.push(finalPath);
        } else {
          console.error(`❌ Missing rendered video for chapter ${n} (${finalPath})`);
          console.error('   Re-run npm run autopilot after fixing the render.');
          process.exit(1);
        }
      }
      // legacy locations (root / Final Videos) — sweep anything the render left there too
      for (const f of fs.readdirSync(ROOT)) {
        if (/^chapter-\d+.*\.mp4$/.test(f)) { fs.renameSync(path.join(ROOT, f), path.join(outDir, 'videos', f)); finals.push(f); }
      }
      for (const f of fs.readdirSync(ROOT)) {
        if (/^heygen-chapter-\d+\.mp4$/.test(f)) fs.renameSync(path.join(ROOT, f), path.join(outDir, 'heygen-src', f));
      }
      // copy course package docs
      for (const doc of ['udemy-listing.md', 'course-data-export.json', 'qa-report.md']) {
        const src = path.join(gen, doc);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, doc));
      }
      console.log(`📦 collected → exports/${course.slug}/videos (${finals.length} files)`);
    }

    // 8. promo + short (script → TTS narration → audio-only composite)
    if (!SKIP.has('promo')) {
      run('promo script', process.execPath, ['render/promo-render.js', '--preview'], { allowFail: true });
      const promoScript = path.join(ROOT, 'render', 'promo', 'promo-script.txt');
      const promoNarr = path.join(ROOT, 'heygen-promo.mp4');
      if (fs.existsSync(promoScript)) {
        if (fs.existsSync(promoNarr)) fs.unlinkSync(promoNarr); // never reuse another course's narration
        run('promo narration (tts)', process.execPath, ['scripts/tts-generate.js', '--text-file=render/promo/promo-script.txt', '--out=heygen-promo.mp4'], { allowFail: true });
      }
      run('promo + short', process.execPath, ['render/promo-render.js', '--audio-only'], { allowFail: true });
      if (fs.existsSync(promoNarr)) fs.unlinkSync(promoNarr);
      const promoDir = path.join(ROOT, 'render', 'promo');
      const outDir = path.join(ROOT, 'exports', course.slug);
      if (fs.existsSync(promoDir)) {
        fs.mkdirSync(outDir, { recursive: true });
        for (const f of ['welcome-promo.mp4', 'welcome-promo-short.mp4', 'promo-script.txt']) {
          const src = path.join(promoDir, f);
          if (fs.existsSync(src)) fs.renameSync(src, path.join(outDir, f));
        }
      }
    }
  }

  console.log(`\n\n🎉 Autopilot complete. Upload-ready packages in exports/<slug>/`);
  console.log('   Next: Udemy upload (browser step) + npm run shorts:upload for each Short.');
})();
