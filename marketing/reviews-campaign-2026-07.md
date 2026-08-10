# Legitimate ratings campaign — July 2026

Two compliant levers to build real reviews on the 8 live courses. No fake
accounts, no incentivized ratings — both are explicitly allowed by Udemy's
policies and both produce reviews that actually help conversion (planted
5-stars read as fake and can *lower* buyer trust).

Portfolio: AIF-C01, AIGP, AIP-C01, CompTIA SecAI+, AWS SCS-C03, ISACA AAIR,
Databricks GenAI Engineer, NVIDIA NCA-GENL, Salesforce Agentforce Specialist,
Claude Certified Developer (CCDV-F). (Agentforce → r/salesforce, r/AgentforceAI;
CCDV-F → r/ClaudeAI, r/LLMDevs — both now live, added 2026-07-29.)
Week-6 go-lives added 2026-08-02: CompTIA Security+ SY0-701, AWS SAA-C04,
Microsoft AI-300, Google Cloud GenAI Leader, NVIDIA NCP-AIO, Microsoft AI-103, AWS Certified Solutions Architect - Associate (added 2026-08-02), NVIDIA-Certified Associate: Accelerated Data Science (added 2026-08-07), NVIDIA-Certified Professional: OpenUSD Development (added 2026-08-07), AIPMM Certified Digital Product Manager (added 2026-08-07), AIPMM Certified Product Manager (added 2026-08-07), NVIDIA-Certified Professional: Agentic AI (added 2026-08-07), NVIDIA-Certified Professional: Generative AI and LLMs (added 2026-08-07), AWS Certified Machine Learning Engineer - Associate (added 2026-08-07), Google Cloud Professional Machine Learning Engineer (added 2026-08-07), NVIDIA-Certified Professional: AI Infrastructure (added 2026-08-09), NVIDIA-Certified Professional: Accelerated Data Science (added 2026-08-09), NVIDIA-Certified Associate: Generative AI Multimodal (added 2026-08-09).

---

## Step 0 — Onboard newly-live courses (run BEFORE the review levers)

Each weekly run, first check `/instructor/courses/` for any course that has newly
flipped to **Live** and isn't yet in the funnel, and wire it up. All three scripts
are idempotent (they no-op if already done), so re-running every week is safe.

Watch list (submitted → onboard the moment they go Live):
- AWS SAA-C04 — id 7279877 — slug `aws-solutions-architect-associate-saa-c04`
- CompTIA Security+ SY0-701 — id 7279885 — slug `comptia-security-plus-sy0-701`
- AWS ML Engineer (MLA-C01) — slug `aws-machine-learning-engineer-associate-mla-c01`
- Google Cloud Professional ML Engineer — slug `google-cloud-professional-ml-engineer-2026`

For each newly-live course (grab its live course URL from the landing/Promotions page):

```
node scripts/register-course.js --slug=<slug> --udemy=<liveCourseUrl>   # site + promo + reviews registries
node scripts/build-practice-site.js --all                              # then deploy site/ to aseemmankotia.github.io (GitHub connector push_files, owner aseemmankotia — NOT git push)
node scripts/promo-all.js --slug=<slug> && node scripts/promo-all.js --upload   # upload the 9:16 YouTube Short from exports/<slug>/
```

The promo Short is already rendered by autopilot into `exports/<slug>/welcome-promo-short.mp4`;
this step just publishes it (needs the live Udemy URL in the description). If the YouTube
upload fails on auth, run `node youtube-auth.js` once (youtube.force-ssl scope) then retry.
After onboarding, add the course to the coupon/announcement/post levers below.

## Lever 1 — Educational announcement to existing students (send now)

Udemy allows 4 educational announcements/month per course. These reach students
already enrolled. Rule: the announcement must lead with *teaching value*; the
review ask is a short, non-incentivized footer. Never offer anything in exchange
for a review — that violates policy and Udemy strips incentivized reviews.

### Template (personalize the bracketed cert bits per course)

