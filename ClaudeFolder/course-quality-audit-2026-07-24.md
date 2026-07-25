# Quality audit — AZ-900, NCA-AIIO, AI-901 (2026-07-24)

Goal: regenerate/re-upload so these 3 older live courses match the quality bar of
the new 8-course portfolio, then run the free-coupon + announcement play on them.

## Snapshot

| Course | ID | Video | Lectures | Practice tests on Udemy | Rating | Local assets |
|---|---|---|---|---|---|---|
| AI-901 Azure AI Fundamentals | 7150221 | 3h 14m | 9 | **None** (2 exist locally, never uploaded) | 3.32★ | Full archive: videos, slides, scripts, render-configs, 2 practice tests |
| AZ-900 Azure Fundamentals Mastery | 7202905 | 1h 49m | 5 | None | 0 reviews | **None found** — predates pipeline |
| NVIDIA NCA-AIIO | 7156661 | 1h 57m | 5 | None | 0 reviews (3 enrollments/mo) | Landing-page HTML only |

All three are one-section courses with no quizzes/practice tests — far below the
new-portfolio standard (per-domain videos + 2 full-length practice tests).

## Per-course findings & fix list

### AI-901 (worst rating, best assets) — PRIORITY 1
- 1★ review (17 days ago): "visuals and voice over are not in sync"; chapter 2's
  conclusion doesn't match its topic. This is a production defect, not a content gap.
- Exam facts check out: AI-901 replaced AI-900 on June 30, 2026; course's Foundry
  focus is correct and current.
- Fix: (a) re-render ch. 1–9 from local render-configs after fixing the ch-2
  script conclusion and A/V timing; (b) upload the 2 existing practice tests
  (60+ Qs each, answer keys ready); (c) split into proper sections per domain;
  (d) respond to the 1★ review after the fix ("re-rendered, thanks for flagging").

### AZ-900 (stalest content) — PRIORITY 2
- Exam refreshed 2026-01-14: governance/cost mgmt now up to ~35%, new AI content;
  candidates using pre-2025 material report surprises. Course is 1h49m / 5 lectures
  at $109.99 — thin vs. competitors and likely missing the new objectives.
- No local pipeline assets → full regeneration through the pipeline
  (curriculum → scripts → render). Needs: new curriculum against the Jan-2026
  study guide, ~8-10 chapters, 2 full practice tests, updated landing page.

### NCA-AIIO (needs depth, exam stable) — PRIORITY 3
- Exam unchanged: 3 domains (Essential AI Knowledge ~38%, AI Infrastructure,
  AI Operations), 50 Qs / 90 min / 70% pass.
- 1h57m / 5 lectures covers the domains superficially; no practice tests.
- Fix: regenerate with deeper per-domain chapters (~8) + 2 practice tests; can
  reuse existing landing HTML. Note: it sells ~3 seats/month even now — improving
  it has real upside.

## Recommended sequence
1. AI-901 practice-test upload + section restructure — no rendering needed, can do now.
2. AI-901 re-render (ch-2 script fix first; render runs on your machine: `npm run render:chapter`).
3. AZ-900 full regeneration (new pipeline course-config; largest job).
4. NCA-AIIO regeneration.
5. Only after each course is fixed: Free: Open coupons + educational announcement
   (honest-review footer) to seed reviews — same compliant playbook as the main 8.

## Constraints
- Rendering (Puppeteer/FFmpeg) and HeyGen avatar clips run on Aseem's machine, not in this session.
- Free: Open coupons: 5-day / 10-redemption limits, monthly budget per course.
- Replacing videos on Udemy keeps existing students enrolled — they get the new content automatically.
