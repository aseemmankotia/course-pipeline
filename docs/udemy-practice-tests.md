# Udemy practice tests — what the API actually allows

Notes from replacing questions on live courses (July 2026). Saved because two of
these cost real time to discover and both are counterintuitive.

## Answer-order bias is invisible to students when randomize is on

Every practice test we publish has **"Randomize question & answer order"**
enabled. Udemy reshuffles the options for each learner on each attempt, so the
stored position of the correct answer never reaches a student.

We measured AIGP practice test 1 at 76% of correct answers on B (and zero on D)
and treated it as a live defect. It is not: with randomization on, there is no
stable "B" to guess. **Check `is_randomized` before treating a distribution
skew as student-facing.**

    GET /api-2.0/courses/{courseId}/quizzes/{quizId}/?fields[quiz]=is_randomized,num_assessments

Where the bias DOES reach learners:

| Pool | Randomized? | Student-visible |
|---|---|---|
| Practice tests | yes | no |
| Chapter quizzes rendered into video | no — fixed slide order | **yes** |
| Chapter materials (not published) | n/a | no |

So `scripts/balance-answers.js` matters most for chapter quizzes, and for new
courses before they are rendered. The QA gate blocks >=50% on one letter, which
is the right place to catch it — pre-render.

## Bulk upload cannot update existing questions

The CSV bulk uploader only ADDS. Upload a CSV whose questions already exist and
Udemy de-duplicates on question text, adds nothing, and still reports
**"Questions are created."** The question count does not change. Do not trust
that success message — verify with:

    GET /api-2.0/quizzes/{quizId}/assessments/?page_size=200&fields[assessment]=id,correct_response

To genuinely replace questions you must delete the existing ones first, and
deletion is not available over the API:

    DELETE /api-2.0/quizzes/{quizId}/assessments/{id}/   -> 400
    DELETE /api-2.0/users/me/taught-courses/{c}/quizzes/{q}/assessments/{id}/ -> 404

Deleting means clicking through the practice-test editor one question at a time.
For a 45-question test across ten tests that is not worth it unless the content
is actually wrong.

## Endpoints that do work

    POST  /api-2.0/users/me/taught-courses/{courseId}/chapters/      {title, description}
    POST  /api-2.0/users/me/taught-courses/{courseId}/lectures/      {title, description}
    POST  /api-2.0/users/me/taught-courses/{courseId}/lectures/{id}/assets/  {asset_id, type:'main'}
    PATCH /api-2.0/users/me/taught-courses/{courseId}/lectures/{id}/ {title}
    PUT   /api-2.0/courses/{courseId}/instructor-curriculum-items/   {items: "[{id,class,is_published}]"}
    GET   /api-2.0/users/me/assets/?page_size=200                    (video library)
    PATCH /api-2.0/courses/{courseId}/quizzes/{quizId}/              (title, duration, pass_percent, is_randomized)

Building a 7-section / 10-lecture curriculum this way takes two calls instead of
roughly a hundred clicks.

**Match videos by exact filename.** The asset library still holds
`chapter-01-final.mp4` files from earlier courses; selecting by row position
attaches another course's video. Verify after attaching:

    GET /api-2.0/users/me/taught-courses/{c}/lectures/{id}/?fields[lecture]=asset&fields[asset]=title,length

## NEVER navigate directly to /course/create/1

Navigating to `https://www.udemy.com/course/create/1` (or /course/manage/create/)
by URL bounces through `/user/logout/` and DESTROYS the session — it has logged
the instructor out twice. Always start course creation by clicking the
**New course** button on `https://www.udemy.com/instructor/courses/` instead.