> Subject: A quick exam-week checklist for [CERT] — and a favor
>
> Whether your exam is next week or next month, here's a fast readiness pass you
> can run today:
>
> 1. Can you explain each exam domain out loud without notes? Weak spots are your
>    study priority — the domain the exam weights heaviest is where points are won.
> 2. Have you taken both full-length practice tests under timed conditions? Sitting
>    them at the real time limit surfaces pacing problems the untimed run hides.
> 3. For every practice question you missed, can you say *why* the right answer is
>    right AND why each distractor is wrong? That's the difference between
>    recognizing and knowing.
>
> Work those three and you'll walk in calm.
>
> One small favor: if this course has helped your prep, a rating and a couple of
> honest lines of review genuinely help other learners decide whether it's right
> for them — and tell me what to improve. You can leave one from the course page
> any time. Thank you, and good luck on exam day.
> — Aseem

Per-cert domain callout to drop into point 1 (keeps each announcement specific):
- AIF-C01: "Security, Compliance & Governance and the Bedrock/RAG applications"
- AIGP: "the EU AI Act chapters and the NIST AI RMF / ISO 42001 mappings"
- AIP-C01: "Bedrock, Knowledge Bases and the guardrails/observability material"
- SecAI+: "Securing AI Systems and the AI Governance/Risk domain"
- SCS-C03: "Detection, Incident Response and Data Protection"
- AAIR: "the AI lifecycle risk-management and program-management domains"
- Databricks: "Application Development and Assembling/Deploying with Vector Search"
- NVIDIA NCA-GENL: "Transformers/LLM fundamentals and the NVIDIA stack (NeMo, NIM, Triton)"

Send cadence: one now per course, from Instructor → Course → Communications →
Educational Announcements. (I can send these through the browser on request.)

---

## Lever 2 — Free "Open" coupons in exchange for HONEST feedback

Udemy's free coupons (Free: Open type, 10 redemptions, 5-day expiry) are built
for exactly this: seed genuine early learners who then leave genuine reviews.
The ask is explicitly "honest review," never "5-star review" — incentivizing a
*positive* rating is the violation; inviting an *honest* one is allowed and is
standard new-course practice.

Generate one Free: Open coupon per course (Promotions → Create coupon →
Free: Open). Then post the links where the target learners already are:

### Reddit (value-first, one post per relevant sub, spaced out)
- r/AWSCertifications → AIF-C01, AIP-C01, SCS-C03
- r/salesforce, r/AgentforceAI → Agentforce (once live)
- r/ClaudeAI, r/LLMDevs → CCDV-F (once live)
- r/comptia → SecAI+
- r/dataengineering → Databricks GenAI

Post template (adjust per sub rules — some require a megathread):

> I built a full [CERT] exam-prep course (video per domain + two full-length
> practice tests) and I'm looking for early learners to pressure-test it before
> I push it wider. First 10 people get it free with this coupon — all I ask is
> an honest review afterward, good or bad, so I know what to fix. [FREE COUPON
> LINK]. Happy to answer [CERT] questions in the comments either way.

### LinkedIn (one post, tag the certs)

> New on my channel: exam-prep courses for [list of certs]. I want them battle-
> tested by real candidates before I scale distribution, so the first handful of
> seats on each are free this week in exchange for honest feedback. Comment or DM
> and I'll send a coupon. Studying for one of these? This is the cheapest your
> prep will ever be.

Note on expiry: Free: Open coupons last 5 days and cap at 10 redemptions, so
post them the same day you generate them, and regenerate weekly until each course
has a healthy review base (~10-15 reviews is the trust threshold where buyers
stop hesitating).

---

## What NOT to do (and why)
- No fabricated accounts / self-purchased reviews → Udemy fraud detection flags
  new-account + instructor-coupon + instant-5-star patterns; penalty is
  instructor account termination (all courses).
- No "leave a 5-star review for X" → incentivized/positive-directed reviews are
  stripped and repeat offenses risk suspension.
- Honest-review asks and free-coupon seeding are the compliant equivalents and
  convert better because the reviews read as real.

---

## Free "honest review" coupons — LIVE (created 2026-07-24, expire ~07-29, 10 seats each)

Code on all: **FREEREVIEW10**

