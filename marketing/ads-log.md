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

---

## Update — 2026-08-08 (destination change, per Aseem)

**Policy change:** all ads now drive traffic to **https://aseemmankotia.github.io/** (practice site), NOT the Udemy course URL, with the link highlighted in the copy. Scheduled task updated for future runs; existing drafts updated as follows:

- **Meta "NCA-ADS Card Image Ad" (draft):** Website URL changed Udemy → https://aseemmankotia.github.io/ ; Display link set to `aseemmankotia.github.io`. Saved as draft, NOT published. Prior blockers unchanged (connect FB Page, upload `-notext.png` image, paste primary text).
  Revised primary text for Aseem to paste (link on its own line):
  > GPU-accelerated data science is its own exam. NCA-ADS covers RAPIDS, cuDF, cuML and the NVIDIA
  > accelerated stack — and this exam-focused course walks every domain: 12 video chapters plus two
  > full-length practice tests with per-option explanations. Start preparing today.
  >
  > ➜ Free practice questions & course: https://aseemmankotia.github.io/
- **Meta "New Traffic Campaign with recommended settings" (draft):** auto-created stub found in the account (not from our log); its ad set has already ENDED so it's uneditable and can't run. Left untouched — Aseem may discard it from Review and publish.
- **Google Ads draft 10208186673:** no ad attached yet → no final URL exists to change. When adding the video ad, set Final URL to https://aseemmankotia.github.io/ (display path: aseemmankotia.github.io).
- **TikTok:** no draft exists (was skipped — logged out).

---

## Update — 2026-08-08 (Facebook Page created; ad identity fixed)

