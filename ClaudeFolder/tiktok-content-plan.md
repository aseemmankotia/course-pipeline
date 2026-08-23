# TikTok content plan — TechNuggets Academy

Written 2026-08-21. Grounded in an audit of what's actually in `~/course-pipeline`, not
generic TikTok advice.

---

## The finding: don't repurpose the chapter renders

I proposed repurposing your existing chapter videos. Having looked at them, that's the
wrong call:

| | Chapter renders | Existing promo Shorts | Question bank |
|---|---|---|---|
| Format | **1280×720 (16:9)** | 1080×1920 (9:16) | text |
| Length | **~16 min** | ~37 s | n/a |
| Volume | 490 files | a handful of courses | **9,826 questions** |
| Vertical-native | no | yes | yes (if rendered) |

The chapter videos are landscape slide decks with narration. Cropping a 16:9 slide to
9:16 either letterboxes it (dead space, poor retention) or crops the slide content out.
They're the wrong shape and 25× too long. Cutting them by hand doesn't scale.

**The question bank is the asset.** 9,826 four-option questions across 48 courses, each
already mapped to an exam domain. That is effectively unlimited vertical-native content.

### How much is actually usable

Not all 9,826 fit on a phone screen at readable size. Filtering to what renders cleanly
on a 1080×1920 card (question ≤170 chars, every option ≤70 chars):

**915 clip-ready questions — 9% of the bank.**

Top sources:

| Course | Clip-ready | Total |
|---|---|---|
| CompTIA A+ Core 1 (220-1201) | 64 | 210 |
| CompTIA Network+ (N10-009) | 57 | 210 |
| AIPMM CPM | 46 | 210 |
| CompTIA A+ Core 2 (220-1202) | 43 | 210 |
| NVIDIA NCA-ADS | 35 | 208 |
| HashiCorp Terraform Associate 004 | 34 | 208 |
| NVIDIA NCP-GENL | 32 | 210 |
| Google ACE | 31 | 210 |

At 1 clip/day that's **2.5 years of content** before repeating. At 3/day, 10 months.

Worth noting: CompTIA A+ Core 1/2 top the list, and those are among the four courses that
failed rendering at the TTS stage. Their **question banks generated fine** — only the video
step failed. So this content path doesn't depend on fixing that pipeline.

---

## Format

**The 3-beat question clip.** 20–30 seconds, 1080×1920.

```
0:00–0:03   HOOK      "Most people get this AWS question wrong."
                      Exam code badge, amber on ink-navy. Brand mark bottom-corner.
0:03–0:12   QUESTION  Scenario + 4 options. Static card, readable at arm's length.
0:12–0:15   PAUSE     3-2-1 countdown ring. This is the beat that drives
                      comments and rewatches — people answer in the comments.
0:15–0:25   ANSWER    Correct option highlighted + one-sentence why.
0:25–0:30   CTA       "36 free practice tests · technuggets.academy"
```

Why this shape:

- **The pause is the engagement mechanic.** It converts passive viewers into commenters
  ("B", "definitely C"), and comments are the strongest ranking signal on TikTok. It also
  drives rewatches — completion rate is the other big one.
- **No face, no voice needed.** You can produce these headlessly from the existing render
  stack. Optional TTS later.
- **Silent-readable.** Most TikTok viewing starts muted. Text-first survives that.

## Cadence

3 clips/day is the growth rate, 1/day is the sustainable floor. Start at 1/day for two
weeks to find which exam families land, then concentrate.

Post 7–9am and 6–8pm CT — US study-adjacent audience skews early morning and evening.

---

## Content pillars

Rotate so the account isn't only quiz cards:

1. **Question clips** (70%) — the engine, above.
2. **"The trap"** (15%) — take one question and explain *why the wrong answer is tempting*.
   Distractor analysis is genuinely useful and almost nobody publishes it.
3. **Study-method** (15%) — the per-domain scoring point that landed well on YouTube:
   *"A 70% average hides a 40% in one domain, and that's the one that fails you."*
   These are the ones that get saved and shared, which matters more than likes.