- AIF-C01: https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?couponCode=FREEREVIEW10
- AIGP: https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?couponCode=FREEREVIEW10
- AIP-C01: https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?couponCode=FREEREVIEW10
- CompTIA SecAI+: https://www.udemy.com/course/comptia-secai-cy0-001-certification-fast-track/?couponCode=FREEREVIEW10
- AWS SCS-C03: https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/?couponCode=FREEREVIEW10
- ISACA AAIR: https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/?couponCode=FREEREVIEW10
- Databricks GenAI: https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/?couponCode=FREEREVIEW10
- NVIDIA NCA-GENL: https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/?couponCode=FREEREVIEW10

5-day expiry, 10 redemptions each — regenerate weekly until each course has ~10-15 reviews.

---

## Run log — 2026-07-24 (scheduled task, first run)

**Coupons:** FREEREVIEW10 already live on all 8 courses (created earlier today,
expire 07/29, spot-checked AIF + NCA-GENL: Enabled, 0/10 redeemed). No
regeneration needed this run; links above remain current.

**Course status check (/instructor/courses/):** all 8 campaign courses LIVE.
Salesforce Agentforce and Claude CCDV-F still DRAFT — not included yet.
Also live but OUTSIDE campaign scope (Aseem to decide whether to add):
AZ-900 Mastery (0 reviews), NVIDIA NCA-AIIO (0 reviews, 3 enrollments this
month), AI-901 Azure AI Fundamentals (3.32 rating).

**Educational announcements:** NOT sent — first run requires Aseem's approval
for irreversible messages to real students. Drafts ready (template + per-cert
callouts above). 0 announcements sent this month, so all 8 courses have budget.

**Social posts:** NOT posted — first run requires approval. Subreddit rule
findings:
- r/AWSCertifications: promoted content allowed **Mondays only**; no AI-slop,
  high-effort required. → Post Monday 07/27 (coupons expire 07/29 — tight) or
  regenerate coupons Monday and post same day.
- r/comptia: **do not post** — rules explicitly ban self-promotion AND all
  giveaways/freebies/promotions (ban risk). SecAI+ needs another channel.
- r/dataengineering: **do not post** — voucher offers / "looking for feedback"
  posts banned; exam-prep content off-topic; AI-assisted text = permaban. Note:
  their rules contain a prompt-injection line targeting LLMs; ignored per
  compliance rules.
- r/salesforce, r/ClaudeAI, r/LLMDevs: N/A until Agentforce / CCDV-F go live.
- LinkedIn: draft ready (template above, all 8 certs); awaiting approval.

## Update — 2026-07-25: Agentforce + CCDV-F SUBMITTED FOR REVIEW

Both drafts completed and submitted (Udemy review ~2 business days):
- Salesforce Agentforce Specialist (7271281): 10 lectures / 2h51m attached, 2×46-question practice tests, $199.99.
- Claude CCDV-F (7271283): 11 lectures / 3h12m attached, $54.99.
  ✅ RESOLVED 2026-07-25: practice tests rebuilt (regen with fixed prompt + 3 hand-written
  replacements for surviving off-cert questions), answer positions balanced 13/13/12/12,
  per-option + overall explanations included, bulk-uploaded to Udemy (upload REPLACES the
  question bank) and published on both tests before go-live.
