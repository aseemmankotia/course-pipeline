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

---

## 2026-08-29 — Databricks ML Associate Certification: Exam Prep
**Course:** `databricks-ml-associate-2026` (newest live course not yet advertised; Udemy id 7314029,
https://www.udemy.com/course/databricks-ml-associate-certification-exam-prep/)
**Destination for all three ads:** https://technuggets.academy/
**No active Udemy coupon** for this slug in `marketing/coupons.json`, so no specific price was quoted —
copy points at the free practice tests and "the course coupon" generically. No bundle percentage claimed.

### Meta (Facebook/Instagram) — DRAFT CREATED
- Campaign **52558653182569** "Databricks ML Associate Practice Site Traffic — 2026-08-29"
  · Ad set **52558653182769** "Data & ML Engineers — US/IN/UK/CA/DE — Databricks ML"
  · Ad **52558653182969** "Databricks ML Associate — Course Card Image Ad"
- Status **In draft** (never published; the "Publish draft items?" prompt was closed, not confirmed).
- Traffic objective → Website, performance goal "Maximize landing page views".
- **$10 LIFETIME**, Aug 29 – Sep 7 2026. A 30-day window triggered "budget must be at least $31 or your
  ads may not deliver", so the window was shortened to 9 days to keep $10 deliverable (same trade-off as
  the CCNA run). Deliberate deviation from the "30 days" default in the task spec.
- Locations US / India / United Kingdom / Canada / Germany. Min age 18. Page: TechNuggets Academy.
- **Creative is a PLACEHOLDER** (TechNuggets gold-nugget logo, 800×800) — `file_upload` is still
  unavailable in this Chrome session, so the course card could not be uploaded.
- Primary text:
  > AutoML or manual? Feature Store or ad-hoc features? MLflow Tracking or the Model Registry? The
  > Databricks ML Associate exam lives on those judgment calls.
  >
  > Exam-focused prep: 12 chapters mapped to the four scored domains, hands-on labs you can run on free
  > Community Edition, and 2 full-length practice exams with per-domain scoring.
  >
  > Free practice tests + the course coupon:
  > https://technuggets.academy/
  >
  > Start preparing today.
- Headline: "Databricks ML Associate: Exam-Focused Prep"
- Description: "12 domain-mapped chapters + 2 full practice exams. Free practice tests at technuggets.academy"
- CTA: Learn more · Display link: technuggets.academy
- **Rejected Meta's AI suggestion "Pass Databricks ML Associate Exam with Ease"** — promise language.
  Advantage+ text/image generation and translation were all left OFF.

### Google Ads — DRAFT CREATED (but needs re-auth to reopen)
- **Search** campaign "Databricks ML Associate | Search | 2026-08-29", campaignId **281499173749589**,
  draftId **10211270039**. Not published.
- Website traffic objective, **Maximize clicks**, Search network only (Google Display Network unchecked).
- **NEW, worth remembering:** Search offers a **"Campaign total budget"** option that accepted **$10**
  with no minimum — Aug 29 → Sep 28 2026 (30 days). This sidesteps the Demand Gen **$160 minimum total
  budget** that blocked the 2026-08-28 CCNA run. Use Search + campaign total budget for future $10 runs.
- Locations US / India / United Kingdom / Canada / Germany; language English; EU political ads = "No".
- Keywords (phrase match, 10): databricks machine learning associate · databricks ml associate
  certification · databricks certification practice test · databricks ml associate exam prep ·
  databricks certified machine learning associate · databricks ml associate practice questions ·
  mlflow certification course · databricks machine learning certification training ·
  databricks automl course · databricks certification study guide
- Headlines (7): Databricks ML Associate Prep · Free Databricks Practice Test · All 4 Exam Domains
  Covered · MLflow, AutoML & Spark ML · 2 Full-Length Practice Exams · Hands-On Databricks Labs ·
  Exam-Focused ML Cert Prep