## Hooks that fit your material

Avoid outcome promises (`pass`, `guaranteed`, `first attempt`) — same compliance line as
everywhere else, and it reads as less credible anyway.

- "This AWS question has a 4-option trap in it."
- "If you picked C, here's what the exam is actually testing."
- "Reserved concurrency vs provisioned concurrency — one of these throttles your whole account."
- "Three domains, three weightings. Guess which one people under-study."
- "You can pass the practice test and still not be ready. Here's why."  ← *reframe: "score well on"*

---

## Cross-posting: one render, four surfaces

The same 1080×1920 file works natively on:

- **TikTok** — primary
- **YouTube Shorts** — you already have `promo-all.js --upload` wired to YouTube auth
- **Instagram Reels** — no account yet; worth creating, this format is native there
- **Facebook Reels** — Page exists (1 follower, but Reels reach isn't follower-gated)

That's 4× distribution for 1× production cost. Facebook and TikTok both surface Reels/FYP
content to non-followers, which is precisely what you need at 0–1 followers — **reach on
these platforms is not follower-gated**, unlike LinkedIn and X where your 1,179 and 16
followers are a hard ceiling.

This is the strategic point: **your best-performing channel (LinkedIn, 1,179) has the
lowest ceiling, and your emptiest channels have the highest.** Effort should go where
the algorithm distributes, not where the followers currently are.

---

## Build path

Everything needed already exists in the repo; this is a new renderer, not new content.

1. **`scripts/make-question-clip.py`** — read `generated/<slug>/state.json`, filter to
   clip-ready questions, render the 5-beat card sequence to 1080×1920 PNG frames.
   Reuse the brand tokens from `make-card.py` (amber `#F59E0B`, ink `#0F172A`, the
   hue-rotation-per-slug trick for visual variety between courses).
2. **ffmpeg assembly** — frames + countdown + optional edge-tts VO → mp4. Same ffmpeg
   dependency the chapter renderer already uses.
3. **`scripts/clip-queue.js`** — track which question IDs have been published, per
   platform, so nothing repeats. Model it on `marketing/email/announced.json`.
4. **Upload** — YouTube Shorts is already automated via `promo-all.js --upload`.
   TikTok/IG/FB have no API path here; those stay manual or scheduled via Meta Business
   Suite (which does cover Facebook + Instagram Reels together).

Estimated: one working session for steps 1–2, which is the whole engine.

---

## Measuring it

Only two numbers matter early:

- **Completion rate** — are people watching to the answer? If they bail before the pause,
  the hook is wrong.
- **Comments per view** — the pause beat should produce guesses. If it doesn't, the
  question is too easy or too hard.

Ignore follower count for the first 30 days. On TikTok, follower count is an *output* of
distribution, not an input to it.

Add `?utm_source=tiktok` to the bio link once the Business account unlocks a clickable
link, so site traffic is attributable.

---

## Guardrails

- No exam-outcome promises anywhere — `pass`, `guaranteed`, `first attempt`, `100%`.
  Use "exam-focused prep" / "prepare for".
- Never publish real exam content. These are your own authored questions; keep it that
  way. Certification vendors (and r/AWSCertifications Rule 8) treat dumps as a permanent
  ban / legal issue.
- Disclose the referral relationship when a clip links to a paid course. Free-practice-test
  links need no disclosure — which is another reason to lead with those.

---

## Blockers before this starts

1. **TikTok Business verification** — needed for the clickable bio link and Ads Manager.
   Settings → Business verification. Requires your business details; not something to
   automate.
2. **Username** — `@technuggetsbyaseem` is on a 30-day change cooldown. Retry
   `@technuggetsacademy` after that.
3. **Profile photo** — `udemy-instructor-profile-icon.png` is ready to upload.
4. **Site deploy** — still pending. Every link shared today renders an og-image saying
   "31 certs" when it's 36.