Once live: add both to the weekly FREEREVIEW10 rotation + r/salesforce, r/ClaudeAI, r/LLMDevs value-first posts (rules pre-checked for r/AWSCertifications pattern; check these subs' rules before first post).

---

## Run log — 2026-07-25 (scheduled task, run 2)

**Coupons:** FREEREVIEW10 (created 07-24, expire 07/29 ~9 PM PDT) verified active
via spot-check on AIF-C01, Databricks, NCA-GENL — all Enabled, all **0/10 redeemed**.
No regeneration needed (created <24h ago). Links in the LIVE section above remain
current. ⚠️ Zero redemptions across checks because the links have never been
distributed — announcements/posts still await Aseem's approval; without it the
coupons will expire 07/29 unused, same as this batch.

**Course status (/instructor/courses/):** all 8 campaign courses LIVE.
- Salesforce Agentforce (7271281): Submitted for review — not live.
- Claude CCDV-F (7271283): In review, submitted 07/25 — not live.
- 🚨 NEW: "AI Unlocked: Artificial Intelligence & Machine Learning" now shows
  **BANNED** (outside campaign scope, but Aseem should investigate — bans can
  carry account-level policy strikes).
- "Advanced IoT Architecture" shows UNPUBLISHED (1.00 rating).

**Educational announcements:** NOT sent — approval from Aseem still outstanding
(required before first send; he was not present for this run). Drafts remain ready;
0/4 monthly budget used on all 8 courses.

**Social posts:** NOT posted — same outstanding approval. Timing note:
r/AWSCertifications allows promo **Mondays only** → next window Mon 07/27; current
coupons still valid then (expire 07/29). If Aseem approves by Monday, post same day.
r/comptia and r/dataengineering remain no-post (rules ban promos/giveaways).

**Decisions needed from Aseem:**
1. Approve educational announcements (8 courses, template above)?
2. Approve LinkedIn post + r/AWSCertifications Monday post?
3. Investigate BANNED status on "AI Unlocked".
4. Add AZ-900, NCA-AIIO, AI-901 to campaign scope?

## Update — 2026-07-26: AZ-900 + NCA-AIIO refreshes LIVE on Udemy

- AZ-900 (7202905): retitled "AZ-900 Azure Fundamentals 2026: Complete Exam Preparation".
  4 domain sections, 9 new lectures (3h04m), 2×44Q practice tests (65 min / 70%),
  refreshed description + AI disclosure + text-free image. Old 5 lectures deleted.
- NCA-AIIO (7156661): 4 domain sections, 8 new lectures (2h43m), 2×45Q practice tests,
  new subtitle (removed "Pass the..." phrasing), refreshed description + disclosure +
  text-free image. Old 5 lectures deleted.
- Note: lecture order within NCA-AIIO's first two sections is slightly non-canonical
  (fundamentals-first); optional manual drag to fix.
- AI-901 refresh still pending video render on Aseem's machine (content is QA-passed).
- Next: add both refreshed courses to the weekly FREEREVIEW10 rotation + "refreshed"
  educational announcement (announcement still awaiting first-run approval).

## Update — 2026-07-26 (later): AI-901 refresh LIVE — all 3 refreshes complete

- AI-901 (7150221): full swap done. 3 domain sections (Identify AI Concepts 40-45% /
  Implement with Microsoft Foundry 55-60% / Exam Simulation), 9 new lectures (2h36m),
  2×45Q practice tests (65 min / 70% / randomized) bulk-uploaded + published, all 9 old
  lectures + old Introduction section deleted, subtitle de-promised ("Pass the..." →
  "Exam-focused preparation..."), new description with AI disclosure, text-free image.
- Replied (updated existing response) to Saif Ur Rahman's 1★ A/V-sync review noting the
  full 2026 re-record + invitation to honest re-review.
- Promo videos: all 3 refresh promos + Shorts rendered locally (promo-all.js slug fix);
  YouTube upload NOT run — awaiting Aseem's explicit go (public posts).
- Portfolio state: AZ-900, NCA-AIIO, AI-901 all refreshed and live. Agentforce + CCDV-F
  still in Udemy review. Coupon/announcement rotation for refreshed courses still
  awaiting Aseem's first-run approval.

## Update — 2026-07-26 (evening): refresh promo Shorts on YouTube

- YouTube token re-authorized by Aseem (was expired/revoked).
- 3 refresh Shorts uploaded public at 17:36 UTC: AZ-900, NCA-AIIO, AI-901 —
  each linking to its verified Udemy landing page. Older 8 course Shorts
  untouched (upload markers).

## Run — 2026-07-26 (evening): refreshed courses join the campaign (Aseem-approved)

**FREEREVIEW10 coupons created (Free: Open, 10 seats, expire 07/31 ~10:45 AM PDT):**
- AZ-900: https://www.udemy.com/course/azure-fundamentals-mastery-az-900-certification-journey/?couponCode=FREEREVIEW10
- NCA-AIIO: https://www.udemy.com/course/mastering-nvidia-ai-infrastructure-operations-nca-aiio/?couponCode=FREEREVIEW10
- AI-901: https://www.udemy.com/course/ai-901-azure-ai-fundamentals-your-gateway-to-microsoft-ai/?couponCode=FREEREVIEW10

**Educational announcements sent (1 of 4 monthly budget used per course):**
- All 3 refreshed courses, submitted ~11:00 AM PDT (Udemy review pending before delivery).
- Format: refresh news + what's included (teaching value) → 3-point readiness checklist
  → soft honest-review footer. No Udemy links (not permitted in educational
  announcements), no coupon mention, no positive-rating incentive. AI-901 version also
  acknowledges the A/V-sync fix.
- First-run approval satisfied: Aseem explicitly approved announcements + coupon
  rotation for the refreshed courses this session.

**Note:** educational announcements disallow Udemy links, so coupons are NOT in the
announcements — distribute via LinkedIn/Reddit posts (still awaiting separate approval)
or direct shares. Coupons expire 07/31; regenerate weekly per playbook.

## Update — 2026-07-26 (Sunday ~11 AM): LinkedIn post live

- Aseem approved social distribution and asked to shift the window to Sunday morning.
- LinkedIn: posted from Aseem's profile ("Post successful"). Leads with the three 2026
  rebuilds (AZ-900 / AI-901 / NCA-AIIO), FREEREVIEW10 honest-review framing, mentions
  the code works on the other 8 live courses, comment/DM CTA, cert hashtags.
- r/AWSCertifications: NOT shifted to Sunday — sub rules allow promoted content
  Mondays only (ban risk). Post goes out Monday 07/27; the AWS-course coupons
  (created 07/24) remain valid through 07/29, refreshed-course coupons through 07/31.
- r/comptia and r/dataengineering remain no-post per sub rules.

---

## Run log — 2026-08-01 (scheduled task) — ⛔ BLOCKED: Udemy instructor session logged out

**Blocker:** /instructor/courses/ redirected to the passwordless login page
("We'll email aseem.mankotia@gmail.com a code"). Only one connected Chrome
browser; re-auth needs Aseem's email code, and entering credentials is off-limits
for the agent anyway. NOTHING requiring the instructor session could run.

**What was attempted / found without login:**
- Public landing-page probe of the watch list:
  - `aws-solutions-architect-associate-saa-c04` → 404 (not live at that slug).
  - `comptia-security-plus-sy0-701` → slug is TAKEN by a different instructor's
    course (Syed Parvez, practice-test course). If/when Aseem's SY0-701 goes
    live, Udemy will assign it a modified slug — update registries with the
    actual live URL, don't assume the planned slug.
  - MLA-C01 / GCP PMLE slugs not probed (public probes proved non-authoritative).
- Live-status of watch-list courses therefore UNKNOWN this week; Step 0
  onboarding deferred to next run.

**Not done this run (all require instructor login):**
- Coupon refresh: previous FREEREVIEW10 batches expired 07/29 (8 courses) and
  07/31 (3 refreshed courses). NO live free coupons exist right now.
- Educational announcements: none sent. August budget is fresh (4/course).
- LinkedIn/Reddit posts: skipped — no valid coupon links to post. (Reddit timing
  note: r/AWSCertifications is Mondays-only anyway; next window Mon 08/03.)

**Action needed from Aseem:** log back into udemy.com in Chrome (instructor
account). Likely cause of the logout is a navigation to a known session-killing
URL (see CLAUDE.md: /instructor/user/edit-videos/ or /course/create/1). Once
logged in, re-run the weekly task — everything is idempotent and the whole
backlog (Step 0 check, coupons, August announcements, Monday Reddit window)
can catch up in one run.

---

## Run log — 2026-08-02 (Aseem re-logged in; full catch-up run)

**Step 0 / course status (/instructor/courses/):**
- 🎉 NEWLY LIVE: CompTIA Security+ SY0-701 (7279885) and AWS SAA-C04 (7279877).
  NOTE: planned slugs were taken/changed — ACTUAL live URLs:
  - SY0-701 → https://www.udemy.com/course/comptia-security-sy0-701-exam-focused-prep/
  - SAA-C04 → https://www.udemy.com/course/aws-saa-c04-exam-prep-solutions-architect-associate/
- Still DRAFT: NCP-AAI, NCP-GENL, AWS MLA-C01, Google Cloud PMLE, InfoSec M&A.
- AI Unlocked still BANNED; Advanced IoT still UNPUBLISHED (1.00★).
- register-course.js run for both newly-live slugs (reviews registry updated);
  practice site rebuilt with 16 certs incl. sy0-701.html + saa-c04.html.
- Observed on promotions pages: Aseem's own coupons FREETEST33 ($17.99/$34.99,
  expire ~08/22-09/02) active on many courses; AIGP also has AIGP_FREE_JUL26
  free coupon (4/100 redeemed, expires 08/21).

