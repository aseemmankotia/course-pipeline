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
3. Never promise outcomes in landing copy ("pass", "first attempt", "guaranteed") —
   Udemy compliance; use "prepare for / exam-focused" framing.
4. Practice-test generation must stay anchored to the cert (fixed in
   `scripts/generate-course.js` after CCDV-F shipped AWS/GCP/Azure questions) — after
   any regen, scan the bank for other-vendor terms before upload.

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

## Compliance (reviews campaign)

- Never fake accounts/reviews; never incentivize *positive* ratings — only invite
  HONEST reviews. Educational announcements lead with teaching value, review ask is
  a soft footer. Max 4 announcements/month per course.
