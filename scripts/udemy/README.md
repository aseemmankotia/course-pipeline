# scripts/udemy — Udemy instructor-API helpers

Used by `scripts/load-practice-tests.js` (and future publish steps). API-only; no browser.

- `client.js` — auth (reads `UDEMY_COOKIE` from `.env`), request helper, expiry detection,
  `--dry-run` support.
- `practice-tests.js` — CSV → assessment payloads + `loadCourseTests()` (create →
  **unpublish** → insert questions → publish). Handles Udemy's 2-practice-tests-per-course
  cap and the eventual-consistency lag after deletes. Validated live 2026-08-21.
- `bundles.js` — create + publish learning-path **course bundles** and read back their
  public URL. Endpoint shapes are `[VERIFY]` (Udemy's Course Bundling API is
  undocumented) and centralized in the `BUNDLE_API` object at the top of the file.
  Driven by `scripts/create-bundles.js`.

## Create the 20%-off learning-path bundles
Bundles live in `BUNDLES` inside `scripts/build-practice-site.js` (single source of truth,
2–3 courses each). `create-bundles.js` resolves member course ids (live taught-courses API,
falling back to `shell-spec.json` `courseId`), creates + publishes each bundle, writes the
resulting URL back into `BUNDLES[].udemyBundleUrl`, records `exports/bundles-log.json`, and
rebuilds the site. Idempotent (skips ones already in the log; `--force` to redo).
```
npm run bundles:list                         # planned bundles + 20%-off prices
npm run bundles:plan                          # DRY RUN — prints every API call, no changes
npm run bundles:create                        # create + publish all, sync URLs, rebuild site
node scripts/create-bundles.js --only=aws-associate-trio,ai-product
node scripts/create-bundles.js --force        # recreate even if logged as done
```
**First run:** do `npm run bundles:plan`, then a single `--only=<one-bundle>` live run. If
the create call 404s, the bundle endpoint differs from the guess — confirm it once:
Instructor → **Tools → Course Bundling**, create ONE bundle by hand, DevTools → Network →
copy the POST url + JSON body + the list GET, and reconcile with `BUNDLE_API` in
`bundles.js` (usually only `path` and the course-ids field name). Then re-run for the rest.

## One-time auth setup
1. Log in to Udemy (instructor) in Chrome.
2. DevTools → **Network** → click any `api-2.0/...` request → **Request Headers** →
   copy the whole `cookie:` value.
3. In the repo-root `.env`:
   ```
   UDEMY_COOKIE="access_token=…; client_id=…; csrftoken=…"
   UDEMY_BASE=https://www.udemy.com
   ```
   (`csrftoken` inside the cookie is used automatically.)
4. The cookie lasts a few weeks; on an `AUTH FAILED` error, re-capture and replace it.

## Load a course's practice tests
```
npm run pt:load:dry -- --slug=<slug> --course=<udemyCourseId>   # plan only, no changes
npm run pt:load     -- --slug=<slug> --course=<udemyCourseId>   # create + fill + publish
```
Driven entirely by `exports/<slug>/shell-spec.json` (`practiceTests[]` + `courseId`).
Idempotent: skips complete tests, cleans partials, writes `exports/<slug>/practice-tests-log.json`.

### Confirmed API shapes (don't "simplify" without re-checking)
- Create:  `POST /api-2.0/courses/{cid}/quizzes/` `{title,type:'practice-test',description,duration,pass_percent}` — comes back **published**, so PATCH `is_published:false` before adding questions.
- Question: `POST /api-2.0/quizzes/{qid}/assessments/` `{assessment_type,question_plain,correct_response:['a'..],prompt:{question,answers[],feedbacks[],relatedLectureIds:[],links:[]}}` — `correct_response` is a **letter**.
- Publish:  `PATCH /api-2.0/courses/{cid}/quizzes/{qid}/` `{is_published:true}`.
- Cap: max **2** practice tests per course; DELETE is eventually consistent (~1–2 s).