**Coupons created this run (Free: Open, 10 seats, start 08/02 ~7:45 AM PDT,
expire 08/07):** — old FREEREVIEW10 codes can't be reused (Udemy blocks
duplicate codes per course even after expiry) → repeat courses use FREEREVIEW10B.
⚠️ AIF's expired FREEREVIEW10 finished 1/10 redeemed — links were barely
distributed last cycle; distribution is the bottleneck, not coupon supply.

FREEREVIEW10 (first-time coupon courses):
- SY0-701: https://www.udemy.com/course/comptia-security-sy0-701-exam-focused-prep/?couponCode=FREEREVIEW10
- SAA-C04: https://www.udemy.com/course/aws-saa-c04-exam-prep-solutions-architect-associate/?couponCode=FREEREVIEW10
- Agentforce: https://www.udemy.com/course/salesforce-agentforce-specialist-exam-focused-preparation/?couponCode=FREEREVIEW10
- CCDV-F: https://www.udemy.com/course/claude-certified-developer-ccdv-f-complete-exam-prep/?couponCode=FREEREVIEW10
- Google GenAI Leader: https://www.udemy.com/course/google-cloud-generative-ai-leader-exam-prep-2026/?couponCode=FREEREVIEW10
- AI-300: https://www.udemy.com/course/ai-300-mlops-genaiops-engineer-exam-preparation/?couponCode=FREEREVIEW10
- AI-103: https://www.udemy.com/course/ai-103-azure-ai-apps-agents-developer-certification/?couponCode=FREEREVIEW10
- NCP-AIO: https://www.udemy.com/course/ncp-aio-nvidia-ai-operations-professional-certification/?couponCode=FREEREVIEW10

