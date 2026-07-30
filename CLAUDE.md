# Course pipeline — working rules

## Udemy publishing checklist (learned from review rejections — ALWAYS apply)

1. **AI content disclosure is mandatory AND format-strict.** The FIRST line of every
   course description must be the verbatim Help Center sentence:
   "This course contains the use of artificial intelligence."
   A custom disclosure paragraph elsewhere is NOT sufficient (CCDV-F was bounced for
   exactly this on 2026-07-27 even though it had our detailed paragraph at the end).
   generate-course.js now emits the verbatim line first + detailed paragraph after;
   both go into the Udemy description. Keep the detailed paragraph too.
   Sources: Agentforce rejection 2026-07-25; CCDV-F rejection 2026-07-27;
   https://support.udemy.com/hc/en-us/articles/33490280024087
2. **Course images must contain NO text.** Udemy rejects images with text (logo-only
   is the sole exception). Use text-free abstract cards — generator pattern lives in
   the session log; finished examples: `exports/course-images/*-notext.png` (750×422).
   Same rejection, 2026-07-25.
3. Never promise outcomes ("pass", "first attempt", "guaranteed") — Udemy compliance;
   use "prepare for / exam-focused" framing. IMPORTANT: the scan must cover BOTH the
   description AND the **Intended Learners / goals** section (learning objectives,
   requirements, who-this-is-for) — NCP-AIO was bounced a SECOND time on 2026-07-29
   because "Pass ... on your first attempt" survived in the first *learning objective*
   even after the description was fixed. Check every goals field, not just the description.
4. Practice-test generation must stay anchored to the cert (fixed in
   `scripts/generate-course.js` after CCDV-F shipped AWS/GCP/Azure questions) — after
   any regen, scan the bank for other-vendor terms before upload.
5. **Manually-built shells bypass the generator's compliance — check them by hand.**
   When a course description is PATCHed via the instructor API and the image uploaded
   through the UI (instead of using generate-course.js's `udemy-listing.md` + the
   `*-notext.png` card), rules 1-3 are NOT applied automatically. AI-103 (7273707) and
   NCP-AIO (7273711) were both bounced "Needs fixes" on 2026-07-28 for exactly this:
   description missing the verbatim disclosure top-line (rules 1), course image
   contained text (rule 2), and NCP-AIO's copy promised "pass ... on your first attempt"
   (rule 3). Fixed on resubmit by prepending the disclosure, softening "Pass the ..." →
   "Prepare for the ...", and re-uploading the text-free card. Before ANY submit of a
   hand-built shell: (a) description starts with the verbatim line, (b) detailed
   disclosure paragraph present, (c) no pass/guarantee/first-attempt language in title
   or description, (d) uploaded image is the `-notext.png` version. Note: "Audio Quality"
   (AI/TTS narration) shows only as a *recommended* improvement, not a blocker.

## Udemy mechanics worth remembering

- Never navigate directly to `udemy.com/course/create/1` — kills the instructor session.
  Always go through `/instructor/courses/`.
- Never navigate to `udemy.com/instructor/user/edit-videos/` — it redirects through
  `/user/logout/` and LOGS THE SESSION OUT (learned 2026-07-26). To check uploaded
  videos, use the course's curriculum page → "Add from library" instead.
- Practice-test **Bulk upload REPLACES the entire question bank** (it does not append).
  CSVs come from `python3 scripts/make-practice-test-csvs.py` (repo-relative paths).
- Free "Open" coupons: 5-day expiry, 10 redemptions, monthly budget per course —
  regenerate weekly (reviews campaign playbook: `marketing/reviews-campaign-2026-07.md`).
- Review turnaround ~2 business days; courses are editable while "Submitted for review".

## Rendering & video pipeline (run ON the Mac — needs ffmpeg + display; the
   sandbox cannot render)

For `narration_mode: "tts"` courses the render needs a per-chapter narration
track (`heygen-chapter-NN.mp4`, a still + TTS voice). That file is produced by
the TTS step, NOT by the renderer — skipping it makes `render:all` fail every
chapter with "no input file / heygen-chapter-NN.* not found" (0/N rendered;
learned 2026-07-28 on the Google GenAI Leader render). The CORRECT per-course
sequence is stage → **tts-generate** → render, one course at a time:

