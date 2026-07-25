# Course pipeline — working rules

## Udemy publishing checklist (learned from review rejections — ALWAYS apply)

1. **AI content disclosure is mandatory.** Every course description on Udemy must
   disclose AI usage (AI narration, AI-assisted scripts/slides/practice questions,
   instructor-reviewed). Standard paragraph is auto-appended to each course's
   `generated/<slug>/udemy-listing.md` — paste it with the rest of the description.
   Source: Udemy review rejection of Agentforce Specialist, 2026-07-25.
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
- Practice-test **Bulk upload REPLACES the entire question bank** (it does not append).
  CSVs come from `python3 scripts/make-practice-test-csvs.py` (repo-relative paths).
- Free "Open" coupons: 5-day expiry, 10 redemptions, monthly budget per course —
  regenerate weekly (reviews campaign playbook: `marketing/reviews-campaign-2026-07.md`).
- Review turnaround ~2 business days; courses are editable while "Submitted for review".

## Compliance (reviews campaign)

- Never fake accounts/reviews; never incentivize *positive* ratings — only invite
  HONEST reviews. Educational announcements lead with teaching value, review ask is
  a soft footer. Max 4 announcements/month per course.