FREEREVIEW10B (courses that had FREEREVIEW10 before):
- AIF-C01: https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?couponCode=FREEREVIEW10B
- AIGP: https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?couponCode=FREEREVIEW10B
- AIP-C01: https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?couponCode=FREEREVIEW10B
- SecAI+: https://www.udemy.com/course/comptia-secai-cy0-001-certification-fast-track/?couponCode=FREEREVIEW10B
- SCS-C03: https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/?couponCode=FREEREVIEW10B
- AAIR: https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/?couponCode=FREEREVIEW10B
- Databricks: https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/?couponCode=FREEREVIEW10B
- NCA-GENL: https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/?couponCode=FREEREVIEW10B
- AZ-900: https://www.udemy.com/course/azure-fundamentals-mastery-az-900-certification-journey/?couponCode=FREEREVIEW10B
- NCA-AIIO: https://www.udemy.com/course/mastering-nvidia-ai-infrastructure-operations-nca-aiio/?couponCode=FREEREVIEW10B
- AI-901: https://www.udemy.com/course/ai-901-azure-ai-fundamentals-your-gateway-to-microsoft-ai/?couponCode=FREEREVIEW10B

(19/19 created successfully; monthly budgets had 2-3 left everywhere.)

**Onboarding (Step 0) results for SY0-701 + SAA-C04:**
- register-course.js: done for both (reviews registry now includes them).
- Practice site: rebuilt (16 certs). Deployed to aseemmankotia.github.io via
  GitHub API: index.html, sitemap.xml, sy0-701.html, saa-c04.html (commits
  cd537b1, c26f88d). ⚠️ REMAINING 37 files still to deploy (8 sy0/saa per-domain
  pages + 29 week-5 pages for AI-300/GenAI Leader/NCP-AIO/AI-103/Agentforce/
  CCDV-F domain pages — the deployed site had been stale since ~07/25). Until
  pushed, some index/sitemap links 404. Fastest fix: from the Mac,
  `cd ~/course-pipeline && node scripts/build-practice-site.js --all` then push
  site/ to the aseemmankotia.github.io repo (or ask Claude to push the rest in
  a fresh session — the local site/ dir is already correct and current).
