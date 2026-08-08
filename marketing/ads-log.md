# Paid-ads drafts log (course-ads-drafts scheduled task)

All ads are created as DRAFTS/PAUSED for Aseem's manual review and publish.
Budget policy: $10 LIFETIME per ad, longest allowed schedule, technical-audience
targeting. Never auto-published; never any payment-detail entry.

---

## Run — 2026-08-07 (first run, manual "run now")

**Course:** NCA-ADS: NVIDIA Accelerated Data Science Exam Prep (id 7284909, newest live, no prior ads)
**Destination:** https://www.udemy.com/course/nca-ads-nvidia-accelerated-data-science-exam-prep/

### Meta (Facebook/Instagram) — DRAFT created, needs 2 fixes before publishable
- Account 65932722. Campaign **"NCA-ADS Udemy Traffic — 2026-08-07 (draft)"** (Traffic objective, manual setup)
  → ad set **"NCA-ADS Technical Audience — $10 lifetime"** ($10 lifetime, Aug 7 → Aug 16 2026 — Meta's ~$1/day
  minimum blocked a 30-day run at $10, so 9 days; interests: Data science, Machine learning, Nvidia;
  audience est. 17.9–21.1M, US) → ad **"NCA-ADS Card Image Ad"** (destination URL set).
- ⚠️ BLOCKERS for Aseem: (1) **no Facebook Page is connected to this ad account** — select/create the
  TechNuggets Academy Page in the ad's Identity section; (2) image upload failed via automation
  (file_upload tool error) — upload `exports/course-images/nvidia-nca-ads-accelerated-data-science-2026-card-notext.png`
  in Ad creative → Media; (3) paste primary text below. Then "Review and publish".
- Draft primary text (compliance-checked, no outcome promises):
  > GPU-accelerated data science is its own exam. NCA-ADS covers RAPIDS, cuDF, cuML and the NVIDIA
  > accelerated stack — and this exam-focused course walks every domain: 12 video chapters plus two
  > full-length practice tests with per-option explanations. Start preparing today.
  Headline: "NCA-ADS Exam Prep: NVIDIA Accelerated Data Science" · Description: "Video course + 2 practice tests." · CTA: Learn More.

### Google Ads (YouTube) — DRAFT saved (draft ID 10208186673), needs video
- Account 238-821-4892. Campaign **"NCA-ADS Udemy YouTube — 2026-08-07 (draft)"** — Video / Video views
  (TrueView), $10 campaign-total budget, Aug 7 → Sep 6 2026 (Google accepts $0.32/day equivalent), US,
  English, in-market audiences: Data Science Courses, Data Science Technologies, Machine Learning and
  Big Data Analytics; target CPV $0.05. Ad creation skipped — campaign cannot run without an ad.
- ⚠️ BLOCKERS for Aseem: (1) the NCA-ADS promo Short is not on YouTube yet — run
  `node scripts/promo-all.js --slug=nvidia-nca-ads-accelerated-data-science-2026 && node scripts/promo-all.js --upload`
  on the Mac, then add the resulting YouTube URL as the video ad; (2) Google showed a "Confirm it's you"
  identity check (skipped; mandatory after Aug 21 2026) — confirm when reviewing; (3) targeting flagged
  "too narrow" — consider broadening. Draft lives under Campaigns → Drafts; do NOT press "Create campaign"
  until the ad is attached (I left it un-created deliberately).

### TikTok — SKIPPED
- ads.tiktok.com session is logged out (Create ad redirected to the login page). Per policy no login was
  attempted. Aseem: log into TikTok Ads Manager in Chrome (and ensure an ad account with payment on file)
  for the next run.

### Notes
- No ad was published and no spend can occur: Meta items are "In draft" behind "Review and publish";
  the Google campaign exists only as a Draft with no ad; TikTok untouched.
- Rotation state: marketing/ads-rotation.json (NCA-ADS consumed for this cycle).