- Descriptions (4): "Exam-focused Databricks ML Associate prep: 12 chapters across all four scored
  domains." · "Free practice tests and the course coupon at technuggets.academy. Start preparing today." ·
  "AutoML, Feature Store, MLflow, Hyperopt and Model Serving, with hands-on labs you can run." ·
  "Two full-length practice exams with per-domain scoring and detailed explanations."
- **Removed the account's inherited defaults** "Pass-Ready Practice Tests" (headline) and "Pass-ready
  practice for the certs employers actually ask for" (description) — both promise language. AI asset
  generation was SKIPPED for the same reason.
- **BLOCKER:** Google repeatedly showed **"Confirm it's you"** re-authentication (at the budget step and
  again on exit). Entering the account password is out of scope, so the builder was exited via Cancel.
  The draft exists server-side; Aseem must re-auth, reopen it (Create → Campaign → "Continue from an
  existing campaign draft"), review and publish.

### TikTok — SKIPPED
- ads.tiktok.com redirected to the TikTok for Business login page. Not logged in → no campaign attempted.
- 9:16 asset is ready at `exports/databricks-ml-associate-2026/welcome-promo-short.mp4` (1080×1920).

### Needs Aseem's attention
1. **Meta ad image** — replace the placeholder logo with
   `exports/databricks-ml-associate-2026/databricks-ml-associate-2026-card-notext.png` before publishing.
2. **Meta / India** — the securities-and-investments declaration is still unanswered (advertiser attestation).
3. **Meta / EU** — Germany (and the UK) in the ad set means Meta wants advertiser + payer details for EU delivery.
4. **Google** — re-authenticate, reopen draft 10211270039, verify and publish.
5. **TikTok** — log in to TikTok Ads Manager so a video ad can be built next run.
6. **Meta budget window** — 9 days instead of 30, forced by Meta's ~$1.03/day delivery floor at $10 lifetime.

**Direct links**
- Meta: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=65932722
- Google Ads: https://ads.google.com/aw/campaigns?ocid=8156899860
- TikTok: https://ads.tiktok.com/i18n/perf/creation

---

## 2026-08-29 (b) — NVIDIA PORTFOLIO (all 11 certifications, one ad)
**Not a rotation entry** — an on-request portfolio ad covering the whole NVIDIA catalogue rather
than a single course, so `ads-rotation.json` was NOT touched. Full creative:
`marketing/nvidia-portfolio-ad-2026-08.md`.
**Destination:** https://technuggets.academy/

**The 11 live NVIDIA courses (exam codes used verbatim in the copy)**
Associate: NCA-AIIO · NCA-GENL · NCA-GENM · NCA-ADS
Professional: NCP-AIO · NCP-AII · NCP-AIN · NCP-GENL · NCP-ADS · NCP-AAI · NCP-OUSD

**No price quoted.** 9 of 11 have an active coupon (NCA-GENL $17.99, eight others $34.99, codes
FREETEST33 / FREETEST33B) but they expire Sep 2–16 and NCP-AIN + NCA-AIIO have none — so the copy
points at the site for current coupons instead of naming a figure. No bundle percentage claimed.

### Meta (Facebook/Instagram) — DRAFT CREATED
- Campaign **52558663882369** "NVIDIA Portfolio — All 11 Certs — Practice Site Traffic — 2026-08-29"
  · Ad set **52558663882569** "NVIDIA Cert Seekers — GPU/AI Engineers — US/IN/UK/CA/DE"
  · Ad **52558663882169** "NVIDIA Portfolio — All 11 Exam Codes — Image Ad"
- Status **In draft**. Verified in the Ads table: Delivery "In draft", Budget "$10.00 Lifetime".
- Traffic → Website. **$10 LIFETIME, Aug 29 – Sep 7** (9 days again; a 30-day window trips Meta's
  "budget must be at least $31 or your ads may not deliver").
- Locations Canada / Germany / India / UK / US. Min age 18. Page: TechNuggets Academy. CTA Learn more.
- Headline: "All 11 NVIDIA Certs, One Library"
- Description: "Associate to Professional — GenAI, AI Infrastructure, Data Science. technuggets.academy"
- Primary text:
  > Eleven NVIDIA certifications. One study library.
  >
  > Associate: NCA-AIIO · NCA-GENL · NCA-GENM · NCA-ADS
  > Professional: NCP-AIO · NCP-AII · NCP-AIN · NCP-GENL · NCP-ADS · NCP-AAI · NCP-OUSD
  >
  > Every course is exam-focused: chapters mapped to the official scored domains, hands-on labs,
  > and 2 full-length practice exams with per-domain scoring and explanations.
  >
  > Free practice tests, current coupons and NVIDIA learning-path bundles:
  > https://technuggets.academy/
  >
  > Start preparing today.
- **Creative is again the PLACEHOLDER gold-nugget logo (800×800).** `file_upload` is unavailable in
  this Chrome session (third run in a row) and a media-library search for "nvidia" returned nothing.
- **Rejected Meta's AI headlines** "Get NVIDIA Certified in 1 Step" (implies the course confers the
  cert) and "Prepare for Success with Free Tests". Advantage+ text gen, image gen, enhancements and
  translation all left OFF.