- Promo Shorts: exports/<slug>/welcome-promo-short.mp4 exist for both, but
  promo-all.js needs api.anthropic.com + YouTube network access → must run ON
  the Mac: `node scripts/promo-all.js --slug=<slug> && node scripts/promo-all.js --upload`
  (also note promo-all printed SAA-C04's URL as the AIF referral link — check
  registry URL before upload).

**Educational announcements (August):** SENT 2026-08-02 via the new bulk
composer — ONE educational announcement ("Your exam-week readiness checklist -
and a small favor") to ALL 19 live courses at once (readiness checklist +
soft honest-review footer, no links, no coupon mention). Uses 1 of 4 August
budget per course. Udemy shows "under review — will be sent once approved."
Note: bulk send means no per-cert domain callout this week; resume
personalized sends next runs if desired.

**Social:**
- LinkedIn: posted 2026-08-02 from Aseem's profile — two new courses
  (SY0-701 + SAA-C04) with FREEREVIEW10 links, honest-review framing,
  "comment/DM for other certs" CTA, hashtags. Aseem approved publishing
  this session.
- Reddit: NOT posted today (Sunday 08/02). r/AWSCertifications allows promo
  Mondays only → window Mon 08/03 (coupons valid through 08/07; AWS-relevant:
  SAA-C04, AIF, AIP, SCS). r/comptia + r/dataengineering remain no-post per
  rules. r/salesforce, r/ClaudeAI, r/LLMDevs rules still unchecked — check
  before first post.

**Follow-ups needed:**
1. (Mac) Push remaining 37 practice-site files to aseemmankotia.github.io.
2. (Mac) promo-all.js upload for the two new courses' YouTube Shorts.
3. Monday 08/03: r/AWSCertifications value-first post with SAA-C04/AIF/AIP/SCS
   FREEREVIEW10(B) links; check r/salesforce + r/ClaudeAI + r/LLMDevs rules.
4. Watch list still pending: MLA-C01, GCP PMLE, NCP-AAI, NCP-GENL (all draft).

---

## Run log — 2026-08-08 (scheduled task)

**Step 0 / course status (/instructor/courses/):**
- The 8 courses that went Live 08/07 were already registered by the 08-07
  weekly marketing check (register-course.js). IDs confirmed this run:
  NCA-ADS 7284909, NCP-OUSD 7284889, AIPMM CDPM 7283479, AIPMM CPM 7283433,
  NCP-AAI 7282241, NCP-GENL 7282045, AWS MLA-C01 7280793, GCP PMLE 7280555.
- Practice site VERIFIED fully deployed: all 141 local site/ files match the
  aseemmankotia.github.io repo blob SHAs (the 37-file backlog from 08-02 was
  cleared by the 08-07 run). No push needed.
- 🐛 FIXED: register-course.js had appended the 8 new courses to promo-all.js's
  SPECIALS array instead of COURSES — `--slug=<new>` failed "Unknown slug".
  Entries moved into COURSES (via COURSES.push after SPECIALS). Committed.
- ⏳ Promo Shorts for the 8 new courses: NOT rendered/uploaded — promo-script
  generation needs api.anthropic.com (unreachable from the sandbox); run ON the
  Mac: `node scripts/promo-all.js --slug=<slug>` per new course, then
  `node scripts/promo-all.js --upload`. Upload markers show only 14 Shorts ever
  uploaded — SY0-701, SAA-C04, AI-300, GenAI Leader, NCP-AIO, AI-103 have
  rendered Shorts awaiting upload too.
- New DRAFTS on the watch list for next runs: AWS DEA-C01 (7290003) and
  Google Cloud ACE (7289999). InfoSec M&A still draft; AI Unlocked still BANNED.

