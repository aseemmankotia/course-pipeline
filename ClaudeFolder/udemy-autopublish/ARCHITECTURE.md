# udemy-autopublish — Architecture

A standalone, API-only automation that takes a **rendered course** (videos + card +
practice-test CSVs + `shell-spec.json`) and does every remaining Udemy step with **zero
manual browser actions**: create shell → goals → curriculum → upload+attach videos →
upload course image → load practice tests → set landing/pricing → submit for review.

It is a **parallel project**. Nothing in `course-pipeline/` is modified. It calls the
same Udemy instructor REST API that the website uses, authenticated with a captured
instructor session token (no password stored, 2FA stays on).

---

## 1. Where it sits in the overall flow

```
                 EXISTING course-pipeline (unchanged)                    NEW (this project)
  ┌───────────────────────────────────────────────────────┐   ┌──────────────────────────────┐
  generate-course.js ─► autopilot (QA, compliance, card,   │   │  udemy-publish.js  (orchestrator)
     │                    CSVs, TTS)                        │   │        │
     ▼                        │                             │   │        ├─ lib/course.js
  configs/*.json              ▼                             │   │        ├─ lib/assets.js  (upload+attach)
                       render:all  ──►  exports/<slug>/     │──►│        ├─ lib/practice-tests.js
                          (Mac, ffmpeg)   ├─ videos/*.mp4    │   │        ├─ lib/client.js  (auth)
                                          ├─ <slug>-card…   │   │        └─ reads exports/<slug>/ + shell-spec.json
                                          ├─ practice-…csv  │   │
                                          └─ shell-spec.json│   │  Result: course submitted for review
  └───────────────────────────────────────────────────────┘   └──────────────────────────────┘
```

Trigger: `node udemy-publish.js --slug=<slug>` after render completes. (Optionally a
one-line hook in `autopilot.js` Phase B — see §6 — but ONLY if you approve.)

---

## 2. Modules

| File | Responsibility | Validation status |
|---|---|---|
| `lib/client.js` | Auth (cookie+CSRF from `.env`), request helper, expiry detection, `--dry-run` | **OK** — same calls used live all session |
| `lib/course.js` | `createCourse`, `setGoals`, `buildCurriculum`, `setLanding`, `setPricing`, `attachVideo`, `submitForReview` | `setGoals`/`buildCurriculum`/`attachVideo` = **OK**; `createCourse`/`setLanding`/`setPricing`/`submitForReview` = **VERIFY** on first run |
| `lib/assets.js` | Upload video/image bytes to Udemy storage, poll processing, attach | **VERIFY** — needs 1× endpoint capture (see §4) |
| `lib/practice-tests.js` | Create practice tests + insert all questions from CSVs | **OK** — validated end-to-end (166 Q loaded live) |
| `lib/capture-upload.js` | One-time console snippet to reveal the upload endpoint | helper |
| `udemy-publish.js` | Orchestrator: reads `shell-spec.json` + `exports/<slug>/`, runs steps in order, idempotent, resumable | to build after approval |

---

## 3. Data flow per course

1. Read `exports/<slug>/shell-spec.json` → title, headline, description (verbatim AI
   disclosure first line), objectives/requirements/audiences, chapter titles, level,
   category, price, url slug.
2. `createCourse` → `courseId`.
3. `setGoals` (headline + description + the three `_data` lists).
4. `buildCurriculum` → 12 sections; returns lecture IDs in ch1..chN order.
5. For each `videos/*.mp4` (sorted by chapter): `uploadAndAttachVideo` → poll until
   `status:1` → attach to the matching lecture.
6. `uploadCourseImage` with `<slug>-card-notext.png`.
7. `loadPracticeTests` from the two `-testN.csv` files (create → **unpublish** → insert
   → publish; idempotent skip-if-complete).
8. `setLanding` (level, category, topic) + `setPricing` (tier).
9. `submitForReview` (sets immutable slug, requests review).
10. Write `exports/<slug>/publish-log.json` (course URL, asset IDs, per-step status).

Everything is **idempotent**: re-running skips finished steps (checks existing
quizzes/lectures/assets), so a partial failure just resumes.

---

## 4. The one unknown: video/image upload endpoint

Everything is confirmed working via API **except** the "create upload" call (step where
Udemy hands back short-lived storage credentials). It couldn't be observed headless
because it only fires when a real file is dropped. `lib/capture-upload.js` logs it during
one manual drag-drop; paste the output and `CREATE_ASSET_ENDPOINT` in `lib/assets.js`
gets hard-wired. After that, uploads are fully automated. Until then `uploadFile()` throws
a clear message instead of guessing.

---

## 5. Auth model

`.env`:
```
UDEMY_COOKIE="access_token=…; client_id=…; csrftoken=…; ud_…"   # from a logged-in tab
UDEMY_CSRF="…"        # optional; auto-read from the cookie
UDEMY_BASE=https://www.udemy.com
```
Capture: DevTools → Network → any `api-2.0` request → copy the `cookie` request header.
Token lives ~weeks; `client.js` throws a clear "re-capture" error on 401/403. No password,
2FA unaffected.

---

## 6. What WOULD change in existing `course-pipeline` (only if you approve integration)

Nothing is changed today. Integration would be **additive** and minimal:

- **`package.json`**: add one script line — `"publish": "node ../ClaudeFolder/udemy-autopublish/udemy-publish.js"` (or copy the project under `scripts/udemy/`).
- **`autopilot.js`** (optional): one guarded call at the end of Phase B —
  `if (process.env.UDEMY_AUTOPUBLISH === '1') await publish(slug)` — off by default.
- **`.env.example`**: add the three `UDEMY_*` keys (documentation only).
- No existing function, render step, or file format is altered. `shell-spec.json` is
  already produced by `make-shell-spec.js`; this project only *reads* it.

You can also keep it fully separate and just run `node udemy-publish.js --slug=<slug>`
manually — no pipeline edits at all.