- NOTE: this Advantage+ ad-set flow exposes only Audience *controls* (locations / min age /
  languages) — there is no detailed-interest picker, so NVIDIA/GPU interest targeting could not be
  set. Meta's Advantage+ audience handles it; the exam codes in the copy do the qualifying.

### Google Ads — DRAFT CREATED
- **Search** campaign "NVIDIA Portfolio | All 11 Certs | Search | 2026-08-29",
  campaignId **281499163032172**, draftId **10211250578**. Not published.
- Website traffic, **Maximize clicks**, Search-only (Display unchecked).
- **$10 campaign total budget, Aug 29 → Sep 28 2026** (30 days) — the Search "Campaign total budget"
  path again accepted $10 with no minimum.
- Locations Canada / Germany / India / UK / US; language English; EU political ads = "No".
- Keywords (12, phrase match): nvidia certification · nvidia certified associate · nvidia certified
  professional · nvidia certification practice test · nca-genl exam prep · ncp-aio certification ·
  nvidia ai infrastructure certification · nvidia generative ai certification · nvidia accelerated
  data science certification · nvidia agentic ai certification · nvidia openusd certification ·
  nvidia ai networking certification
- Headlines (7): All 11 NVIDIA Cert Courses · NVIDIA NCA & NCP Exam Prep · Free NVIDIA Practice
  Tests · NCA-GENL, NCP-AII, NCP-AIO · GenAI, Infra & Data Science · Exam-Focused NVIDIA Prep ·
  2 Full Practice Exams Each
- Descriptions (4): "11 NVIDIA certification courses: NCA-AIIO, NCA-GENL, NCA-GENM, NCA-ADS and 7 NCP
  tracks." · "NCP-AIO, NCP-AII, NCP-AIN, NCP-GENL, NCP-ADS, NCP-AAI and NCP-OUSD, all exam-focused." ·
  "Chapters mapped to official scored domains, hands-on labs, 2 full-length practice exams." ·
  "Free practice tests and course coupons at technuggets.academy. Start preparing today."
- Ad strength **Average**; campaign optimization score 95.6%.
- Again removed the account's inherited defaults "Pass-Ready Practice Tests" / "Pass-ready practice
  for the certs employers actually ask for", plus the stale "Get Grounded on Google Cloud", "Stand Up
  and Run" and "AWS AI Practice Tests" headlines. AI asset generation SKIPPED.
- "Confirm it's you" re-auth appeared again at the budget step; Cancelled it — the draft still saved.

### TikTok — not attempted (still logged out; Aseem selected Meta + Google only)

### Verification
Google campaigns table shows "Drafts in progress: 9" and "You don't have any enabled campaigns".
Meta ads table shows the NVIDIA ad as "In draft". **No spend is possible from either.**