**Coupons:** ⚠️ NEW UDEMY LIMIT DISCOVERED: the coupon system now allows only
ONE Free: Open coupon per course per month ("You've already used your free open
coupon this month" — verified on SY0-701 and Agentforce). The 08/02 batch
consumed August's allowance for all 19 pre-existing courses → weekly Free:Open
regeneration is dead; it's now a MONTHLY cadence per course. Playbook updated
mentally; September 1 = next regeneration window for the 19.
- Created FREEREVIEW10 (Free: Open, 10 seats, expire 08/13 ~6:15 PM PDT) on the
  8 newly-live courses:
  - NCA-ADS: https://www.udemy.com/course/nca-ads-nvidia-accelerated-data-science-exam-prep/?couponCode=FREEREVIEW10
  - NCP-OUSD: https://www.udemy.com/course/ncp-ousd-nvidia-openusd-development-certification-prep/?couponCode=FREEREVIEW10
  - AIPMM CDPM: https://www.udemy.com/course/aipmm-cdpm-exam-prep-digital-product-management/?couponCode=FREEREVIEW10
  - AIPMM CPM: https://www.udemy.com/course/aipmm-cpm-certified-product-manager-exam-prep/?couponCode=FREEREVIEW10
  - NCP-AAI: https://www.udemy.com/course/nvidia-ncp-aai-agentic-ai-certification-prep/?couponCode=FREEREVIEW10
  - NCP-GENL: https://www.udemy.com/course/ncp-genl-nvidia-generative-ai-llms-cert-prep/?couponCode=FREEREVIEW10
  - MLA-C01: https://www.udemy.com/course/aws-certified-ml-engineer-associate-mla-c01-prep/?couponCode=FREEREVIEW10
  - GCP PMLE: https://www.udemy.com/course/google-cloud-professional-ml-engineer-exam-prep/?couponCode=FREEREVIEW10
- 19 other live courses SKIPPED (August Free:Open budget exhausted). Note:
  Free: Targeted (100 redemptions / 31 days) is still available on them —
  Aseem's call whether to use it.
- ⚠️ SY0-701's 08/02 FREEREVIEW10 expired 08/07 at 0/10 redeemed — distribution
  remains the bottleneck, not coupon supply.

**Educational announcements:** ONE bulk educational announcement sent to the 8
newly-live courses only ("Your exam-week readiness checklist - and a small
favor" — checklist + soft honest-review footer, no links). Their first-ever
announcement; 1 of 4 August budget used. Udemy shows "under review". The 19
older courses were deliberately skipped — they received the same checklist on
08/02 and a weekly repeat risks unsubscribe/spam fatigue.

**Social:**
- LinkedIn: POSTED from Aseem's profile ("Post successful") — 8 new courses
  with FREEREVIEW10 links, honest-review framing, comment/DM CTA for the other
  19 courses, cert hashtags. (Posting pattern approved by Aseem 07/26 + 08/02.)
- Reddit: NOT posted. No Reddit post has ever been made for this campaign, and
  first-post approval from Aseem is still outstanding; r/AWSCertifications is
  also Mondays-only (next window Mon 08/10 — MLA-C01's coupon is valid through
  08/13 if Aseem approves by then).

**Decisions needed from Aseem:**
1. ✅ APPROVED + DONE 2026-08-10: first-ever Reddit post published to
   r/AWSCertifications under the Monday-promo rule (rules re-verified in
   sidebar first): value-first MLA-C01 text post (domain weights + pacing
   advice) with the FREEREVIEW10 link, honest-review framing, from u/That-Ad8566.
   Live at https://redd.it/1vkknut — monitor comments for MLA-C01 questions.
   Broader Reddit plan (r/googlecloud, r/ProductManagement etc.) still needs
   rules checks before any post.
2. Use Free: Targeted (100 seats, 31 days) on the 19 courses whose Free:Open
   budget is spent, or wait for September 1?
3. (Mac) Render+upload promo Shorts for the 8 new courses; also upload the 6
   week-6 Shorts already rendered.
4. Adjust campaign cadence: Free:Open coupons are now 1/course/month — suggest
   regenerating on the 1st of each month and timing announcements/posts to that
   window so seats don't expire undistributed.
