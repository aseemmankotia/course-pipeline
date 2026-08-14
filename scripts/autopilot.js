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

// One-time editorial scripts per slug (accuracy patches applied before regeneration)
const EDITORIALS = {
  'aws-certified-ai-practitioner-aif-c01': 'scripts/apply-editorial-aif.js',
};

// Every config in course-configs/ is a course; completed ones are skipped
// automatically by the exports/<slug>/videos completeness check.
const COURSES = fs.readdirSync(path.join(ROOT, 'course-configs'))
  .filter(f => f.endsWith('.json'))
  .map(f => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'course-configs', f), 'utf8'));
    return { config: `course-configs/${f}`, slug: cfg.slug, editorial: EDITORIALS[cfg.slug] || null };
  })
  .filter(c => !args.only || c.slug === args.only);

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
  // stale per-chapter finals from a previous course (collect() reads these
  // paths) — but keep finals whose sentinel matches a known generated course,
  // so resumed runs don't throw away finished renders
  const knownIds = new Set();
  const genRoot = path.join(ROOT, 'generated');
  if (fs.existsSync(genRoot)) {
    for (const d of fs.readdirSync(genRoot)) {
      const st = path.join(genRoot, d, 'state.json');
      try { const s = JSON.parse(fs.readFileSync(st, 'utf8')); if (s.course_id) knownIds.add(String(s.course_id)); } catch {}
    }
  }
  const chDir = path.join(ROOT, 'render', 'chapters');
  if (fs.existsSync(chDir)) {
    for (const d of fs.readdirSync(chDir)) {
      const fin = path.join(chDir, d, `${d}-final.mp4`);
      if (!fs.existsSync(fin)) continue;
      let sentinel = '';
      try { sentinel = fs.readFileSync(path.join(chDir, d, 'slides', '.last-course-id'), 'utf8').trim(); } catch {}
      if (knownIds.has(sentinel)) continue; // rendered by a current generated course — keep
      moves.push([fin, path.join(legacyDir, 'chapter-finals', `${d}-final.mp4`)]);
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

    // Published courses are frozen: a PUBLISHED marker in generated/<slug>/
    // means the course is live (or in review) on Udemy and must never be
    // regenerated by a bare autopilot run — even if the local exports/videos
    // were cleaned up after upload (which broke the mp4-count check below and
    // sent a run off to re-narrate CCDV-F on 2026-07-27).
    if (fs.existsSync(path.join(ROOT, 'generated', course.slug, 'PUBLISHED'))) {
      console.log(`↷ ${course.slug}: PUBLISHED marker — skipping entirely`);
      continue;
    }

    // Completed courses (full video package in exports) are DONE — don't
    // regenerate, re-audit, or re-render them on later runs.
    const cfgEarly = JSON.parse(fs.readFileSync(path.join(ROOT, course.config), 'utf8'));
    const vidsEarly = path.join(ROOT, 'exports', course.slug, 'videos');
    if (fs.existsSync(vidsEarly) && fs.readdirSync(vidsEarly).filter(f => f.endsWith('.mp4')).length >= (cfgEarly.chapters_target || 10)) {
      console.log(`↷ ${course.slug}: complete package in exports — skipping entirely`);
      continue;
    }

    // 1+2. generate (+ editorial + regenerate if needed)
    if (!SKIP.has('generate')) {
      run('generate', process.execPath, ['scripts/generate-course.js', `--config=${course.config}`]);
      if (editorialNeeded(course)) {
        run('editorial patch', process.execPath, [course.editorial]);
        run('regenerate patched chapters', process.execPath, ['scripts/generate-course.js', `--config=${course.config}`]);
      }
    }

    // 2.5 auto-heal — deterministically fix the two issues the generator
    // reliably introduces, BEFORE QA, so recoverable drift never hard-blocks a
    // run. Both are safe, no model call, and run pre-render so quiz pools (baked
    // into video) are corrected too:
    //   • domain tags drift off the config's exact names ("Design Applications"
    //     vs "Domain 1: Design Applications") — snap them back.
    //   • correct-answer positions skew hard to B — even them out.
    // normalize-domains exits non-zero only when a tag can't be mapped at all
    // (a genuinely wrong/retired exam version), which SHOULD reach QA and block.
    if (!SKIP.has('generate')) {
      run('unwrap nested questions', process.execPath, ['scripts/normalize-questions.js', `--slug=${course.slug}`], { allowFail: true });
      run('normalize domain tags', process.execPath, ['scripts/normalize-domains.js', `--slug=${course.slug}`], { allowFail: true });
      run('balance answer positions', process.execPath, ['scripts/balance-answers.js', `--slug=${course.slug}`], { allowFail: true });
      run('re-assemble after heal', process.execPath, ['scripts/generate-course.js', `--config=${course.config}`, '--stage=assemble'], { allowFail: true });
    }

    // 3. QA — HARD gate with a self-heal loop. If QA blocks, run the deeper heal
    // (expand short chapters, condense over-long ones + dedupe questions, re-balance),
    // re-assemble and re-check, up to twice, before giving up. The deep fixes call
    // the model, so they run ONLY when QA actually blocks — no cost on clean runs.
    if (!SKIP.has('qa')) {
      const deepHeal = (n) => {
        run(`unwrap nested questions (heal ${n})`, process.execPath, ['scripts/normalize-questions.js', `--slug=${course.slug}`], { allowFail: true });
        run(`fix multi-select questions (heal ${n})`, process.execPath, ['scripts/fix-multiselect.js', `--slug=${course.slug}`], { allowFail: true });
        run(`expand short chapters (heal ${n})`, process.execPath, ['scripts/expand-short-chapter.js', `--slug=${course.slug}`], { allowFail: true });
        run(`condense long / dedupe (heal ${n})`, process.execPath, ['scripts/fix-qa-warnings.js', `--slug=${course.slug}`], { allowFail: true });
        run(`re-balance answers (heal ${n})`, process.execPath, ['scripts/balance-answers.js', `--slug=${course.slug}`], { allowFail: true });
        run(`re-assemble (heal ${n})`, process.execPath, ['scripts/generate-course.js', `--config=${course.config}`, '--stage=assemble'], { allowFail: true });
      };
      let ok = run('qa audit', process.execPath, ['scripts/qa-course.js', `--slug=${course.slug}`], { allowFail: true });
      for (let n = 1; !ok && n <= 2; n++) {
        console.log(`\n🩹 QA blocking — self-heal pass ${n}/2 …`);
        deepHeal(n);
        ok = run(`qa audit (re-check ${n})`, process.execPath, ['scripts/qa-course.js', `--slug=${course.slug}`], { allowFail: true });
      }
      if (!ok) {
        console.error('❌ QA still blocking after self-heal — see generated/' + course.slug + '/qa-report.md');
        process.exit(1);
      }
    }

    // 3.5 QA-passed artifacts: text-free card + practice-test CSVs, then a HARD
    // compliance gate (verbatim disclosure top-line, no promise language in the
    // description OR goals, text-free card) — the exact rules that bounce courses.
    if (!SKIP.has('artifacts')) {
      run('course card (text-free)', 'python3', ['scripts/make-card.py', `--slug=${course.slug}`], { allowFail: true });
      run('practice-test CSVs', 'python3', ['scripts/make-practice-test-csvs.py', `--slug=${course.slug}`], { allowFail: true });
      run('compliance gate', process.execPath, ['scripts/compliance-check.js', `--slug=${course.slug}`]); // hard: stops the run on any violation
    }

    // 4. narration (voice) — TTS by default (free), HeyGen avatar if configured.
    // Skipped entirely when the course's video package is already complete.
    const cfgChapters = JSON.parse(fs.readFileSync(path.join(ROOT, course.config), 'utf8')).chapters_target || 10;
    const vidsDir = path.join(ROOT, 'exports', course.slug, 'videos');
    const alreadyComplete = fs.existsSync(vidsDir) && fs.readdirSync(vidsDir).filter(f => f.endsWith('.mp4')).length >= cfgChapters;
    if (alreadyComplete) console.log(`↷ ${course.slug}: video package already complete — skipping narration`);
    if (!alreadyComplete && !SKIP.has('voice') && !SKIP.has('heygen')) {
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
        // TTS completeness: edge-tts occasionally drops a chapter, which then
        // silently vanishes from the render (this bit AI-300 ch 4/9/10/11).
        // Assert all N narration tracks exist; retry the gaps once (tts-generate
        // skips the ones already made) before the render stage runs.
        const nHeygen = () => fs.readdirSync(ROOT).filter(f => /^heygen-chapter-\d+\.mp4$/.test(f)).length;
        if (nHeygen() < cfgChapters) {
          console.log(`\n🔁 TTS produced ${nHeygen()}/${cfgChapters} narration tracks — retrying the missing ones …`);
          run('tts narration retry', process.execPath, ['scripts/tts-generate.js', `--slug=${course.slug}`], { allowFail: true });
        }
      }
    }

    // 5-7. stage → render → salvage. Progress accumulates monotonically:
    // finished chapters live in exports/<slug>/videos and are never re-rendered,
    // even across runs and course switches.
    if (!SKIP.has('render')) {
      const outDir = path.join(ROOT, 'exports', course.slug);
      fs.mkdirSync(path.join(outDir, 'videos'), { recursive: true });
      fs.mkdirSync(path.join(outDir, 'heygen-src'), { recursive: true });
      const chaptersDir = path.join(ROOT, 'render', 'chapters');

      // Chapter plan: number → expected output filename
      const plan = [];
      for (const f of fs.readdirSync(gen)) {
        const m = f.match(/^course-render-input-(\d+)\.json$/);
        if (!m) continue;
        const ri = JSON.parse(fs.readFileSync(path.join(gen, f), 'utf8'));
        plan.push({ n: parseInt(m[1]), nn: String(m[1]).padStart(2, '0'), out: ri.output_filename || `chapter-${String(m[1]).padStart(2, '0')}-final.mp4`, courseId: String(ri.course_id) });
      }
      const exported = () => plan.filter(p => fs.existsSync(path.join(outDir, 'videos', p.out)));
      const missing = () => plan.filter(p => !fs.existsSync(path.join(outDir, 'videos', p.out)));

      // Salvage: move any sentinel-matching finals from the shared chapter dirs
      // into this course's package (protects partial progress from prior runs)
      const salvage = () => {
        for (const p of missing()) {
          const fin = path.join(chaptersDir, `chapter-${p.nn}`, `chapter-${p.nn}-final.mp4`);
          const sen = path.join(chaptersDir, `chapter-${p.nn}`, 'slides', '.last-course-id');
          try {
            if (fs.existsSync(fin) && fs.readFileSync(sen, 'utf8').trim() === p.courseId) {
              fs.renameSync(fin, path.join(outDir, 'videos', p.out));
              console.log(`📦 salvaged chapter ${p.n} → exports/${course.slug}/videos/${p.out}`);
            }
          } catch {}
        }
      };
      salvage();

      if (missing().length === 0) {
        console.log(`↷ All ${plan.length} chapters already in exports/${course.slug}/videos — skipping render`);
      } else {
        // Reliable screenshots need chrome-headless-shell (idempotent install,
        // cached after the first download)
        run('ensure chrome-headless-shell', 'npx', ['puppeteer', 'browsers', 'install', 'chrome-headless-shell'], { allowFail: true, shell: process.platform === 'win32' });
        // Kill stray headless Chrome processes from earlier failed runs — they
        // accumulate and starve new instances (never touches your real Chrome).
        // SKIP under PIPELINE_PARALLEL: a global pkill would kill the headless
        // Chrome of OTHER courses rendering concurrently (pipeline-parallel.js).
        if (process.platform !== 'win32' && !process.env.PIPELINE_PARALLEL) {
          spawnSync('pkill', ['-f', 'Chrome for Testing'], { stdio: 'ignore' });
          spawnSync('pkill', ['-f', 'chrome-headless-shell'], { stdio: 'ignore' });
        }
        run('stage render inputs', process.execPath, ['scripts/stage-course.js', `--slug=${course.slug}`]);
        // prune staged inputs for chapters that are already exported
        for (const p of exported()) {
          const staged = path.join(ROOT, `course-render-input-${p.n}.json`);
          if (fs.existsSync(staged)) fs.unlinkSync(staged);
        }
        console.log(`🎬 Rendering ${missing().length} remaining chapter(s): ${missing().map(p => p.n).join(', ')}`);
        run('render chapters', process.execPath, ['render/course-render-all.js'], { allowFail: true });
        salvage();
        const still = missing();
        if (still.length) {
          console.error(`\n❌ ${still.length} chapter(s) still missing for ${course.slug}: ${still.map(p => p.n).join(', ')}`);
          console.error('   Progress is saved. Re-run npm run autopilot to retry only these.');
          process.exit(1);
        }
      }
      console.log(`📦 exports/${course.slug}/videos complete: ${exported().length}/${plan.length}`);
      for (const f of fs.readdirSync(ROOT)) {
        if (/^heygen-chapter-\d+\.mp4$/.test(f)) fs.renameSync(path.join(ROOT, f), path.join(outDir, 'heygen-src', f));
      }
      // copy course package docs
      for (const doc of ['udemy-listing.md', 'course-data-export.json', 'qa-report.md']) {
        const src = path.join(gen, doc);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, doc));
      }
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

    // 9. shell-spec — the single artifact that drives the one-pass Udemy build
    // (Udemy has no public authoring API, so shell creation stays a browser step).
    if (!SKIP.has('artifacts')) {
      run('shell-spec (drives the Udemy build)', process.execPath, ['scripts/make-shell-spec.js', `--slug=${course.slug}`], { allowFail: true });
    }
  }

  console.log(`\n\n🎉 Autopilot complete. Each course package in exports/<slug>/ now has:`);
  console.log('   videos/ · heygen-src/ · <slug>-card-notext.png · practice-test CSVs · welcome-promo(-short).mp4 · shell-spec.json · qa-report.md');
  console.log('\n   PHASE B (once the shell is submitted & the course goes LIVE):');
  console.log('     1) Build the Udemy shell from exports/<slug>/shell-spec.json  (browser pass)');
  console.log('     2) node scripts/register-course.js --slug=<slug> --udemy=<liveUrl>   # site + promo + reviews');
  console.log('     3) node scripts/build-practice-site.js --all   # then deploy');
  console.log('     4) node scripts/promo-all.js --slug=<slug> && node scripts/promo-all.js --upload   # YouTube Short');
})();