```
node scripts/stage-course.js    --slug=<slug>            # copies course-render-input-N.json to root
node scripts/tts-generate.js    --slug=<slug>            # ← REQUIRED: makes heygen-chapter-NN.mp4 (edge-tts)
npm run render:all                                       # → render/chapters/chapter-NN/chapter-NN-final.mp4
node scripts/collect-videos.js  --slug=<slug>            # ← REQUIRED: saves finals to exports/<slug>/videos/
rm -rf render/chapters                                   # ONLY after collect+upload — this dir is wiped between courses
```

CRITICAL ORDERING (learned 2026-07-29): the renderer writes finals ONLY to the
shared `render/chapters/` dir; it does NOT create `exports/<slug>/` folders. If you
`rm -rf render/chapters` before collecting/uploading, the rendered videos are LOST
(this happened to the Google GenAI Leader render — 8/8 rendered, then wiped by the
between-courses `rm -rf` before upload; had to re-render). ALWAYS run collect-videos
(or upload) before clearing. Re-rendering is fast if the `heygen-chapter-NN.mp4`
narration tracks still exist in the project root (tts-generate skips existing ones).
Upload to Udemy from `exports/<slug>/videos/*.mp4`.

- One-time: `pip3 install edge-tts` (free narration engine). `--engine=elevenlabs`
  is the paid alternative.
- tts-generate keeps an ownership manifest and quarantines heygen-chapter files
  from other courses, so stale narration can't silently leak between courses —
  but still `rm -rf render/chapters` between courses for clean slides.
- Upload the resulting `chapter-NN-final.mp4` files to Udemy via the course's
  Bulk Uploader, THEN build/attach the curriculum from the library.

## End-to-end build — `npm run autopilot` (one command, self-healing)

`scripts/autopilot.js` runs the whole content pipeline for each config, checkpointed
(re-runs skip finished work). Enhanced 2026-07-30 to close the gaps that caused
this session's misses:

```
npm run autopilot -- --only=<slug>          # one course, end to end
npm run autopilot                            # every config in course-configs/
npm run autopilot -- --only=<slug> --skip=render   # e.g. skip a heavy stage
```

Per course it does: generate → deterministic heal (domain tags + answer balance)
→ **QA HARD gate with a self-heal loop** (if QA blocks, it runs expand-short-chapter
+ fix-qa-warnings + re-balance + re-assemble and re-checks, up to 2×, before failing)
→ **text-free card** (`make-card.py`) → **practice-test CSVs** (`make-practice-test-csvs.py --slug`,
slug-named) → **compliance HARD gate** (`compliance-check.js`: verbatim disclosure
top-line + no promise language in description OR goals + text-free card) → TTS
narration **with a completeness retry** (asserts N/N `heygen-chapter-NN.mp4`, retries
gaps — fixes the AI-300 ch 4/9/10/11 drop) → stage → render → **salvage each final
into `exports/<slug>/videos/` before any cleanup** (never lose videos to `rm -rf`) →
promo + 9:16 Short → **`shell-spec.json`**. Result: `exports/<slug>/` with videos/,
card, CSVs, promo, shell-spec, qa-report — a compliant, upload-ready package.

**Phase B — after the course is submitted & goes LIVE** (needs the live URL, so it
can't run headless during content build):
1. Build the Udemy shell from `exports/<slug>/shell-spec.json` (browser pass — Udemy
   has no authoring API; drive it via Claude-in-Chrome, then bulk-upload the CSVs and
   attach videos, run the compliance checklist, submit).
2. `node scripts/register-course.js --slug=<slug> --udemy=<liveUrl>` — adds the course
   to the practice-site, promo, and reviews-campaign registries (idempotent). This is
   the step that was missed for Agentforce/CCDV-F.
3. `node scripts/build-practice-site.js --all` → deploy to aseemmankotia.github.io.
4. `node scripts/promo-all.js --slug=<slug> && node scripts/promo-all.js --upload` —
   render (if needed) + upload the YouTube Short.

## Compliance (reviews campaign)

- Never fake accounts/reviews; never incentivize *positive* ratings — only invite
  HONEST reviews. Educational announcements lead with teaching value, review ask is
  a soft footer. Max 4 announcements/month per course.