### Needs Aseem's attention
1. **Meta image** — swap the placeholder logo. There is no single NVIDIA portfolio card in
   `exports/`; either pick one course card (e.g. `nvidia-nca-genl-...-card-notext.png`) or make a
   portfolio card. Chrome file upload has been unavailable for three sessions.
2. **Google re-auth** — needed before the draft can be reopened and published.
3. **Meta India/EU declarations** — still outstanding from the 2026-08-28 run; they gate EU delivery.
4. **Coupon expiry** — the NVIDIA coupons lapse Sep 2–16, inside both flight windows. If the ads run
   past that, the "current coupons" line still holds (it names no price), but the site should have
   live coupons or the click loses its offer.

---

## 2026-08-31 — Google Cloud Professional Cloud Security Engineer (PCSE)

Course: `google-professional-cloud-security-engineer-2026` — newest live, not-yet-advertised
(exported 2026-08-29). Udemy: https://www.udemy.com/course/google-cloud-security-engineer-exam-prep/ (id 7318107).
Destination for all ads: **https://technuggets.academy/**. Budget $10 LIFETIME/ad, PAUSED/DRAFT only.
Full ready-to-paste copy: `marketing/ad-drafts/google-professional-cloud-security-engineer-2026.md`.

### Platform status — NO drafts created this run (browser step blocked)
- **Meta / Google / TikTok — all BLOCKED before any browser action.** `list_connected_browsers`
  returned TWO connected Chrome extensions (Browser 1 = Windows, Browser 2 = macOS/local). The
  browser-selection safety gate requires a *present user* to choose which browser to drive; this is
  an unattended scheduled run, so I did not guess a browser and did not proceed. No campaign was
  created on any platform. Copy + assets are staged for a quick manual pass.
