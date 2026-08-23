# Cost model — per function, per course, per batch

Two things to separate:

- **This automation (udemy-autopublish)** — its own marginal cost is essentially **$0**.
  Every step is a call to Udemy's own API (free) or a file upload to Udemy storage
  (free to instructors). It makes **no LLM calls**.
- **The full pipeline per course** (generate → render → publish) — included below for
  context, since that's the real cash cost of shipping a course.

All figures are **estimates** with the assumptions stated. Model = `claude-sonnet-5`
(assumed pricing ~$3 / 1M input tokens, ~$15 / 1M output tokens — adjust if your rate
differs). TTS default = edge-tts (free).

---

## A. udemy-autopublish functions (the new project)

| Function | External calls | LLM? | Cash cost / course | Wall-clock |
|---|---|---:|---:|---|
| `createCourse` | 1 API POST | no | $0 | ~1 s |
| `setGoals` | 1 API PATCH | no | $0 | ~1 s |
| `buildCurriculum` | ~50 API calls (12 ch + 12 lec + sort) | no | $0 | ~20–40 s |
| `uploadAndAttachVideo` × 12 | 12 uploads + polling + attach | no | $0* | ~10–40 min (bandwidth-bound) |
| `uploadCourseImage` | 1 upload + set | no | $0 | ~5 s |
| `loadPracticeTests` (2 tests, ~90 Q) | ~95 API POSTs | no | $0 | ~3–5 min (throttled) |
| `setLanding` + `setPricing` | 2 API PATCH | no | $0 | ~2 s |
| `submitForReview` | 1–2 API calls | no | $0 | ~2 s |
| **Total per course** | | **no** | **≈ $0** | **~15–50 min, mostly video upload** |

\* Video upload consumes your **home/office upload bandwidth** (~2–3.5 GB of finished
mp4 per course). No cash cost; just time on your connection. Udemy hosts/streams for free.

**So: automating publishing adds ~$0 per course.** The value is time saved (a manual
publish was ~30–60 min of clicking per course), not dollars.

---

## B. Full pipeline cost per course (for context)

| Stage (existing pipeline) | Cost driver | Est. cost / course |
|---|---|---:|
| `generate-course.js` (scripts, slides, ~210 quiz+PT questions, descriptions; multi-pass + heal) | claude-sonnet-5 tokens (~250–450K in, ~150–260K out) | **~$4 – $8** |
| TTS narration — **edge-tts (default)** | free | **$0** |
| TTS narration — **ElevenLabs (optional)** | ~35–60K chars × ~$0.15–0.30/1K | ~$6 – $18 |
| Render (Mac, ffmpeg) | local compute/electricity | ~$0.05 – $0.20 |
| **udemy-autopublish (this project)** | Udemy API | **~$0** |
| **Total / course (edge-tts path)** | | **≈ $4 – $8** |
| **Total / course (ElevenLabs path)** | | **≈ $10 – $26** |

### Per batch

| Batch | edge-tts path | ElevenLabs path |
|---|---:|---:|
| 8 courses | ~$32 – $64 | ~$80 – $208 |
| 20 courses | ~$80 – $160 | ~$200 – $520 |

Dominant cost is **AI generation**, not publishing. If you want to cut it: fewer
generation passes, cheaper model for slides/quizzes, or caching the cert-prompt context.

---

## C. Assumptions & caveats

- Token volumes inferred from a real `state.json` (~532 KB, ~210 question fields). Actual
  varies ±40% by cert breadth and retry count.
- Pricing is list-rate; your effective rate (batch/enterprise discounts) may be lower.
- No cost for Udemy hosting, storage, or bandwidth on their side (instructor is free).
- Excludes one-time dev time and the optional paid TTS/marketing (Brevo email is free tier).
- The one **VERIFY** step (video-upload endpoint) needs a 5-minute capture; it does not
  change any cost, only unblocks full automation.
