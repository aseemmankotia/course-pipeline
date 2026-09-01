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
   HARDENED 2026-08-02 (AIPMM CPM+CDPM builds): the generator kept writing a well-meaning
   disclaimer "…does not guarantee a passing score", and the blunt /guarantee/i check in
   BOTH qa-course.js and compliance-check.js flagged the literal word even inside a
   negation, hard-blocking clean courses. Fix: (a) the "guarantee" check is now
   NEGATION-AWARE in both scripts — it only trips when NOT preceded by no/not/never/
   without/cannot/n't within ~40 chars, so a disclaimer passes but "we guarantee you
   pass" still fails; (b) generate-course.js now instructs the model to never emit the
   word "guarantee" in ANY form (omit the exam-result claim rather than disclaim it).
   Other promise phrases (pass the / first attempt / 100% pass) remain unconditional.
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

HARDENED 2026-08-03 (video filename collisions): rendered video filenames are now
prefixed with the course's `exam_code` — `<exam-code>-chapter-NN-<title>.mp4`
(e.g. `dea-c01-chapter-12-…`, `ncp-ousd-chapter-12-…`). Courses that share a chapter
title — most often the final `chapter-12-full-practice-exam-simulation-and-time-
management-strategy` — used to produce BYTE-IDENTICAL filenames, so the Udemy asset
library held several assets with the same title and attach-by-filename grabbed the
wrong course's video (NCP-OUSD got NCA-ADS's ch12; had to remap by upload adjacency).
The prefix makes every filename globally unique end-to-end. Fixed in TWO places that
both name videos: `scripts/generate-course.js` sets `output_filename` (what
autopilot.js's inline salvage reads) and `scripts/collect-videos.js` (manual runs) —
both derive the prefix from the config's `exam_code` (fallback slug). The constant
prefix preserves chapter sort order, so make-shell-spec still lists ch01→ch12
correctly. Courses rendered BEFORE this change keep their old unprefixed names (no
re-render needed); attach those by upload-adjacency if a ch12 collision appears.

### Audio-aligned slide timing (fixes "narration doesn't match the slides")

HARDENED 2026-08-04 (student feedback: audio drifts out of sync with the slides).
ROOT CAUSE: slides and narration were timed independently. `distributeTimings()`
in `render/course-render.js` sized each slide by an AI-*guessed* `duration_seconds`
scaled to fill the chapter's total audio length — the guess had NO relationship to
WHERE in the narration that slide's topic is actually spoken, so slides drifted
(worse toward the chapter end), and the fixed title/summary/quiz cards (5/8/8s)
stole time the voice never paused for. There was literally no data linking "when
spoken" to "when shown."

FIX — flip each slide the instant the narrator reaches it, using real spoken
timestamps (no re-synthesis, one natural audio track):
- `tts-generate.js` now STREAMS edge-tts and captures `WordBoundary` events (an
  exact timestamp per spoken word) into a sidecar `heygen-chapter-NN.words.json`
  next to each `heygen-chapter-NN.mp4`. (ElevenLabs has no word boundaries → no
  sidecar → renderer falls back to proportional timing, unchanged.)
- The slide-split step (`splitChapterScript`) now emits a verbatim `cue` on every
  content slide — the first 8–12 words of the script span it covers, copied
  exactly, marching forward through the script.
- `render/slide-timing.js` (new, pure + unit-tested) locates each cue in the
  word-timing stream (monotonic; tolerant of case/punctuation; interpolates any
  unmatched cue; reserves the tail for summary/quiz) and returns per-slide
  durations that sum to the audio length. The renderer uses this when the sidecar
  is present AND ≥60% of cues match; otherwise it FALLS BACK to the old
  `distributeTimings` — so a render is never worse than before.
- Cache invalidation: a `sections-cache.json` whose content slides lack `cue`
  (i.e. split before this fix) is treated as stale and re-split, so re-renders
  automatically earn cues.
- tts-generate SKIP logic now also requires the `.words.json` sidecar for edge
  courses: if `heygen-chapter-NN.mp4` exists but the sidecar is missing, it
  regenerates the audio+sidecar together (keeps audio↔timings consistent).

REMEDIATION is automated + tracked by `scripts/remediate.js` (runs on the Mac —
sandbox can't render). It stages → tts-generate (regenerates audio + `.words.json`)
→ render:all (re-splits for cues → audio-aligned slides) → collect-videos with a
`-<revTag>` marker, and records every course's status in
`remediation/remediation-log.json`.
```
npm run remediate:list       # show target courses (no work)
npm run remediate            # remediate every "waiting to publish" course, checkpointed
npm run remediate:status     # print the tracking table
node scripts/remediate.js --only=<slug>        # one course
node scripts/remediate.js --include-live       # PASS 2: also all published courses (+refreshes)
node scripts/remediate.js --rev=2              # bump the revision tag
```
Target set (default) = stageable (has `generated/<slug>/course-render-input-*.json`)
AND not registered live in build-practice-site.js AND not a `*-refresh-*` build.
`--include-live` is the later pass over already-published courses.

REV NAMING: remediated videos land in `exports/<slug>/videos-<revTag>/` named
`<exam-code>-chapter-NN-<title>-<revTag>.mp4` (e.g. `dea-c01-chapter-03-…-rev1.mp4`).
The `-revN` suffix is deliberate: it makes the fixed videos identifiable AND stores
them as NEW assets in Udemy's library, so attach-by-filename REPLACES the stale
originals instead of re-grabbing the old same-named asset. Re-attach path (per
course, from the log's `videos` list): upload the `videos-<revTag>/*.mp4` set, then
POST each new asset to its lecture (`type:'main'`) via the instructor API / Chrome,
and set `reattached:true` in the log.

No content regeneration is needed (no new questions/descriptions/cards) — only the
video track changes. Watch the render log for `Audio-aligned timing: M/N slide cues
matched`; a `using proportional timing` line (recorded as
`proportionalFallbackChapters` in the log) means the sidecar was missing or match
confidence was low — investigate that chapter before re-uploading.

Manual single-course equivalent (if not using remediate.js):
```
node scripts/stage-course.js   --slug=<slug>
node scripts/tts-generate.js   --slug=<slug>
npm run render:all
node scripts/collect-videos.js --slug=<slug> --rev=rev1
rm -rf render/chapters          # only AFTER collect + upload
```

GOTCHA (learned 2026-08-05, first rev1 pass): edge-tts >= 7.x added a keyword-only
`boundary` arg that DEFAULTS to `"SentenceBoundary"`. `Communicate(text, voice, rate)`
therefore streams ZERO WordBoundary events → the `.words.json` sidecar comes out
empty (`[]`, 2 bytes) → every chapter logs "word timings present but alignment not
confident" and falls back to proportional timing (i.e. NOT fixed). tts-generate.js
now passes `boundary='WordBoundary'` explicitly (with a TypeError fallback for
< 7.x). Verify after a render that `.words.json` sidecars are NON-empty and the
render log shows `Audio-aligned timing: M/N` with a high M — an all-`⚠fallback`
status table means the sidecars were empty again. The `size > 2` freshness check in
tts-generate auto-regenerates empty sidecars on the next run.

THROTTLING (learned 2026-08-06, rev1 re-render): a full remediation pass synthesizes
100+ chapters back-to-back, and Microsoft's free edge-tts endpoint rate-limits after
~60 — the trailing courses (alphabetically last, e.g. all four nvidia-* ) failed
`tts-generate` fast with connection errors and NO retry, aborting the whole course.
tts-generate.js now retries each chapter up to 4× with backoff (8/25/60s) + a small
inter-chapter gap, so a throttle window just pauses instead of failing. If a course
still fails, re-run it alone (`node scripts/remediate.js --only=<slug>`) after a
minute — `error` courses are retried automatically on the next `npm run remediate`
(only `collected` courses skip).

HANG (learned 2026-08-06): throttling doesn't always ERROR — sometimes edge-tts
STALLS with the connection held open, and `spawnSync` (no timeout) blocked forever
mid-chapter, so the retry never fired (looked "stuck" on e.g. ch9). Fixed with 3
layered guards in ttsEdge: `receive_timeout=EDGE_STALL_S` (default 45s — a stall
RAISES), an `asyncio.wait_for(..., EDGE_CAP_S)` hard cap (default 300s), and a
`spawnSync` timeout backstop (CAP+30s, SIGKILL). Any of them converts a hang into a
retryable throw. Tunable via `EDGE_STALL_S` / `EDGE_CAP_S` in `.env`. If a run looks
stuck now, it will self-abort within ~45s and retry instead.

- One-time: `pip3 install edge-tts` (free narration engine). `--engine=elevenlabs`
  is the paid alternative.
- tts-generate keeps an ownership manifest and quarantines heygen-chapter files
  from other courses, so stale narration can't silently leak between courses —
  but still `rm -rf render/chapters` between courses for clean slides.
- Upload the resulting `chapter-NN-final.mp4` files to Udemy via the course's
  Bulk Uploader, THEN build/attach the curriculum from the library.

### Logo branding in course videos (opt-in per course — added 2026-08-13)

The TechNuggets gold-nugget logo now appears in chapter INTRO (title card), OUTRO
(chapter-complete card), and content-slide footers — but it is OPT-IN so re-rendering
an already-published course for A/V remediation does NOT restyle it. Mechanism:
`generate-course.js` writes `brand_logo: CFG.brand_logo !== false` into every render
input it generates (default ON), and `render/course-render.js` gates all logo output on
`BRAND_ENABLED = input.brand_logo === true`. The 38 existing courses' render inputs were
generated BEFORE this flag, so they have no `brand_logo` field → renderer treats it as
false → they stay text-only (their pre-2026-08-13 look) even through `remediate`/
`parallel:published`, which re-render from the EXISTING staged inputs and never
regenerate them. Only NEWLY generated courses (the two new PDE/DP-600 builds + AB-900 +
everything going forward) carry `brand_logo:true` and show the logo. Older courses get the
new branding on their LANDING PAGES only (build-practice-site.js brands every page for all
courses — cheap + consistent). To opt an old course into video branding, add
`"brand_logo": true` to its config and regenerate (or add the field to its render inputs)
then re-render. Logo assets are embedded as base64 data URIs from `brand/png/…` so each
slide HTML stays self-contained. Disabled output is byte-identical to the pre-branding
renderer (verified via conditional call sites, not unconditional edits).

## Parallel processing — `npm run parallel` (many courses at once, collision-free)

Added 2026-08-06. `scripts/pipeline-parallel.js` runs GENERATE or REMEDIATE for
many courses concurrently. The pipeline scripts root every shared scratch path at
the repo dir (staged `course-render-input-N.json`, root `heygen-chapter-NN.mp4` +
`.words.json`, `render/chapters/`), so two courses in the same repo would clobber
each other — which is why it always ran one at a time.

ISOLATION (`scripts/pipeline-worker.js`): each course runs in its OWN dir under
`.workers/<slug>/` that copies the code (scripts/ + render/*.js, ~600 KB) and
symlinks the big/shared, per-slug-namespaced dirs (`node_modules`, `generated`,
`exports`, `course-configs`, `.env`). Because the scripts run unchanged with
`__dirname` inside the worker, ROOT resolves to the worker — staged inputs, the
narration tracks and `render/chapters/` are all per-worker, while each course only
ever writes its own `generated/<slug>` and `exports/<slug>` subtree through the
symlinks. NO edit to the 86 KB renderer. Teardown unlinks the symlinks first, so it
can never recurse into the real node_modules/generated/exports (verified).

The one global hazard — autopilot's `pkill -f chrome-headless-shell` — is skipped
when `PIPELINE_PARALLEL=1` (set by the orchestrator) so workers don't kill each
other's render Chrome.

ENV INJECTION (fixed 2026-08-07): the orchestrator now loads the repo `.env` and
merges it into every worker's environment (`{...process.env, ...DOTENV, …}`).
Before this, parallel GENERATE could fail fast with a fatal auth/credit error even
though `.env` was correct — workers only inherited the shell's `process.env`, and
`ai-client-node.js` reads keys straight from `process.env` while `generate-course.js`
prefers `process.env` over the on-disk `.env`. This env gap was real hygiene, but the actual `parallel:generate` failure was the
one below.

MISSING prompts/ IN WORKER (fixed 2026-08-07 — the real cause): `generate-course.js`
reads `prompts/certification-course-prompt.md`, but the worker copy-list only had
scripts/render code + package.json, so the worker had NO `prompts/` dir → every
generate died at module load with `ENOENT … /prompts/certification-course-prompt.md`
(leaving only an empty `generated/<slug>/heygen/`). It ONLY affected the worker path,
never a direct `node scripts/generate-course.js` run in the full repo — which is why
it looked concurrency-related ("works direct, fails parallel"). Fix: `prompts` added
to `SYMLINK_SHARED` in pipeline-worker.js (read-only reference, symlinked like
course-configs). If a NEW repo-relative reference dir is ever added and read by a
pipeline stage, add it to SYMLINK_SHARED too — the worker only has scripts/, render
code, package.json, plus the symlinked node_modules/generated/exports/course-configs/
marketing/prompts/.env. Generation is API-heavy but generate-course retries 429/5xx,
so moderate `--jobs` is fine; lower it only if the provider rate-limits hard.

WORKER REUSE (fixed 2026-08-07): a failed worker is kept for inspection, and a
re-run REUSES it to resume from checkpoint (e.g. IAPP had 8/10 narration tracks
done). `create()` now REPAIRS a reused worker — re-links any missing shared symlink
(a partial teardown had dropped `node_modules`) and re-makes scratch dirs — and
`verify()` no longer flags the worker's own staged `course-render-input-*.json` /
`heygen-chapter-*.mp4` as "stray" (they're legitimate per-worker scratch). Before
this, resuming a kept worker died instantly with "isolation check failed".

```
npm run parallel:remediate -- --jobs=2                 # remediate the waiting set, 2 at a time
npm run parallel:published                             # PASS 2: remediate the LIVE/published courses, 3 at a time
npm run parallel:generate  -- --jobs=2 --only=slugA,slugB
node scripts/pipeline-parallel.js --mode=remediate --list       # show targets
node scripts/pipeline-parallel.js --mode=remediate --dry-run     # print commands only
node scripts/pipeline-parallel.js --mode=remediate --jobs=3 --rev=rev2 --keep-workers
```

`--published` targets ONLY courses registered live in build-practice-site.js that
are stageable and NOT already remediated for this `--rev` (skips the ones already
done). Add `--include-refresh` to also pull in the `*-refresh-*` builds. `npm run
parallel:published` is the Pass-2 sweep over already-published courses that still
have the pre-2026-08-04 timing drift; after each finishes, upload its
`videos-<rev>/` set and re-attach the LIVE lectures (they carry the old drifted
videos), replacing them.
Each course's whole command is retried on failure (`--retries`, default 1); the
underlying stage/tts/render steps are checkpointed so a retry RESUMES. The
orchestrator is the SOLE writer of `remediation/parallel-<mode>-log.json`, so
parallel workers never corrupt it. A failed worker is kept under `.workers/` for
inspection; successful ones are auto-removed (`--keep-workers` to keep all).
`.workers/` is git-ignored.

THROTTLE: the edge-tts stage is network-bound and Microsoft rate-limits sustained
use — higher `--jobs` multiplies the request rate. tts-generate retries with
backoff, but keep `--jobs` at 2–3 for the free engine; the CPU-bound render is what
benefits most from parallelism. ElevenLabs (paid) has no such limit.

## End-to-end build — `npm run autopilot` (one command, self-healing)

`scripts/autopilot.js` runs the whole content pipeline for each config, checkpointed
(re-runs skip finished work). Enhanced 2026-07-30 to close the gaps that caused
this session's misses:

```
npm run autopilot -- --only=<slug>          # one course, end to end
npm run autopilot                            # every config in course-configs/
npm run autopilot -- --only=<slug> --skip=render   # e.g. skip a heavy stage
```

Per course it does: generate → deterministic heal (**unwrap nested questions** +
domain tags + answer balance)
→ **QA HARD gate with a self-heal loop** (if QA blocks, it runs normalize-questions
+ fix-multiselect + expand-short-chapter + fix-qa-warnings + re-balance + re-assemble
and re-checks, up to 2×, before failing)
→ **text-free card** (`make-card.py`) → **practice-test CSVs** (`make-practice-test-csvs.py --slug`,
slug-named) → **compliance HARD gate** (`compliance-check.js`: verbatim disclosure
top-line + no promise language in description OR goals + text-free card) → TTS
narration **with a completeness retry** (asserts N/N `heygen-chapter-NN.mp4`, retries
gaps — fixes the AI-300 ch 4/9/10/11 drop) → stage → render → **salvage each final
into `exports/<slug>/videos/` before any cleanup** (never lose videos to `rm -rf`) →
promo + 9:16 Short → **`shell-spec.json`**. Result: `exports/<slug>/` with videos/,
card, CSVs, promo, shell-spec, qa-report — a compliant, upload-ready package.

HARDENED 2026-08-02 (`scripts/normalize-questions.js`, new): the generator sometimes
emits a practice question as an array-wrapped object `[{question,options,…}]` (or a
multi-item `[{…},{…}]`) instead of a bare object. QA then reports "question with !=4
options / bad correct_index" and NO prior healer fixed it, so the run hard-blocked
(AIPMM CDPM, test-1 Analytics domain). normalize-questions.js deterministically
flattens any array-wrapped questions back into their parent pool across chapter
quizzes, material banks, and both practice tests — no model call, idempotent, backs up
state.json. It runs in BOTH the pre-QA deterministic heal and the deep self-heal loop.

HARDENED 2026-08-03 (`scripts/normalize-questions.js`, dedupe pass added): a second
structural defect surfaced on the NVIDIA NCA-ADS build — the generator appended the
correct answer a SECOND time as a 5th option and set correct_index=4, giving
options=[A,B,C,D,D'] (QA: "!=4 options / bad correct_index", and the answer-balance
check showed a phantom 5th "E" bucket as `NaN%`). No prior healer fixed it (not
array-wrapping, not multi-select). normalize-questions.js now runs a per-question
dedupe AFTER the unwrap pass: if a question has >4 options and dropping EXACT-duplicate
strings leaves exactly 4, it keeps the 4 uniques and remaps correct_index to the
surviving identical option (only acts when the result is unambiguously 4; otherwise
leaves it for QA). Deterministic, no model call. This fixed NCA-ADS with a re-balance +
re-assemble and no regeneration.

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

## Marketing — email + WhatsApp digest (consent-first)

Added 2026-08-10. A consent-first advertising pipeline that emails opted-in
subscribers a "new + popular courses" digest every 3 days, with website
subscribe/unsubscribe. Full runbook: `marketing/email/README.md`.

- Source of truth for courses is now shared: `scripts/build-practice-site.js`
  wraps its build in `if (require.main === module)` and `module.exports = {COURSES, SITE_URL}`,
  so `build-campaign.js` / `send-whatsapp.js` reuse the SAME registry (no drift).
  Running the file directly still builds the site; requiring it just returns data.
- Subscriber DB: `marketing/email/subscribers.json` via `marketing/email/store.js`
  (consent record + unsubscribe token per subscriber; ships empty). Manage with
  `node scripts/subscribers.js {add|import|unsubscribe|list|stats|export}`.
  ONLY import lists with documented opt-in (`--consent=owned_list_import`) — never
  scraped/purchased (GDPR top-tier fines; WhatsApp bans).
- Website form + unsubscribe: self-hosted zero-dep service `marketing/email/server.js`
  (`POST /subscribe`, `GET/POST /unsubscribe` — the POST path is RFC 8058 one-click).
  The static site's subscribe form posts to `SUBSCRIBE_ENDPOINT` (bake it in at build:
  `SUBSCRIBE_ENDPOINT=https://host/subscribe node scripts/build-practice-site.js --all`).
- Digest: `npm run campaign:build` → `npm run campaign:send` (DRY RUN default, writes
  personalized copies to `marketing/email/outbox/`) → `campaign:send:live` to send.
  Providers via `.env` EMAIL_PROVIDER=resend|smtp. Send REFUSES to go live without
  `PHYSICAL_ADDRESS` + `UNSUBSCRIBE_BASE_URL` (CAN-SPAM / one-click compliance); every
  message adds `List-Unsubscribe` + `List-Unsubscribe-Post` headers. Cron the 3-day
  cadence on the Mac (see README).
- WhatsApp: `scripts/send-whatsapp.js` is a SCAFFOLD, hard-gated off. It only targets
  opted-in `channels.whatsapp` subscribers and sends a Meta-APPROVED template; going
  live needs `WHATSAPP_ENABLED=true` + verified business + approved template. Dry run
  prints the exact Cloud API payload.
- New `.env` keys documented in `.env.example` (EMAIL_/SMTP_/WHATSAPP_/SUBSCRIBE_ENDPOINT).
- Domain DNS (Porkbun): `scripts/setup-dns.js` applies email-auth (SPF/DKIM/DMARC)
  and optional GitHub-Pages site records for `MARKETING_DOMAIN` via the Porkbun API.
  `npm run dns:plan` (dry run — auth-check + diff, writes nothing) → `npm run dns:apply`
  (`-- --site` to also point the site at the domain, `-- --replace` to update drifted
  records). Records live in `marketing/email/dns-records.json`; any value still
  containing `REPLACE_` is skipped until you paste the real DKIM/SPF from the provider.
  Keys: PORKBUN_API_KEY / PORKBUN_SECRET_API_KEY in .env (enable per-domain API access).

## Course image uniqueness (Udemy review — learned 2026-08-13)
Udemy REJECTS a course whose card image looks like another course's ("we've found
learners often differentiate between courses based primarily on this image, Udemy
requires that each course image be unique"). AB-730 and AB-731 were both bounced
"Needs fixes" for exactly this: `make-card.py` picked the accent purely from
`exam_vendor`, so every Microsoft course got the SAME blue + same abstract style →
visually identical cards. FIX (in make-card.py): when no explicit `--color` is given,
the vendor base color's HUE is now rotated deterministically per slug (~±0.43 of the
wheel), so same-vendor courses get clearly distinct cards automatically. Override still
available: `python3 scripts/make-card.py --slug=<slug> --color=#RRGGBB`. If a pair still
looks close, pass distinct `--color` values. Re-upload the new card, click "Mark as
fixed" on the feedback item, and resubmit.

## Practice-site rebrand + domain move (2026-08-14) — NEW DESIGN IS NOW THE DEFAULT
`scripts/build-practice-site.js` is the single source of truth for the website and has
been rebranded around the TechNuggets amber system; every run regenerates `site/` to
match, so this is the design going forward (no manual site edits — `fs.rmSync(OUT)` wipes
`site/` each run). Key facts:
- `SITE_URL = https://technuggets.academy` (was aseemmankotia.github.io). The generator
  writes a `CNAME` file (technuggets.academy) next to robots.txt, and all canonical/og
  URLs use the new domain. `aseemmankotia.github.io` is now only a stale publish TARGET.
- The `const CSS` block is the amber token system (warm neutrals `--bg #FCFAF6` /
  `--line #E7E3DA`, amber `#F59E0B` CTAs, ink-navy text, Inter font). It keeps EVERY class
  the generator emits, and retains legacy compat vars (`--acc --cta --cta-h --txt --dim
  --vendor`) because pages contain inline `style="var(--acc)"` and per-vendor
  `<style>:root{--vendor:#RRGGBB}</style>` — do not delete them. The hero is LIGHT amber
  (not dark navy); `.btn.ghost` is solid ink-navy and `.urgency` is ember `#7C2D12` to be
  visible on it — revert those together if the hero ever goes dark again.
- Logos are placed via CSS only (`.hero::after`, `.cta::after` watermarks, `footer::before`
  32px mark) so they survive regeneration; this REQUIRES `icon.svg` in the published root.
  `copyBrand()` copies `technuggets-icon.svg→icon.svg`, both horizontal SVG lockups, and
  `png/og-image.png→og-image.png` (1200×630 social card) into `site/`.
- `head()` emits an SVG favicon, `theme-color #F59E0B`, `og:site_name/og:url`, `og:image`
  = og-image.png, and twitter card/image. `brandbar()` logo box is `height="50"` (logo is
  600×150, 4:1 — the old 34 caused layout shift).
- Verified generator run = **176 pages, 0 broken links, 0 missing assets, 0 stale-domain
  refs, 176/176 amber theme-color**. Rollback: `new-website/build-practice-site.js.ORIGINAL.bak`.
- PUBLISH ORDER (Mac): set DNS first (apex A → 185.199.108-111.153; `www` CNAME →
  aseemmankotia.github.io; repo Settings→Pages custom domain → technuggets.academy + HTTPS),
  THEN rsync `site/`→ the pages repo and push. The `CNAME` redirects the old github.io host,
  so the domain must resolve before publishing or the site goes dark.
- Handoff docs + assets: `new-website/` (README, generator.patch, style.css, LINK-AUDIT.md).

### WEBSITE PUBLISH TARGET — `~/tna-site` (settled 2026-08-28)
The live GitHub Pages clone is **`/Users/macbookpro/tna-site`** (remote
`github.com/aseemmankotia/aseemmankotia.github.io`, `CNAME` = technuggets.academy).
Use ONLY this directory to publish. Three look-alikes exist and cost a session to
untangle — do not rsync into any of them:
- `/Users/macbookpro/pages-repo` — a SECOND clone of the same repo, stale (last commit
  2026-08-23). Delete it; if it lingers, never publish from it.
- `/Users/macbookpro/aseemmankotia.github.io` — NOT a git repo, just a bare directory
  named after the repo. `git pull` there fails with "not a git repository" while a
  chained `rsync --delete` still silently overwrites it. Safe to `rm -rf`.
- `~/course-pipeline/site/` — generator OUTPUT, wiped by `fs.rmSync(OUT)` every build.
  Never edit by hand, never treat as the repo.

BUILD THEN PUBLISH (both steps on the Mac):
```
cd ~/course-pipeline
SUBSCRIBE_ENDPOINT=https://technuggets-subscribe.technuggets.workers.dev/subscribe \
  node scripts/build-practice-site.js --all
grep -c technuggets-subscribe site/index.html      # MUST be > 0 (see gotcha below)

cd ~/tna-site && git pull
rsync -a --delete --exclude '.git' --exclude '_to_delete' --exclude '_backup' \
  ~/course-pipeline/site/ .
git status                                         # review before committing
git add -A && git commit -m "…" && git push
```
GOTCHA — `build-practice-site.js` reads `process.env.SUBSCRIBE_ENDPOINT` and does NOT
load `.env`, so a plain `node scripts/build-practice-site.js --all` builds a site with
NO subscribe form (falls back to the `REPLACE-WITH-YOUR-HOST` placeholder, and
`SUBSCRIBE_READY` goes false). Deploying that silently strips the working signup form
off the live site. Always pass the env var inline and verify with the grep above.
NOTE: interactive zsh does not treat `#` as a comment — trailing `# comments` on a
command line become arguments (that grep will error on them).
DNS is already live, so the DNS-first step above only applies to a domain change.

### YouTube upload OAuth — BROKEN, in progress (2026-08-28)
`scripts/upload-short.js` + `youtube-auth.js` need TWO gitignored files in the repo root
(`.gitignore` lines 37-38), so they are local-only and were LOST on this machine:
`client_secrets.json` and `youtube-token.json`. Neither exists. Consequence:
`promo-all.js --slug=<slug> --upload` dies with ENOENT before uploading anything.

What we found, in order (do not re-derive):
1. `.env`'s `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` are DEAD — the Google Cloud
   OAuth client was deleted (`Error 401: deleted_client`). Rebuilding client_secrets.json
   from `.env` does NOT work. A NEW OAuth client must be created.
2. A new `client_secrets.json` was created and chmod 600'd. Use application type
   **Desktop app** (loopback redirects work without registering a redirect URI).
   Still TODO: enable YouTube Data API v3 + Sheets API, add the account under Test users,
   and update `.env` to the new client id/secret so the two don't drift.
3. BLOCKED HERE: `node youtube-auth.js` fails with `EADDRINUSE 127.0.0.1:8080`. A stale
   `node youtube-auth.js` (PID 13282, started 23:07) holds the port and survived both
   `kill` and `kill -9`. Next step: check its parent (`ps -o ppid= -p <pid>`) for a
   respawner, or just reboot; alternatively change `REDIRECT_URI`/port at
   `youtube-auth.js:30` (a Desktop client accepts ANY loopback port, so no console change
   is needed). Then `node youtube-auth.js` → verify `youtube-token.json` exists → re-run
   the upload. Run auth and upload as SEPARATE commands; chaining them uploads before the
   token exists.
4. GOTCHA to set once it works: if the OAuth consent screen stays in **Testing**, Google
   expires refresh tokens after 7 DAYS and uploads break weekly. Set it to **In
   production** (single-user app publishes without verification; one "unverified app"
   warning at consent).

Pending uploads once fixed: `oracle-oci-ai-foundations-1z0-1122-2026` and
`databricks-ml-associate-2026` (promo Shorts already rendered in
`exports/<slug>/welcome-promo-short.mp4`). Uploads default to UNLISTED; flip with
`node scripts/upload-short.js --publish=<videoId>`.

### Newsletter subscriber count — check BREVO, not subscribers.json
With `EMAIL_PROVIDER=brevo` (current default) signups go straight into Brevo list 5;
`marketing/email/subscribers.json` is only used by the legacy smtp/resend path, so
`node scripts/subscribers.js stats` reads ~1 (a self-test row) and is NOT a signal —
do not report it as "0 subscribers". Real count: Brevo dashboard → Contacts → list 5.
Also, `api.brevo.com` is NOT in the Linux sandbox's DNS allowlist, so any Brevo call
from a sandboxed session fails with `EAI_AGAIN` and send-campaign prints
`list 5 (?(fetch failed) contacts)`. That is a sandbox artifact, not a bad API key —
it works from the Mac. The Cloudflare subscribe Worker is deployed and healthy
(`GET /health` → 200 at technuggets-subscribe.technuggets.workers.dev).

## Course-card logo branding (added 2026-08-14)
`make-card.py` now composites the TechNuggets gold-nugget logo (dark-bg horizontal
lockup from `brand/png/technuggets-logo-horizontal-dark-*.png`) onto every card,
centered on a subtle translucent panel near the top. This is Udemy-compliant: a LOGO is
the sole allowed exception to the "no text on course images" rule (rule 2 above), so the
wordmark is fine — do NOT add any other text. Default ON; pass `--no-logo` to disable.
Filename stays `<slug>-card-notext.png` (pipeline/shell-spec references unchanged). Older
published courses keep their pre-2026-08-14 unbranded cards unless regenerated; new + any
regenerated courses get the logo automatically.

## Website newsletter — Brevo-native subscribe + auto-publish (added 2026-08-15)
The static site (GitHub Pages) can't hold an API key, so the subscribe flow is now
Brevo-native and serverless. `EMAIL_PROVIDER=brevo` is the default. Pieces:
- `marketing/email/brevo.js` — zero-dep Brevo API helper (contacts + campaigns + list
  bootstrap); single `api-key` header; uses global fetch (Node 18+) else node-fetch.
- `marketing/email/subscribe-worker/` — Cloudflare Worker (`worker.js` + `wrangler.toml` +
  README). The website subscribe form POSTs here; the Worker holds `BREVO_API_KEY` as a
  Worker SECRET and calls Brevo Contacts API (single opt-in, `updateEnabled:true` so it's
  idempotent). CORS locked to `ALLOWED_ORIGINS`; a hidden `company` honeypot drops bots.
  Deploy: `wrangler deploy` + `wrangler secret put BREVO_API_KEY`; set `BREVO_LIST_ID` in
  wrangler.toml `[vars]`.
- `scripts/brevo-setup.js` (`npm run brevo:setup`) — validates the key, checks that
  `EMAIL_FROM` is a VERIFIED Brevo sender (campaigns fail otherwise — verify the domain
  SPF/DKIM you already applied via Porkbun), creates/finds the "TechNuggets Newsletter"
  list, and prints the numeric `BREVO_LIST_ID` to paste into `.env` + wrangler.toml.
- `scripts/send-campaign.js` — added an `EMAIL_PROVIDER=brevo` path: instead of
  per-recipient SMTP/Resend from subscribers.json, it creates + sends ONE Brevo *campaign*
  to `BREVO_LIST_ID`. `toBrevoHtml()` rewrites our placeholders to Brevo merge tags
  (`{{ contact.FIRSTNAME | default : "there" }}`, `{{ unsubscribe }}`, `{{ contact.EMAIL }}`)
  and injects the static `PHYSICAL_ADDRESS`; Brevo owns unsubscribe + suppression. DRY RUN
  by default (renders the campaign HTML to `outbox/`); `--live` creates+sends. Live refuses
  without `BREVO_API_KEY`+`BREVO_LIST_ID`+`EMAIL_FROM`+`PHYSICAL_ADDRESS`. The old
  resend/smtp per-recipient path (and `store.js`/`server.js`) is untouched for that mode.
- `scripts/announce-course.js` (`npm run announce -- --slug=<slug> [--live] [--force]`) —
  builds a single-course "just launched" email (same placeholders, so any provider works)
  into `campaigns/<date>-launch-<slug>.*` and hands it to send-campaign.js. Deduped per slug
  via `marketing/email/announced.json` — a course is never blasted to the list twice unless
  `--force`. DRY RUN by default; `--live` sends.
- `scripts/register-course.js` — now auto-fires `announce-course.js` after registering a
  course: DRY RUN by default (safe against register re-runs), `--announce-live` to send
  hands-off, `--no-announce` to skip. Dedupe makes even repeated `--announce-live` safe.
- `scripts/build-practice-site.js` — the subscribe `<section>` renders only when
  `SUBSCRIBE_ENDPOINT` is set to the real Worker URL at build time (bake it in:
  `SUBSCRIBE_ENDPOINT=https://<worker>/subscribe node scripts/build-practice-site.js --all`).
  Form now includes the hidden `company` honeypot and posts `{email,name,company}`.
- `.env`/`.env.example`: `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `BREVO_LIST_ID`,
  `BREVO_LIST_NAME`. `.env` already had Brevo SMTP relay configured (smtp-relay.brevo.com)
  for the legacy smtp path; the API key is what the new path needs.
ONE-TIME BRINGUP ORDER: `npm run brevo:setup` → paste `BREVO_LIST_ID` → deploy Worker
(secret + var) → rebuild site with `SUBSCRIBE_ENDPOINT` → `npm run campaign:build && npm run
campaign:send` (dry run) to sanity-check, then `campaign:send:live`. Two triggers now exist:
per-course launch (register-course auto-announce) + the recurring 3-day digest (unchanged
`build-campaign.js`; cron in `marketing/email/README.md`).

## Course-card logo REJECTED by review — root cause + fix (2026-08-16)
Google PCA (7301139) + Terraform 004 (7301147) both bounced "Needs fixes: Course Image …
eliminate text." Per Udemy's Course Image Quality Standards, logos ARE allowed — the
rejection was HOW make-card.py composited it: a centered wordmark on a translucent rounded
PANEL, OVERLAID on the busy abstract motif. That violates two written rules: "Logos should
not overlay the photo or make the layout muddy" and "adequate negative space … do NOT add
any frames, borders, strokes or letterboxing" (the translucent panel = a box/letterbox).
FIX (make-card.py): logo is OFF BY DEFAULT in make-card.py — gated on an opt-in `--logo`
flag (was opt-out `--no-logo`). No flag → pure text-free abstract card. UPDATE 2026-08-25:
the `--logo` output was reworked to the COMPLIANT form Udemy allows — a small wordmark in the
TOP-LEFT corner with real negative space and NO panel/box/letterbox (a logo is the sole
allowed exception to the no-text rule). autopilot.js NOW PASSES `--logo` (scripts/autopilot.js
step 3.5), so every generated card — direct autopilot AND `parallel:generate` (which runs
`autopilot.js --only=<slug>`) — ships the corner logo automatically. Older cards generated
before this stay logo-less until regenerated. To fix a bounced card, first re-run WITH the
logo: `python3 scripts/make-card.py --slug=<slug> --logo` → re-upload `-card-notext.png` →
"Mark as fixed" → resubmit. ONLY IF Udemy still flags the image for text should you fall back
to no `--logo` (pure text-free). NOTE: in-VIDEO logo branding (intro/outro/footers) is
UNAFFECTED — Udemy only flags the static card image, not the video frames.

## Practice-test loading — automated API step (added 2026-08-21)

Practice tests are now loaded into Udemy **via the instructor API**, not by hand and NOT
by the video Bulk Uploader (that only handles videos — the practice-test CSVs never went
in that way, which is why early courses shipped without them). New pipeline step:

```
node scripts/load-practice-tests.js --slug=<slug> --course=<udemyCourseId>   # create+fill+publish
node scripts/load-practice-tests.js --slug=<slug> --course=<id> --dry-run     # plan only
npm run pt:load -- --slug=<slug> --course=<id>
```

Driven entirely by `exports/<slug>/shell-spec.json` (`practiceTests[]` gives title/
durationMin/passPercent/csv; `courseId` is persisted back on first run). Idempotent:
skips already-complete tests, cleans partials, writes `exports/<slug>/practice-tests-log.json`.
Runs in **Phase B** after the shell exists and you have its numeric course id
(autopilot now prints it as step 1b). Auth = `UDEMY_COOKIE` in `.env` (capture per
`scripts/udemy/README.md`; lasts ~weeks, re-capture on an AUTH FAILED error).

Code: `scripts/udemy/client.js` (auth + request helper) and `scripts/udemy/practice-tests.js`
(CSV→assessment + `loadCourseTests`). Both validated live 2026-08-21 (536 questions across
8 courses). HARD-WON API DETAILS baked in — do not "simplify":
- Create quiz: `POST /api-2.0/courses/{cid}/quizzes/` `{title,type:'practice-test',
  description,duration,pass_percent}`. **It returns is_published:true**, which BLOCKS adding
  questions ("You can only create assessments for drafts of practice tests"). Must PATCH
  `is_published:false` before inserting, then PATCH `is_published:true` to publish.
- Add question: `POST /api-2.0/quizzes/{qid}/assessments/` with
  `{assessment_type:'multiple-choice'|'multiple-select', question_plain,
  correct_response:['a'|'b'|..]  // a LETTER, not an index/text,
  prompt:{question:'<p>..</p>', answers:['<p>..</p>'], feedbacks:['<p>..</p>'],
  relatedLectureIds:[], links:[]}}`. Answers/feedbacks are HTML-wrapped; `&<>` escaped.
- Publish/list: `PATCH`/`GET /api-2.0/courses/{cid}/quizzes/`.
- Udemy caps a regular course at **2 practice tests**; DELETE is **eventually consistent**
  (count lags ~1–2 s), so the loader deletes, WAITS for the count to drop, then creates
  (re-checking the cap) — otherwise creates 400 with "maximum of 2 practice tests".

This is the first API-only step of a broader hands-off Udemy publish path (client/auth +
practice-tests already validated; course-create/upload/submit modules drafted in the
separate `udemy-autopublish` project pending review). `.env.example` gained `UDEMY_COOKIE`/
`UDEMY_BASE`.

## Lit-star logo (2026-08-21)
The 4-point star in the nugget mark is now rendered as an EMITTING LIGHT rather than
flat `#FFFFFF`. Implemented purely as colour/gradient changes in the SVG sources — the
geometry (hexagon points, star path) is unchanged, so every existing layout still fits.
Three gradients do the work: `tnHex` (hexagon lit from centre, #FDE68A→#FBBF24→#D97706),
`tnBloom` (white→warm halo, alpha to 0) and `tnStar` (white-hot core → #FFD97A tips),
plus a `feGaussianBlur` bloom circle behind the star.

SIZE RULE — the bloom does NOT survive small sizes. At 16px the blur swallows the star
and the mark reads as an amber blob. So:
  - `technuggets-icon.svg`   → blur 2.2, bloom r=34. This file doubles as the FAVICON and
    as the large `.hero::after` / `.cta::after` CSS watermark, so it is deliberately
    restrained to stay legible at 16–32px while still reading as lit when scaled up.
  - `technuggets-icon-lit.svg` (new) → blur 6, bloom r=46. Full glow, LARGE DISPLAY ONLY
    (avatars, banners, covers). Do not use as a favicon.
  - `png/technuggets-icon-16.png` and `-32.png` are rendered from the ORIGINAL FLAT mark
    on purpose. Everything ≥48px is rendered from the lit icon. If you regenerate the PNG
    set, preserve that split or the favicon turns to mush.
  - Horizontal lockups use blur 4 / r=40 (they render at ≥600px wide).

`png/og-image.png` was rebuilt at the same time — it now uses the lit lockup AND says
"36 AI & cloud certs" (was a stale "31"). It is the thumbnail for every shared link, so
re-render it whenever the course count changes.

Social art generated from these sources: `png/youtube-banner-2048x1152.png` (content kept
inside YouTube's 1235×338 safe area) and `png/facebook-cover-1640x624.png` (content inside
the centre 1000px so Facebook's mobile crop doesn't cut the tagline).

NOT rolled out to course cards (`make-card.py`) or video renders — those still composite
the pre-2026-08-21 flat lockup. Regenerating cards would mean re-uploading 36 images to
Udemy, so it was deliberately left out of scope.

## Short-form question clips — `make-question-clip.py` (2026-08-21)

Vertical 1080x1920 clips for TikTok / YouTube Shorts / Instagram Reels / Facebook Reels,
rendered from the EXISTING question banks. Do NOT try to repurpose `exports/<slug>/videos/`
for this — those are 1280x720 landscape and ~16 min, so cropping to 9:16 either letterboxes
or crops the slide content out. The question banks are the right source: ~9,800 four-option
questions across 48 courses, each already tagged with its exam domain.

```
python3 scripts/make-question-clip.py --slug=<slug> --list        # show clip-ready candidates
python3 scripts/make-question-clip.py --slug=<slug> --count=5     # render 5
python3 scripts/make-question-clip.py --all --count=1             # 1 per course
node scripts/clip-queue.js next --platform=tiktok --count=3       # what to post next
node scripts/clip-queue.js mark --platform=tiktok --clip='<slug>#45'
node scripts/clip-queue.js status
```

CLIP-READY FILTER: question <=170 chars AND every option <=70 chars, so it stays legible on
a phone. That is only ~9% of the bank (915 of 9,826) — the rest are multi-sentence scenario
questions that do not fit a card. 915 is still 2.5 years at 1/day. Ranking prefers
`commonly_missed: true` questions because they have a real trap and make better hooks.

FORMAT (5 beats, 30s): hook 3s -> question 9s -> countdown 3-2-1 -> reveal 3s -> answer +
`why_correct` 7s -> CTA 5s. The countdown is the engagement mechanic: it makes viewers
comment their guess and rewatch, which are the two strongest ranking signals.

UI SAFE AREA — `SAFE_TOP/SAFE_BOTTOM/SAFE_L/SAFE_R` in the script. Bottom 400px is the
caption+nav band and the right 200px is the like/comment/share rail. ALL content including
the brandmark must stay inside, or it gets covered on at least one of the four platforms.
The brandmark is bottom-LEFT for exactly this reason. Verified by rendering frames and
overlaying the UI zones — re-check this if the layout is ever changed.

COMPLIANCE: `assert_clean()` hard-fails the render (exit 1) if any beat copy contains
guarantee / pass the exam / first attempt / 100% pass. Same rule as course listings and
social posts — never promise an exam outcome. Verified by injecting a banned phrase into a
copy of a state.json and confirming a non-zero exit.

Colour: reuses make-card.py's per-slug hue rotation, so same-vendor courses render visually
distinct clips (CompTIA red rotates to green on one slug, etc).

DEDUPE: `marketing/clips/published.json` keyed `<slug>#<questionIndex>` -> per-platform
record. Dedupe is per (clip, platform), NOT per clip — the whole point is that one render
feeds all four surfaces. `next` also spreads across courses so the feed does not show four
Terraform questions in a row.

SANDBOX NOTE: the sandbox cannot delete inside the mounted repo, so `shutil.rmtree` of the
temp `.frames-*` dirs silently fails there (it works fine on the Mac). If you see stray
`exports/clips/*/.frames-*` dirs after a sandbox run, they are safe to delete.

## TTS + render reliability — chunked edge-tts, pinned interpreter, AI empty-fallback (2026-09-01)

Three failures surfaced building `comptia-pentest-pt0-003-2026` (parallel:generate,
then solo autopilot). All three are fixed in code; symptoms + fixes recorded so the
next occurrence is recognisable.

### 1. edge-tts hangs on the biggest chapter → CHUNK the request (`scripts/tts-generate.js`)
SYMPTOM: `tts narration (free)` stops on one chapter (always the largest — ch3/ch5)
with `edge-tts failed: io.wait_for(synth(), timeout=CAP)` → `TimeoutError`, all 4
retries exhausted; 0 videos. ROOT CAUSE: `ttsEdge` sent the ENTIRE chapter (16 KB+)
as a SINGLE `edge_tts.Communicate` request. Microsoft's free endpoint stalls on large
single requests — the 300s CAP fires (the 45s STALL receive_timeout does NOT catch a
slow-drip stream). The ElevenLabs path already chunked; the edge path did not.
FIX: `ttsEdge` now splits the chapter at sentence boundaries into chunks
≤ `EDGE_CHUNK_CHARS` (.env, default 2400), synthesises each in its own request,
concatenates the MP3 frames, and MERGES the WordBoundary events into one stream with
each chunk's offsets shifted by the running audio length (`base += last_end + gap`) so
the `.words.json` audio-aligned sidecar stays correct and monotonic. Verified: ch3
(16.5 KB) → 8 chunks, all sidecars 127–182 KB non-empty across all 12 chapters.
HARDENED same day: retry is now PER-CHUNK with checkpointing (CHUNK_TRIES=3) — a stalled
chunk retries on its own without discarding the chunks already synthesised; only a chunk
that can't finish fails the chapter (→ the caller's chapter-level retry). A single
throttle stall no longer wastes a whole chapter's work.

### 2. Bare `python3` picks up the wrong interpreter → PINNED resolver + project venv
SYMPTOM: the edge-tts traceback shows an UNRELATED python — e.g.
`/Users/macbookpro/sonia_robosuite_demos/miniconda3/lib/python3.13/...` (conda base
auto-activated) or Homebrew `python@3.14`. edge-tts's aiohttp stack is unstable on
bleeding-edge Pythons (3.13/3.14) → chronic stream stalls even after chunking.
ROOT CAUSE: every script spawned a BARE `python3`, so whatever was first on PATH won.
FIX: `tts-generate.js` and `autopilot.js` resolve a pinned interpreter — prefer
`$PIPELINE_PYTHON`, then `<repo>/.venv/bin/python3`, else bare `python3` (inert until a
`.venv` exists). So cron/scheduled tasks and parallel workers use the project venv even
without activating it. SETUP (Mac): `conda config --set auto_activate_base false` →
`python3.12 -m venv .venv` (use 3.12 — NOT 3.13/3.14) → `pip install edge-tts Pillow`.
`.venv/` is gitignored. Python deps are only edge-tts + Pillow.

### 3. Render dies on offensive-security chapters → Claude empty/refusal now FALLS BACK to Gemini (`render/ai-client-node.js`)
SYMPTOM: render stops at `Step 1 — Splitting chapter script into slide sections` with
`✓ [Claude] slide_splitting: 0 chars` then `No JSON array in split response` (both
attempts). Hit on ch11 "Persistence, Lateral Movement, Pivoting, and Cleanup" — Claude
returns an EMPTY completion (200 OK, zero text / stop_reason refusal) declining to
reformat the attack tradecraft into slides. ROOT CAUSE: `_callAnthropic` returned that
empty string as success, so `callAI` never fell through to Gemini (fallback only fired
on credit/balance 400s). FIX: an empty (`!text.trim()`) or `stop_reason === 'refusal'`
response now returns null → `callAI` falls through to the Gemini fallback (GEMINI_API_KEY
already set), same as the balance-error path. General: any empty Claude completion now
self-heals to Gemini instead of dead-ending the render.
