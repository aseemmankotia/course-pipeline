# udemy-autopublish

Standalone, API-only automation to publish a rendered course to Udemy with **no manual
browser steps**. Parallel to `course-pipeline` — it does not modify anything there.

- **Architecture:** see [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Cost model:** see [COST.md](./COST.md) (short version: the automation itself is ~$0/course)

## Status
- ✅ Validated live this session: auth/client, goals, curriculum, video **attach**, **practice-test load** (create→unpublish→insert→publish).
- 🟡 Coded to observed shapes, verify on first run: course create, landing, pricing, submit-for-review.
- 🟡 One capture needed: video/image **upload** endpoint (`lib/capture-upload.js`) — 5-minute step, then fully automated.

## Setup
1. `.env` (in this folder or the repo): add
   ```
   UDEMY_COOKIE="access_token=…; client_id=…; csrftoken=…"
   UDEMY_BASE=https://www.udemy.com
   ```
   (Capture: DevTools → Network → any `api-2.0` request → copy the `cookie` header.)
2. `node -e "require('./lib/client').UdemyClient && console.log('ok')"` — sanity.

## Load practice tests (standalone, ready now — no browser, no console paste)
Reads `pt-config.json`, resolves each course's two CSVs from `csvDir`
(`../../exports/practice-test-csvs` by default), and loads all practice tests via the API.
Idempotent (skips complete tests, cleans up partials, respects the 2-per-course cap).
```
npm run pt:load:dry           # dry-run: prints what it would do, changes nothing
npm run pt:load               # load all courses in pt-config.json (+ auto-publish)
node load-practice-tests.js --only=7301139        # just one course
```
Prereq: `.env` with `UDEMY_COOKIE` (see docs/udemy-auth.md) and `npm run auth:check` → OK.

## Run full publish (after approval + upload capture)
```
node udemy-publish.js --slug=<course-slug> --dry-run   # prints every call, changes nothing
node udemy-publish.js --slug=<course-slug>              # real run, idempotent/resumable
```

## Files
```
udemy-autopublish/
├─ README.md ARCHITECTURE.md COST.md
├─ package.json
└─ lib/
   ├─ client.js          auth + request helper (+ --dry-run)
   ├─ course.js          create / goals / curriculum / landing / pricing / attach / submit
   ├─ assets.js          upload video+image, poll, attach   (needs upload-endpoint capture)
   ├─ practice-tests.js  create PT + load questions from CSV (validated)
   └─ capture-upload.js  one-time console snippet to reveal the upload endpoint
```
`udemy-publish.js` (the orchestrator) is built once you approve the architecture.