- Error (#1443121) on publish: no Facebook Page existed on the account. With Aseem's approval, created Page **TechNuggets Academy** (profile.php?id=61593049922633, Page ID 1187947767742236): category Education website, bio "Exam-focused AI & cloud certification prep. Free practice tests at aseemmankotia.github.io", website https://aseemmankotia.github.io/, generated dark-navy/green radial-burst profile picture + cover (site/NVIDIA card theme). Skipped WhatsApp connect + friend invites; Meta marketing emails toggled off.
- In the "NCA-ADS Card Image Ad" draft: turned OFF the stray "Partnership ad" toggle (it was hiding the Page selector) and set Facebook Page = TechNuggets Academy. Saved as draft — NOT published.
- Remaining for Aseem before publish: upload the `-notext.png` card in Ad creative → Media, paste the primary text (see 2026-08-08 destination-change entry above; link line included).

---

## Update — 2026-08-08 (Meta ad PUBLISHED, per Aseem's explicit request)

- Completed the "NCA-ADS Card Image Ad" draft and clicked Publish (Aseem asked directly). Now in Meta ad review ("Processing").
- Creative: 512×512 green radial-burst Page image (native file-picker upload was blocked for automation, so used the Page's image; carries a low-res note for some placements — horizontal/1.91:1 placements may be cropped/skipped). Primary text = compliance-checked copy with "➜ Free practice questions & course: https://aseemmankotia.github.io/" line; headline "NCA-ADS Exam Prep: NVIDIA Accelerated Data Science"; description "Free practice tests at aseemmankotia.github.io"; CTA Learn more; destination https://aseemmankotia.github.io/ (display link aseemmankotia.github.io). AI enhancements/translations off; branding+website-highlights off.
- Budget/schedule unchanged: $10 lifetime, ends Aug 16 2026, US technical audience.
- OPTIONAL LATER: replace the image with `exports/course-images/nvidia-nca-ads-accelerated-data-science-2026-card-notext.png` (750×422) or a 1080×1080 export via manual upload for full placement coverage.
- Still in the account: the uneditable "New Traffic Campaign with recommended settings" stub draft (ad set ended) — safe to discard.

---

## Update — 2026-08-23 (retire course/coupon ads → bundle promotions)

- **Strategy shift:** free/near-free single-course coupon promos retired; 13 learning-path
  **bundles** created on Udemy (ids 34839–34865), sold at a bundle discount Udemy applies at checkout. Domain
  moved to **technuggets.academy** (old ads used aseemmankotia.github.io).
- **Email (Brevo):** new bundle digest built (`scripts/bundle-campaign. (Sandbox can't reach api.brevo.com — run on the Mac.)
- **Social — TO DELETE (external dashboards; no API access here):**
  - Meta: "NCA-ADS Card Image Ad" (ended Aug 16, not spending) + stub "New Traffic Campaign"
    draft → delete/archive. Page TechNuggets Academy (1187947767742236) kept.
  - Google Ads: draft campaign 10208186673 (never published) → remove.
  - TikTok: none.
- **Social — NEW bundle creative:** `marketing/bundle-ads-2026-08.md` (generic + AWS + NVIDIA +
  Google + CompTIA; destination technuggets.academy/#bundles; compliance-checked, no promise
  language). Create on each platform manually or via Claude-in-Chrome.

---

## Run — 2026-08-28 · Cisco CCNA 200-301 (v1.1)

**Course:** `cisco-ccna-200-301-2026` — "CCNA 200-301 (v1.1) Exam Prep: Complete Course"
(newest live course in build-practice-site.js not yet advertised; NCA-ADS was the only
prior entry in ads-rotation.json).
**Destination for all ads:** https://technuggets.academy/
**No active coupon** for `200-301` in `marketing/coupons.json`, so no price is claimed in
the copy — only the free practice tests and a generic "bundle related certs and save".

### Meta (Facebook/Instagram) — DRAFT CREATED ✅ (not published)
- Ad account 65932722. Campaign **"CCNA 200-301 Practice Site Traffic — 2026-08-28"**
  (id `52557800375969`), ad set **"CCNA — IT/Network Pros — $10 lifetime"**
  (`52557800376169`), ad **"CCNA 200-301 Card Image Ad"** (`52557800375769`).
  Status: **In draft** — appears under "Review and publish".
- Objective Traffic → Website; performance goal = maximize landing page views.
- Budget **$10 LIFETIME**, Aug 28 → Sep 5 2026. NOTE: Meta rejects $10 lifetime over
  30 days (min ~$31 / ~$1.03 per day), so the schedule was shortened to 9 days — the
  longest run $10 lifetime allows. Raise the budget if a 30-day flight is wanted.
- Targeting: US + India + UK + Canada + Germany; min age 22 (22–65+); English (All);
  detailed targeting = Cisco Systems, Computer network, Information technology (interests)
  + Network administrator, Network/Telecom Engineer (job titles). Est. audience ~210M.
- Creative: **placeholder** = TechNuggets gold-nugget logo (800×800, 1.91:1 crop).
  Chrome's file-upload tool was unavailable in this session, so the CCNA card could not be
  uploaded. Pre-scaled swap-in files were written to the ClaudeFolder:
  `ccna-fb-1200x675.png` and `ccna-ig-1080x1080.png` (from
  `exports/course-images/cisco-ccna-200-301-2026-card-notext.png`).
- Advantage+ AI text variants **deselected (0 of 5 primary, 0 of 2 headlines)** — Meta's
  generated headlines were "Pass the CCNA 200-301 Exam with Ease" and "Pass with Free
  Practice Tests", both of which violate the no-promise rule. Do NOT enable them.
  AI image generation, overlays, touch-ups, text improvements and translation all off.

**Copy used (Meta):**
> "show ip route" is on the screen and you have 90 seconds. Which route does the router actually install?
>
> CCNA 200-301 (v1.1) exam-focused prep built on real Cisco IOS output — not flashcards. All six domains at Cisco's official weights, hands-on labs you can run in Packet Tracer (no hardware needed), plus 2 full-length, time-boxed practice exams.
>
> ➔ Free practice tests: https://technuggets.academy/
>
> Filter by vendor, take a free practice test, grab the course coupon, or bundle related certs and save. Start preparing today.

- Headline: `CCNA 200-301 v1.1 Exam-Focused Prep`
- Description: `Free practice tests at technuggets.academy`
- CTA: Learn more · Website URL `https://technuggets.academy/` · display link `technuggets.academy`

### Google Ads (YouTube) — BLOCKED, NOT SAVED ⚠️
- Account 238-821-4892. Google has **retired new Video conversion campaigns** — the flow
  auto-converts to **Demand Gen** (serves YouTube incl. Shorts, Discover, Gmail, Display).
- Campaign was fully built: name "CCNA 200-301 Practice Site Traffic — 2026-08-28",
  goal Clicks / Maximize clicks, **$10 campaign-total**, start Aug 28 + "Ends in 1 month",
  locations US/IN/UK/CA/DE (bulk add), language English, audience
  "CCNA / Networking Certification Seekers" (in-market: Network Equipment &
  Virtualization, Network Management, Open Online Courses), single image ad using the site's
  own og-image scanned from technuggets.academy, final URL https://technuggets.academy/,
  business name TechNuggets Academy, CTA "Learn more".
- **Two blockers:**
  1. Google enforces a **minimum total budget of $160** for this campaign/duration —
     $10 lifetime is not accepted. (Budget left at $10 deliberately so nothing can run.)
  2. Google repeatedly demanded **"Confirm it's you"** re-authentication to save; entering
     the account password is out of scope, so the final state showed "Unsaved changes".
- Nothing was published and no spend is possible. Aseem: re-auth in Google Ads, then either
  raise the total budget to ≥$160 or skip Google for this course.
- Headlines drafted (compliance-checked): "CCNA 200-301 Exam-Focused Prep" · "Free CCNA
  Practice Tests" · "Real Cisco IOS, Not Flashcards" · "All 6 CCNA Domains Covered" ·
  "Packet Tracer Labs Included".
  Descriptions: "Exam-focused CCNA 200-301 prep: all six domains, hands-on labs, 2 full
  practice exams." · "Free practice tests and the course coupon at technuggets.academy.
  Start preparing today."
  (Google's own suggestion "Pass-ready practice for the top AI certifications" was NOT used —
  promise language.)

### TikTok — SKIPPED
- ads.tiktok.com redirected to the TikTok for Business login page. Not logged in, so no
  campaign was attempted (per the no-login rule). The 9:16 asset is ready at
  `exports/cisco-ccna-200-301-2026/welcome-promo-short.mp4` (1080×1920, 34 s).

### Needs Aseem's attention
1. **Meta ad image** — swap the placeholder logo for the CCNA card before publishing.
2. **Meta / India** — Ads Manager requires a declaration on whether the ads relate to
   securities & investments ("Review requirements"). Left unanswered; it is a legal
   attestation for the advertiser to make.
3. **Meta / EU** — the ad set includes Germany, so Meta requires advertiser + payer details
   for EU delivery. Left blank for the same reason.
4. **Google** — re-authenticate, then decide: raise total budget to ≥$160 or drop Google.
5. **TikTok** — log in to TikTok Ads Manager so the next run can build the video ad.
6. Ads Manager also shows older campaigns (AZ-204, DVA-C02, NCA-GENM) that were never
   recorded in `ads-rotation.json`, plus the stale NCA-ADS/"New Traffic Campaign" drafts
   flagged for deletion on 2026-08-23.

**Direct links**
- Meta: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=65932722
- Google Ads: https://ads.google.com/aw/campaigns?ocid=8156899860
- TikTok: https://ads.tiktok.com/i18n/perf/creation
