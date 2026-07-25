# Refresh runbook — AZ-900 / NCA-AIIO / AI-901 (July 2026)

Goal: regenerate all 3 older courses at the new-portfolio quality bar, re-upload
as **"Refreshed for 2026"** editions, then run the honest-review coupon +
announcement play on them.

Already done (committed in this repo):
- `course-configs/az-900-azure-fundamentals-refresh-2026.json` — Jan-2026 exam update baked in (AI services/Copilot/responsible AI + heavier governance)
- `course-configs/nvidia-nca-aiio-refresh-2026.json` — official blueprint weights (Infra 40 / Essential 38 / Ops 22), depth fixes
- `course-configs/ai-901-azure-ai-fundamentals-refresh-2026.json` — Foundry-first (55-60% implementation), plus explicit guard against the chapter-conclusion mismatch that earned the 1★
- Quality audit: `ClaudeFolder/course-quality-audit-2026-07-24.md`

Slugs are new, so **nothing in `generated/` or on Udemy is touched by generation.**

---

## Phase 1 — Generate (your Mac, ~30–60 min per course, unattended)

One command per course; everything is checkpointed and resumable:

```bash
npm run autopilot -- --only=az-900-azure-fundamentals-refresh-2026
npm run autopilot -- --only=nvidia-nca-aiio-refresh-2026
npm run autopilot -- --only=ai-901-azure-ai-fundamentals-refresh-2026
```

Autopilot runs: generate → editorial → **qa (stops on blocking issues)** →
narration → stage → render → collect → promo. Configs use `narration_mode: "tts"`
(free edge-tts; `pip3 install edge-tts` once). If you'd rather review content
before burning render time:

```bash
node scripts/generate-course.js --config=course-configs/<config>.json   # content only
npm run qa -- --slug=<slug>                                             # read qa-report.md
node scripts/balance-answers.js --slug=<slug>                           # if QA flags answer skew
npm run autopilot -- --only=<slug>                                      # resumes from there
```

### No-overwrite guardrails (the thing you asked about)
- Generation writes ONLY to `generated/<new-slug>/` — verified against the code.
- The **stage** step swaps `course-render-input-N.json` at the repo root. That's
  local render plumbing only; it never touches Udemy or `exports/`. But run one
  course through render **to completion** before staging the next, or renders
  will mix chapters.
- `render:N:force` and `promo --force` re-render over local mp4s — never use
  `--force` unless you mean it.
- Your live Udemy lectures are untouched until you manually upload in Phase 3.
- ⚠️ AZ-900 and NCA-AIIO have **no local backup of their current Udemy videos**
  (AI-901 does, in `exports/`). If you want rollback copies, download them from
  each lecture's edit page BEFORE replacing. Replacing a video on Udemy is
  irreversible.

## Phase 2 — QA gate (do not skip)

Per course before upload:
1. `qa-report.md` in `generated/<slug>/` — must be exit-0 / no blockers.
2. Spot-watch chapter 1 + the final exam-sim chapter end to end — checking
   **audio/slide sync and that each conclusion matches its chapter** (the exact
   AI-901 1★ complaint).
3. Skim both practice tests for answer-position balance and explanation quality
   (every wrong option should have a "why it's wrong").

## Phase 3 — Re-upload to Udemy (browser, ~30 min per course)

Course IDs: AZ-900 `7202905` · NCA-AIIO `7156661` · AI-901 `7150221`.
Go through /instructor/courses/ (never direct to /course/create/).

1. **Curriculum**: restructure into one section per exam domain (all 3 are
   currently a single flat "Introduction" section). Add new lectures/sections
   first, then remove old lectures only after the new ones are live — students
   keep access throughout and nothing is lost if you stop midway.
2. **Videos**: upload rendered chapters via Bulk Uploader; attach per lecture.
3. **Practice tests**: create 2 per course from `generated/<slug>/` (CSV helper:
   `python3 scripts/make-practice-test-csvs.py`). This alone fixes the biggest
   gap — none of the 3 has any test today.
4. **Landing page**: paste from `generated/<slug>/udemy-listing.md`. Lead the
   subtitle/description with **"Fully refreshed for 2026"** (AZ-900: "updated for
   the January 2026 exam refresh"; AI-901: "rebuilt for AI-901 around Microsoft
   Foundry"; NCA-AIIO: "rebuilt with full domain coverage + 2 practice tests").
5. AI-901 only: after upload, reply to the 1★ sync review — thank them, say the
   course was re-recorded and practice tests added.

## Phase 4 — "Refreshed" marketing (existing students get it free automatically)

1. **Educational announcement** per course (template in
   `marketing/reviews-campaign-2026-07.md`): lead with "your course was just
   fully refreshed for the 2026 exam — here's what's new", then the exam-week
   checklist, then the soft honest-review footer. Existing students already own
   the refreshed content — that IS the free-for-existing-users part.
2. **Coupons + review seeding**: once live, add the 3 courses to the weekly
   FREEREVIEW10 rotation (Promotions → Free: Open, 10 seats / 5 days).
3. **Promo videos**: autopilot already rendered 16:9 + Shorts into
   `render/promo/`. Upload: `node scripts/promo-all.js --upload --privacy=unlisted`,
   review, then flip public.

## Suggested order

AI-901 first (worst rating, angriest students, best assets), then AZ-900
(stalest content), then NCA-AIIO. One course end-to-end per day is a
comfortable pace; the review-seeding coupons only start once a course's
refresh is live.