- Standing walls from prior runs still apply once a browser is selected: Chrome **file_upload has
  been unavailable** (Meta card couldn't be uploaded 3+ sessions), Google throws **"Confirm it's
  you" re-auth** at save, and **TikTok Ads Manager is logged out**.

### Copy used (compliance-checked: no pass/guarantee/first-attempt; no invented coupon %/price)
- **Meta** — Primary: "Securing workloads on Google Cloud? Get exam-ready for the Professional Cloud
  Security Engineer (PCSE) certification. 👉 https://technuggets.academy/ … 2 full-length practice
  exams, mapped domain by domain (IAM & access, VPC Service Controls & Cloud NGFW, CMEK & Secret
  Manager, Security Command Center) … Start preparing today → https://technuggets.academy/".
  Headline: "Google Cloud Security Engineer Exam Prep". CTA: Learn more. Image: `...-card-notext.png`.
- **Google Search** — 7 headlines (Google Cloud Security Prep / PCSE Exam-Focused Course / 2 Full
  Practice Exams / Free Practice Test Online / IAM, VPC-SC & Cloud NGFW / Security Command Center /
  Prepare for PCSE Cert), 2 descriptions, 10 phrase-match keywords, Final URL technuggets.academy,
  $10 campaign-total budget / 30 days.
- **TikTok** — 9:16 `welcome-promo-short.mp4`; caption drives to technuggets.academy, CTA Learn more.

### Needs Aseem's attention
1. **Pick the Chrome browser** — with two extensions connected, an unattended run can't select one.
   Run this interactively (or disconnect one extension) so the drafts can be built.
2. **Meta image upload** — Chrome file_upload has failed repeatedly; upload
   `exports/course-images/google-professional-cloud-security-engineer-2026-card-notext.png` manually.
3. **Google re-auth** — expect the "Confirm it's you" prompt at save; only Aseem can clear it.
4. **TikTok login** — log into TikTok Ads Manager in Chrome first.
5. **No active coupon** — this course has no coupon in `coupons.json`; either add one (site shows the
   deal) or the "grab the course coupon" line should be softened before publishing.

---

## 2026-09-01 — ISC2 CCSP (Certified Cloud Security Professional)

Course: `isc2-ccsp-cloud-security-professional-2026` — newest live, not-yet-advertised
(exported 2026-08-29). Udemy: https://www.udemy.com/course/ccsp-certified-cloud-security-professional-exam-prep-x/ (id 7318105).
Destination for all ads: **https://technuggets.academy/**. Budget $10/ad, PAUSED/DRAFT only.
Ready-to-paste copy: `marketing/ad-drafts/isc2-ccsp-cloud-security-professional-2026.md`.
Browser state this run: single Chrome extension connected (macOS) — no browser-selection block; Meta + Google logged in, TikTok logged out.

### Platform status
- **Meta — DRAFT created (not published).** Campaign `52559575445569` / adset `52559575445769` /
  ad `52559575445369`, "In draft". Traffic → Website (technuggets.academy), Learn more CTA. $10
  LIFETIME, Sep 1–10 2026 (9 days — $10 over 30 days tripped Meta's ≥$30 minimum, so schedule was
  shortened rather than raise the budget). Targeting US/IN/UK/CA/DE (bulk-added countries), 18+,
  Advantage+ audience/placements, FB Page = TechNuggets Academy. Creative = PLACEHOLDER gold-nugget
  logo (Chrome `file_upload` unavailable again this session). **TODO before publish:** upload
  `exports/course-images/isc2-ccsp-cloud-security-professional-2026-card-notext.png`.
- **Google — DRAFT created (not published).** Search campaign "ISC2 CCSP | Search | 2026-09-01",
  campaignId `281499184409054` / draftId `10211964778` (acct 238-821-4892). Website traffic,
  Maximize clicks, Search network only (Display + Search Partners off), US/IN/UK/CA/DE (country-level),
  English, EU-political-ads = No. 10 phrase-match keywords, 7 compliant headlines, 4 compliant
  descriptions (the pre-filled generic assets contained AWS/AI mentions and a "Pass-ready" phrase —
  all replaced with CCSP-specific compliant copy), display path ccsp/exam-prep. CAMPAIGN TOTAL BUDGET
  $10, Sep 1–Oct 1 2026 (30 days). **BLOCKER:** Google's "Confirm it's you" re-auth wall at the budget
  step and on exit — entering the password is out of scope. Aseem must re-auth, re-open the draft, and publish.
- **TikTok — skipped.** ads.tiktok.com redirected to the TikTok for Business login (not logged in).
  9:16 asset ready: `exports/isc2-ccsp-cloud-security-professional-2026/welcome-promo-short.mp4`.

### Copy used (compliance-checked: no pass/guarantee/first-attempt; no invented coupon %/price)
- **Meta** — Primary: "Preparing for the ISC2 CCSP … exam? … 👉 https://technuggets.academy/ … a full
  video course plus 2 full-length practice exams mapped to all six CCSP domains … Try a FREE practice
  test, grab the course, or bundle related cloud-security certs and save. Start preparing today →
  https://technuggets.academy/". Headline: "CCSP Cloud Security Exam Prep". Description: "2 full-length
  practice exams + free practice test. All six domains." CTA: Learn more.
- **Google Search** — Headlines: CCSP Cloud Security Prep / Free CCSP Practice Test / Exam-Focused CCSP
  Course / 2 Full Practice Exams / All Six CCSP Domains / Prepare for ISC2 CCSP / Shared Responsibility
  & IAM. Descriptions: "Exam-focused CCSP prep: video course + 2 full-length practice exams. Start free
  today." / "All six domains mapped — IAM, data security, BCDR, DevSecOps. Try a free practice test." /
  "Study smarter for the ISC2 CCSP at technuggets.academy. Free practice test online." / "Bundle related
  cloud-security certs and save. Prepare at technuggets.academy." Keywords: "ccsp exam prep",
  "ccsp practice test", "ccsp certification", "certified cloud security professional", "isc2 ccsp",
  "ccsp practice questions", "cloud security certification", "ccsp course", "ccsp study guide", "ccsp domains".
- **TikTok** — 9:16 `welcome-promo-short.mp4`; caption drives to technuggets.academy, CTA Learn more.

### Needs Aseem's attention (both drafts await his publish click)
1. **Google re-auth** — clear the "Confirm it's you" prompt, re-open draft `10211964778`, review + publish.
2. **Meta image** — Chrome file_upload keeps failing; swap the gold-nugget placeholder for the CCSP
   text-free card, then publish the "In draft" ad.
3. **TikTok** — log into TikTok Ads Manager in Chrome to enable that platform.
4. **No active coupon** for CCSP in coupons.json — copy names no price (free practice test + bundles).

## 2026-09-03 — Databricks ML Professional Certification Prep (`databricks-ml-professional-2026`)
Newest live course not yet advertised; assets ready. Destination for all ads: https://technuggets.academy/
Full brief: `marketing/ad-drafts/databricks-ml-professional-2026.md`

- **Meta — NOT created.** Browser-selection gate blocked this unattended run: two Chrome
  extensions are connected (Browser 1 = Windows, Browser 2 = macOS/local) and choosing one
  requires a present user (AskUserQuestion). No browser action possible without a pick.
- **Google — NOT created.** Same browser-selection block, plus the recurring "Confirm it's you"
  re-auth wall seen on every prior Google run. Search-campaign copy + keywords ready in the brief.
- **TikTok — NOT created.** Same browser-selection block; TikTok Ads Manager was also logged out
  in prior runs. 9:16 asset ready: `exports/databricks-ml-professional-2026/welcome-promo-short.mp4`.

### Copy used (compliance-checked: no pass/guarantee/first-attempt; no invented coupon %/price)
- **Meta** — Primary leads "Preparing for the Databricks Certified Machine Learning Professional
  exam?", link on its own line (https://technuggets.academy/), value props = exam-focused video
  course + 2 full-length practice exams (MLflow PyFunc, feature tables/point-in-time, single-node
  vs distributed Spark ML, production pipelines + drift), FREE practice test + generic bundles,
  CTA "Start preparing today → https://technuggets.academy/". Headline "Databricks ML Professional
  Exam Prep". CTA Learn more.
- **Google Search** — Headlines: Databricks ML Pro Prep / Free Databricks Practice Test /
  Exam-Focused ML Course / 2 Full Practice Exams / MLflow & Feature Stores / Prepare for Databricks
  ML / Production ML Pipelines. Descriptions: exam-focused prep + 2 practice exams; MLflow/feature
  tables/Spark ML/drift + free test; study at technuggets.academy; bundle & save. 10 phrase-match
  keywords (databricks ml professional, …). Campaign total budget $10, Sep 3–Oct 3.
- **TikTok** — 9:16 `welcome-promo-short.mp4`; caption drives to technuggets.academy, CTA Learn more.

### Needs Aseem's attention
1. **Browser selection** — with two Chrome extensions connected, an unattended run can't pick one.
   Run this cycle interactively (or disconnect the non-target browser) so Meta/Google/TikTok drafts
   can be built. All copy + assets are staged in the brief above.
2. **Google re-auth** — expect the "Confirm it's you" wall; clear it before saving the Search draft.
3. **TikTok login** — log into TikTok Ads Manager in Chrome to enable that platform.
4. **No active coupon** for this course — copy names no price (free practice test + bundles).

## 2026-09-05 — OCI 2025 Generative AI Professional 1Z0-1127-25 (`oracle-oci-genai-professional-1z0-1127-2026`)
Newest live course not yet advertised. Destination for all ads: https://technuggets.academy/
Full brief: `marketing/ad-drafts/oracle-oci-genai-professional-1z0-1127-2026.md`
This session: only ONE Chrome browser connected (macOS/local) — no browser-selection block. Meta + Google + TikTok all probed.

- **Meta — DRAFT created (not published).** Campaign `52560920578969` / adset `52560920579169` /
  ad `52560920579369`, status "In draft". Traffic objective, Website conversion, Learn more CTA,
  dest https://technuggets.academy/. $10 LIFETIME, Sep 5–14 (9 days; $10/30d tripped Meta's $30 min).
  Targeting US/IN/UK/CA/DE (all 5 country-level added), 18+, Advantage+ audience/placements, English.
  FB Page = TechNuggets Academy. Primary text + headline + description = the compliant copy below.
  Creative = PLACEHOLDER gold-nugget logo (800x800 from library) — Chrome `file_upload` unavailable
  this session, so the OCI card couldn't be uploaded. **Swap in
  `exports/course-images/oracle-oci-genai-professional-1z0-1127-2026-card-notext.png` before publishing.**
- **Google — DRAFT created (not published), budget blocked by re-auth.** Search campaign
  "OCI GenAI | Search | 2026-09-05", campaignId `281499201177260` / draftId `10212568995`
  (acct 238-821-4892). Website traffic, Maximize clicks, Search network ONLY (Display + Search
  Partners unchecked), locations US/IN/UK/CA/DE (country-level), English, EU political ads = No.
  10 phrase-match keywords, 7 compliant headlines + 4 compliant descriptions. **IMPORTANT: the
  auto-prefilled headlines/descriptions were off-topic + non-compliant** (contained "Pass-Ready
  Practice Tests", "AWS AI Practice Tests", "Get Grounded on Google Cloud") — ALL replaced with
  OCI-specific compliant assets. Display path oci-genai/exam-prep. Campaign TOTAL budget $10,
  Sep 5–Oct 5. BLOCKER: the recurring Google "Confirm it's you" re-auth wall fired at the budget-save
  step ("Changes failed to save"); password entry is out of scope, so Aseem must re-auth, re-open the
  draft, confirm the $10 budget persisted, and publish.
- **TikTok — skipped.** ads.tiktok.com redirected to the TikTok for Business login page (not logged
  in in Chrome). 9:16 asset ready: `exports/oracle-oci-genai-professional-1z0-1127-2026/welcome-promo-short.mp4`.

### Copy used (compliance-checked: no pass/guarantee/first-attempt; no invented coupon %/price)
- **Meta** — Primary leads "Preparing for Oracle's 1Z0-1127-25 OCI Generative AI Professional
  certification?"; four official exam domains (LLM fundamentals, OCI Generative AI Service console/
  API/SDK, RAG with Oracle DB 23ai AI Vector Search, OCI Generative AI Agents); 2 full-length
  practice exams; link on its own line (https://technuggets.academy/); FREE practice test + generic
  bundles; CTA "Start preparing today → https://technuggets.academy/". Headline "OCI Generative AI
  Professional — Exam Prep". CTA Learn more.
- **Google Search** — Headlines: OCI Generative AI Prep / OCI GenAI Pro 1Z0-1127 / Free OCI GenAI
  Practice Test / 2 Full Practice Exams / RAG & Vector Search Course / OCI GenAI Agents Course /
  Exam-Focused OCI AI Prep. Descriptions: exam-focused prep for 1Z0-1127-25 + 2 practice exams;
  LLMs/OCI GenAI Service/RAG 23ai/GenAI Agents; free test at technuggets.academy; bundle & save.
  10 phrase-match keywords (oci generative ai professional, 1z0-1127-25, …). Total budget $10, Sep 5–Oct 5.
- **TikTok** — 9:16 `welcome-promo-short.mp4`; caption drives to technuggets.academy, CTA Learn more.

### Needs Aseem's attention
1. **Meta image** — Chrome file_upload unavailable again; swap the gold-nugget placeholder for the
   OCI text-free card, then publish the "In draft" ad.
2. **Google re-auth** — clear the "Confirm it's you" wall, re-open draft `10212568995`, confirm the
   $10 Sep 5–Oct 5 total budget saved (it showed "Changes failed to save"), review + publish.
3. **TikTok login** — log into TikTok Ads Manager in Chrome to enable that platform.
4. **No active coupon** for this course — copy names no price (free practice test + 2 practice exams + bundles).
