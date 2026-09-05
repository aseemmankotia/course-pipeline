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
Microsoft AI-300, Google Cloud GenAI Leader, NVIDIA NCP-AIO, Microsoft AI-103, AWS Certified Solutions Architect - Associate (added 2026-08-02), NVIDIA-Certified Associate: Accelerated Data Science (added 2026-08-07), NVIDIA-Certified Professional: OpenUSD Development (added 2026-08-07), AIPMM Certified Digital Product Manager (added 2026-08-07), AIPMM Certified Product Manager (added 2026-08-07), NVIDIA-Certified Professional: Agentic AI (added 2026-08-07), NVIDIA-Certified Professional: Generative AI and LLMs (added 2026-08-07), AWS Certified Machine Learning Engineer - Associate (added 2026-08-07), Google Cloud Professional Machine Learning Engineer (added 2026-08-07), NVIDIA-Certified Professional: AI Infrastructure (added 2026-08-09), NVIDIA-Certified Professional: Accelerated Data Science (added 2026-08-09), NVIDIA-Certified Associate: Generative AI Multimodal (added 2026-08-09), PMI Certified Professional in Managing AI (added 2026-08-14), GSDC Certified Forward Deployed Engineer (added 2026-08-14), AWS Certified Data Engineer - Associate (added 2026-08-14), Google Cloud Certified - Associate Cloud Engineer (added 2026-08-14), Microsoft Certified: Fabric Analytics Engineer Associate (added 2026-08-16), Google Cloud Certified - Professional Data Engineer (added 2026-08-16), Microsoft Certified: AI Business Professional (added 2026-08-20), Microsoft Certified: AI Transformation Leader (added 2026-08-20), AWS Certified Developer - Associate (added 2026-08-20), Google Cloud Certified - Professional Cloud Architect (added 2026-08-22), HashiCorp Certified: Terraform Associate (004) (added 2026-08-22), Microsoft Certified: Azure Solutions Architect Expert (added 2026-08-22), AWS Certified SysOps Administrator - Associate (added 2026-08-22), CompTIA Network+ (added 2026-08-22), CompTIA A+ (Core 1) (added 2026-08-23), CompTIA A+ (Core 2) (added 2026-08-23), Microsoft Certified: Azure Administrator Associate (added 2026-08-23), Microsoft Certified: Azure Developer Associate (added 2026-08-23), NVIDIA-Certified Professional: AI Networking (added 2026-08-27), AWS Certified Cloud Practitioner (added 2026-08-27), Cisco Certified Network Associate (CCNA) (added 2026-08-27), Microsoft Certified: Azure AI Fundamentals (added 2026-08-27), NVIDIA-Certified Associate: AI Infrastructure and Operations (added 2026-08-27), Microsoft Certified: Azure Fundamentals (added 2026-08-27), Oracle Cloud Infrastructure 2025 AI Foundations Associate (added 2026-08-29), Databricks Certified Machine Learning Associate (added 2026-08-29), NVIDIA-Certified Professional: AI Rack and Interconnect (added 2026-08-30), ISC2 Certified Cloud Security Professional (CCSP) (added 2026-08-30), Google Cloud Certified - Professional Cloud Security Engineer (added 2026-08-30), Oracle Cloud Infrastructure 2025 Generative AI Professional (added 2026-09-02), Databricks Certified Machine Learning Professional (added 2026-09-02).

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

---

## Run log — 2026-08-14 (scheduled task)

**Step 0 / course status (/instructor/courses/):** instructor session healthy (no logout).
NEWLY LIVE and onboarded this run (register-course.js → build-practice-site.js COURSES,
promo-all.js COURSES, reviews registry; live URLs read from each Promotions page):
- PMI-CPMAI (id 7294235) → https://www.udemy.com/course/pmi-cpmai-certification-exam-prep-masterclass/
- GSDC CFDE (id 7294211) → https://www.udemy.com/course/gsdc-cfde-certification-forward-deployed-engineer-prep/
- AWS DEA-C01 (id 7290003) → https://www.udemy.com/course/aws-certified-data-engineer-associate-dea-c01-prep/
- Google Cloud ACE (id 7289999) → https://www.udemy.com/course/google-cloud-ace-associate-cloud-engineer-exam-prep/
Already onboarded earlier (08/09), coupons added this run: NCA-GENM (7292669), NCP-AII (7292675),
NCP-ADS professional (7292673). Still DRAFT/submitted: Google Cloud PDE (draft), AB-730 + AB-731
(submitted for review) — onboard when they flip to Live.

**Coupons created this run (FREEREVIEW10, Free: Open, 10 seats, 2026-08-14 → 2026-08-19):**
- PMI-CPMAI:  https://www.udemy.com/course/pmi-cpmai-certification-exam-prep-masterclass/?couponCode=FREEREVIEW10
- GSDC CFDE:  https://www.udemy.com/course/gsdc-cfde-certification-forward-deployed-engineer-prep/?couponCode=FREEREVIEW10
- DEA-C01:    https://www.udemy.com/course/aws-certified-data-engineer-associate-dea-c01-prep/?couponCode=FREEREVIEW10
- Google ACE: https://www.udemy.com/course/google-cloud-ace-associate-cloud-engineer-exam-prep/?couponCode=FREEREVIEW10
- NCA-GENM:   https://www.udemy.com/course/nca-genm-nvidia-generative-ai-multimodal-exam-prep/?couponCode=FREEREVIEW10
- NCP-AII:    https://www.udemy.com/course/ncp-aii-nvidia-ai-infrastructure-professional-prep/?couponCode=FREEREVIEW10
- NCP-ADS:    https://www.udemy.com/course/ncp-ads-nvidia-accelerated-data-science-prep/?couponCode=FREEREVIEW10
(7/7 created OK; Free: Open was still available on all 7 — the 4 new ones had never had one,
and the 3 NVIDIA courses added 08/09 had unused Free:Open budget this month.)
- SKIPPED (August Free:Open budget already spent — 1/course/month limit; next window Sept 1):
  the ~24 older live courses that received Free:Open on 08/02 or 08/08.

**Practice site (build-practice-site.js --all):** rebuilt to 31 certs / 186 files.
- BUG FOUND + FIXED: register-course.js anchored its build-practice-site.js insert on the generic
  `\n];`, and lastIndexOf now matches the newer VENDOR_ACCENT array's close (added ~08/13) instead
  of COURSES — so the 4 new course objects were injected INTO VENDOR_ACCENT and never rendered
  (index stuck at 27 certs, no pages). Fixed by (a) moving the 4 objects into COURSES, (b) adding a
  `// __COURSES_END__` sentinel before the COURSES `];`, and (c) re-anchoring register-course.js's
  practice-site patch on that sentinel so it can't recur. Both scripts pass `node --check`.
- DEPLOYED to aseemmankotia.github.io via GitHub push_files (commit on main): index.html (now 31
  certs incl. the 4 new courses), sitemap.xml (156 URLs), robots.txt. The 4 new courses now show on
  the homepage + sitemap with working Udemy links.
- ⏳ NOT yet deployed: the 23 per-course practice pages for the 4 new courses (4 main + 19 long-tail
  domain pages). The sandbox mount blocks file deletion (build rmSync EPERM), so the site was built
  in a temp root; pushing 23 JS-laden HTML files losslessly via inline push_files is impractical/
  risky. FOLLOW-UP (Mac, fast): `cd ~/course-pipeline && node scripts/build-practice-site.js --all`
  (bug is fixed now) then push site/ to aseemmankotia.github.io. Until then, the "Free 12-question
  practice test" links for PMI-CPMAI/CFDE/DEA-C01/ACE 404 (their Udemy course links work).

**Promo Shorts:** NOT rendered/uploaded for the 4 new courses — promo-all.js needs api.anthropic.com
+ YouTube, unreachable from the sandbox. FOLLOW-UP (Mac): `node scripts/promo-all.js --slug=<slug>`
for each of the 4, then `node scripts/promo-all.js --upload`.

**Educational announcements:** NONE sent. The 4 newly-live courses have ~0-2 enrollments each, so an
announcement reaches almost no one (low value now); the ~24 older courses already got the checklist
announcement on 08/02 or 08/08 and a weekly repeat risks unsubscribe/spam fatigue. Also, Aseem was
not present this run to approve irreversible sends. Recommend sending a first educational
announcement to the new courses once they build an enrolled base.

**Social posts:** NONE posted — irreversible public posts need Aseem's approval and he was not
present. Reddit r/AWSCertifications is Mondays-only (next window Mon 08/18; DEA-C01's FREEREVIEW10
expires 08/19 — tight). The 7 FREEREVIEW10 links above are ready for a LinkedIn post +, on Monday,
a value-first r/AWSCertifications post for DEA-C01 (AWS-relevant). Awaiting Aseem's go.

**Decisions needed from Aseem:**
1. (Mac) Deploy the 23 new-course practice pages: `node scripts/build-practice-site.js --all` + push
   site/ to aseemmankotia.github.io. Also render+upload the 4 promo Shorts.
2. Approve a LinkedIn post (7 FREEREVIEW10 links, honest-review framing) and a Monday
   r/AWSCertifications post for DEA-C01? (Coupons expire 08/19.)
3. Free:Open is 1/course/month — the ~24 older courses regenerate Sept 1. Use Free:Targeted
   (100 seats/31 days) in the meantime, or wait?

**Update — 2026-08-14 (later): social distribution approved + LinkedIn posted.**
- Aseem approved social distribution this session.
- LinkedIn: POSTED from Aseem's profile ("now" in feed, ACE link-preview card rendered) —
  the 4 newly-live courses with FREEREVIEW10 links + honest-review framing, the 3 NVIDIA
  free-this-week courses offered via comment/DM, "25+ more live" CTA, cert hashtags.
- Reddit: NOT posted yet — r/AWSCertifications allows promo Mondays only (next window
  Mon 08/18). Plan: value-first DEA-C01 post with the FREEREVIEW10 link on 08/18 (coupon
  expires 08/19, so post early that day). Other subs' rules unchecked — verify before posting.

---

## Run log — 2026-08-21 (scheduled task) — ⛔ Udemy actions BLOCKED (no confirmable browser; Aseem absent)

**Why blocked:** This was an unattended scheduled run. Two Chrome extensions are
connected — "Browser 1" (Windows, remote) and "Browser 2" (macOS, local, where the
instructor session lives). The browser-selection safety guard requires Aseem to
confirm which browser to drive, and he was not present to confirm, so NO Udemy
instructor-session action could run this pass (course-status check, coupon creation,
announcements, and posts all need that session). Sensitive/irreversible actions
(announcements, LinkedIn/Reddit posts) also require his approval, which was likewise
unavailable. Consistent with the 08-01 and (partial) 08-14 precedents.

**Local funnel state VERIFIED (idempotent, safe — done this run):**
- All 36 portfolio courses are fully registered across all three registries. The 5
  newest (registered on the Mac 08-16→08-20, portfolio edits were uncommitted) are
  present in build-practice-site.js COURSES, promo-all.js COURSES, and the reviews
  portfolio line:
  - microsoft-dp-600-fabric-analytics-engineer-2026 (DP-600 / Fabric Analytics)
  - google-cloud-professional-data-engineer-2026 (PDE)
  - microsoft-ab-730-ai-business-professional-2026 (AB-730)
  - microsoft-ab-731-ai-transformation-leader-2026 (AB-731)
  - aws-certified-developer-associate-dva-c02-2026 (DVA-C02)
- Each of the 5 has its promo Short already rendered
  (exports/<slug>/welcome-promo-short.mp4) + shell-spec + videos. register-course.js
  is effectively a no-op for the whole portfolio → nothing to register this run.
- ⚠️ LIVE status of the 5 newest is UNCONFIRMED (needs the instructor session). As of
  08-14: AB-730/AB-731 were "submitted for review", Google PDE was draft, DP-600 not
  yet noted live. They may have flipped to Live since; verify on /instructor/courses/
  next attended run and, for any newly-live one, create its first FREEREVIEW10 coupon
  + upload its Short.

**Practice-site build/deploy:** NOT run in-sandbox. `build-practice-site.js --all`
fails at `fs.rmSync(site/)` with EPERM (the mounted folder blocks file deletion —
known limitation). Site build + deploy remains a Mac step:
`cd ~/course-pipeline && node scripts/build-practice-site.js --all` then push site/
to aseemmankotia.github.io. This also clears any per-course-page deploy backlog for
the 5 newest courses.

**Coupons:** NONE created (no instructor session). Reminder of budget reality
(discovered 08-08): Free:Open is 1 coupon/course/month. The ~31 older courses that
got Free:Open on 08-02/08-08/08-14 are spent until **Sept 1**. Only a genuinely
newly-live course with no August Free:Open would have budget — i.e. any of the 5
newest that are now Live. Nothing actionable without the browser.

**Educational announcements:** NONE sent (no session; Aseem absent for approval).
The ~31 older courses already received August checklist announcements; a repeat
risks unsubscribe/spam fatigue. Recommend a first announcement to the 5 newest once
they are Live and have an enrolled base.

**Social posts:** NONE posted (irreversible; needs approval + session). The Mon
08-18 r/AWSCertifications window for DEA-C01 (planned 08-14) has passed; next Monday
promo window is **08-24**. r/comptia + r/dataengineering remain no-post per their rules.

**Decisions / follow-ups needed from Aseem (attended run):**
1. Log into / confirm the correct Chrome (the local macOS one) so the weekly Udemy
   levers can run; re-run this task — everything is idempotent and will catch up.
2. Confirm which of DP-600, Google PDE, AB-730, AB-731, DVA-C02 are now Live →
   create their first FREEREVIEW10 coupon + upload their promo Short.
3. (Mac) `node scripts/build-practice-site.js --all` + push site/ to
   aseemmankotia.github.io (clears per-course-page deploy backlog); then
   `node scripts/promo-all.js --slug=<slug>` + `--upload` for any Shorts not yet on YouTube.
4. Approve the recurring LinkedIn post + the 08-24 r/AWSCertifications value-first
   post once fresh coupons exist.
5. Sept 1: bulk Free:Open regeneration window for the ~31 older courses (or use
   Free:Targeted 100 seats/31 days sooner if desired).

---

## Run log — 2026-08-28 (scheduled task) — ⛔ Udemy actions BLOCKED (no confirmable browser; Aseem absent) + ⚠️ STRATEGY CONFLICT flagged

**Why blocked (same as 08-01 / 08-21):** Unattended scheduled run. Two Chrome
extensions are connected — "Browser 1" (Windows, remote, deviceId a9a4467a…) and
"Browser 2" (macOS, local, deviceId 308b006e…, where the instructor session lives).
The browser-selection safety guard requires Aseem to confirm which browser to drive,
and he was not present, so I did NOT drive any browser. Every instructor-session
action therefore could not run this pass: /instructor/courses/ status check, Free:Open
coupon creation, educational announcements. Irreversible actions (announcements,
LinkedIn/Reddit posts) also require Aseem's explicit approval, which was likewise
unavailable. I deliberately did not fire an interactive browser-selection prompt into
an empty room.

**⚠️ STRATEGY CONFLICT to resolve (NEW — flag for Aseem):** The repo strategy changed
AFTER the last campaign run and now partially contradicts this task's playbook:
- 2026-08-23 (commit 9175460) + 2026-08-26 (6be2159): "Retire free-coupon strategy;
  add 20%-off learning-path bundles." `ClaudeFolder/bundle-strategy-2026-08.md` states
  it "supersedes the weekly FREETEST33 free/near-free coupon campaign," and
  build-practice-site.js had EVERY site-facing `coupon:{…}` block removed (no more
  per-course paid-discount coupons, urgency timers, or "fresh coupons every week" copy).
  The site now sells 13 native learning-path BUNDLES at ~20% off + free practice tests.
- IMPACT on this task's copy rules: the task file still lists "the per-course Udemy
  COUPON with a real price (e.g. $34.99)" as a promotable discount — that lever is
  RETIRED on the site. Any future LinkedIn/Reddit copy should promote (a) the free
  practice tests, (b) learning-path bundles mentioned generically (NO fixed % / no
  computed savings, per task rules — even though the strategy doc's internal table
  shows 20%, Udemy sets the live bundle price), and (c) the honest-review FREE seats
  for newly-live courses. Do NOT cite a per-course paid coupon price.
- The honest-review Free:Open (FREEREVIEW10) lever is NOT retired: the 2026-08-24
  GO-LIVE doc (post-dates the retirement) still lists "Create the honest-review 'Open'
  coupon and sync it to the site (node scripts/sync-coupons.js)" as a per-course
  post-launch step. So review-seeding free coupons continue; only the site-facing PAID
  discount coupons were retired. Recommend Aseem confirm this reading so next runs stay
  consistent.

**Local funnel state VERIFIED (idempotent, safe — done this run, no writes):**
- 51 courses registered in build-practice-site.js COURSES. The recent go-live batch is
  ALREADY wired into the site registry (register-course.js kept current on the Mac):
  nvidia-ncp-ain-ai-networking-2026, aws-cloud-practitioner-clf-c02-2026,
  cisco-ccna-200-301-2026, comptia-a-plus-core-1-220-1201-2026,
  comptia-a-plus-core-2-220-1202-2026, microsoft-az-104-azure-administrator-2026,
  microsoft-az-204-azure-developer-2026 — all present. Nothing to register this run.
- 5 course-configs exist but are NOT yet in any registry (candidates to onboard once
  they flip to Live AND a browser is confirmable): databricks-ml-associate-2026,
  databricks-ml-professional-2026, oracle-oci-ai-foundations-1z0-1122-2026,
  oracle-oci-genai-professional-1z0-1127-2026,
  microsoft-ab-900-copilot-agent-administration-fundamentals-2026. Live status UNKNOWN
  (needs instructor session). register-course.js also needs each one's real live URL.

**Practice-site build/deploy:** NOT run — `build-practice-site.js --all` fails in the
sandbox at `fs.rmSync(site/)` (EPERM; the mount blocks file deletion). Remains a Mac
step: `cd ~/course-pipeline && node scripts/build-practice-site.js --all` then push
site/ to aseemmankotia.github.io.

**Coupons:** NONE created (no session). Budget reality (08-08): Free:Open is
1 coupon/course/month; the ~40+ older courses that got one earlier are spent until
Sept 1. A genuinely newly-live course with no August Free:Open would still have budget.

**Educational announcements:** NONE sent (no session; Aseem absent for approval).

**Social posts:** NONE posted (irreversible; needs approval + session). No Reddit
window actioned. r/comptia + r/dataengineering remain no-post per their rules.

**Decisions / follow-ups needed from Aseem (attended run):**
1. CONFIRM the strategy reading above: paid per-course coupons retired (bundles + free
   practice tests + honest-review free seats are the live levers). Update this playbook's
   copy templates so posts stop referencing a per-course paid coupon price.
2. Confirm the correct Chrome (local macOS "Browser 2") at the start of the next
   attended run so the weekly Udemy levers can run; everything is idempotent and catches up.
3. Confirm which of the 5 unregistered configs (Databricks ML Assoc/Pro, OCI AI
   Foundations, OCI GenAI Pro, AB-900) are now Live → register-course.js with the real
   live URL, create the first FREEREVIEW10 Free:Open coupon, sync-coupons, add to a
   learning-path bundle if applicable.
4. (Mac) `node scripts/build-practice-site.js --all` + push site/ to
   aseemmankotia.github.io; render+upload any pending promo Shorts.
5. Sept 1: Free:Open regeneration window for courses whose August allowance is spent.

## Update — 2026-08-28 (later, attended): Aseem confirmed browser + decisions; announcement SENT

Aseem returned and directed "drive local macOS Chrome" (deviceId 308b006e). Instructor
session was HEALTHY (no logout). Decisions captured via question prompts:
- **Coupons: NONE this run** — hold Free:Open regeneration to Sept 1 (Free:Open is
  1/course/month with a 5-day expiry; creating on 08-28 would burn the August slot right
  before the reset and only helps if distributed). No coupons created.
- **Distribution: educational announcement only** (no LinkedIn/Reddit this run).
- **Strategy: KEEP paid per-course coupons** as a promotable lever in copy — Aseem chose
  NOT to retire them from the messaging templates despite the site-side removal (commit
  9175460). So this playbook's post-copy templates are left UNCHANGED. (Note the standing
  inconsistency: build-practice-site.js no longer renders per-course paid coupons on the
  site — only bundles + free practice tests — so any paid-coupon mention in a post must
  point to a coupon link that still exists on Udemy, not to the site.)

**Course status (/instructor/courses/, newest-first):** the recent go-live batch is all
LIVE and already registered (CCNA, CLF-C02, NCP-AIN, AZ-104, AZ-204, A+ Core 1/2,
Network+, SOA-C02, DVA-C02, AZ-305, Terraform 004, PCA, DP-600, PDE, AB-730/731). Two
previously-unregistered configs are NOW LIVE (0 reviews, 0 enrollments):
Databricks ML Associate ($89.99) and Oracle Cloud AI Foundations 1Z0-1122 ($49.99).
Still not live (draft/submitted, not in newest list): databricks-ml-professional-2026,
oracle-oci-genai-professional-1z0-1127-2026, microsoft-ab-900-copilot-agent-...-2026.
NOTE: the 2 newly-live courses are LIVE on Udemy but NOT yet registered in the funnel
(register-course.js + site build/deploy + promo Short) — onboarding still owed on the Mac
(build/deploy fails in sandbox: EPERM on rmSync).

**Educational announcement — SENT (Udemy: "under review, will be sent once approved"):**
ONE bulk educational announcement to **26 never-announced courses** (every course live
since the 08-08 send that had not yet received an August announcement). Subject: "Your
exam-week readiness checklist - a small favor". Body = 3-point readiness checklist
(explain each domain; both timed practice tests; know why each distractor is wrong) +
soft honest-review footer. NO links, NO coupon mention, NO positive-rating incentive —
compliant. Uses 1 of 4 August budget on each of the 26. Recipients:
Databricks ML Associate, Oracle Cloud AI Foundations, CCNA 200-301, AWS CLF-C02, NCP-AIN,
AZ-204, AZ-104, A+ Core 2, A+ Core 1, Network+ N10-009, AWS SOA-C02, DVA-C02, AZ-305,
Terraform 004, Google PCA, DP-600, Google PDE, AB-731, AB-730, PMI-CPMAI, GSDC CFDE,
NCP-AII, NCP-ADS, NCA-GENM, AWS DEA-C01, Google ACE. (Bulk send → no per-cert domain
callout this week, per the 08-02 precedent.)

**Coupons:** none. **Social posts:** none (Aseem chose announcement-only).

**Follow-ups for Aseem (Mac):**
1. Onboard the 2 newly-live courses (Databricks ML Associate, OCI AI Foundations 1Z0-1122):
   `npm run go-live -- --slug=<slug> --udemy=<liveUrl> --promo --announce-live` (or
   register-course.js + build-practice-site.js --all + push site/ + promo-all). Add each
   to the relevant BUNDLE and run `npm run sync-coupons`.
2. Sept 1: Free:Open regeneration window for the whole live portfolio; time a distribution
   post to that window so seats don't expire undistributed.
3. Onboard databricks-ml-professional, oracle-oci-genai-professional, AB-900 when they
   flip to Live.

---

## Run log — 2026-09-04 (scheduled task, unattended; Aseem absent)

**Browser:** Exactly ONE Chrome connected this run — "Browser 1" (macOS, local,
deviceId 308b006e = the known instructor-session machine). No browser-selection
ambiguity (unlike 08-01/08-21/08-28), so I drove it. Instructor session HEALTHY
(no logout). All read-only status checks done; only irreversible/undistributable
levers were held (see below).

**Step 0 — course status (/instructor/courses/, searched by name):**
Six courses are LIVE with 0 reviews. THREE are already registered in the funnel
(build-practice-site.js COURSES, `live:true`) — onboarded earlier on the Mac:
- Oracle Cloud AI Foundations 1Z0-1122 ($49.99) → https://www.udemy.com/course/oracle-cloud-ai-foundations-1z0-1122-25-exam-prep/
- Databricks ML Associate ($89.99) → https://www.udemy.com/course/databricks-ml-associate-certification-exam-prep/
- Databricks ML Professional ($99.99) → https://www.udemy.com/course/databricks-ml-professional-certification-exam-prep/
THREE are LIVE but NOT yet registered in any funnel registry (built: have
course-configs/ + generated/ + exports/, just never onboarded):
- ISC2 CISSP (2026) — id 7322123 — slug `isc2-cissp-2026` — $99.99
  → https://www.udemy.com/course/cissp-2024-exam-prep-all-8-domains-masterclass/
- CompTIA PenTest+ (PT0-003) — id 7322091 — slug `comptia-pentest-pt0-003-2026` — $89.99
  → https://www.udemy.com/course/comptia-pentest-pt0-003-exam-focused-prep/
- CompTIA CySA+ (CS0-003) — id 7322129 — slug `comptia-cysa-cs0-003-2026` — $89.99
  → https://www.udemy.com/course/comptia-cysa-cs0-003-complete-analyst-exam-prep/

NEW DRAFTS (not live; watch list for future runs): CISM (Certified Information
Security Manager), CompTIA SecurityX (CAS-005), SC-900 Security/Compliance/Identity.
OCI GenAI Professional (1Z0-1127) and Microsoft AB-900 (Copilot Agent Admin) did NOT
appear as live (still draft/not built) — no "Copilot" or "1Z0-1127" live result.

⚠️ FLAG for Aseem: CISSP's instructor header read "0min of video content published"
despite CLAUDE.md recording the 09-02 API curriculum load (12/12 lectures + video on
CISSP 7322123 / PenTest 7322091 / CySA 7322129, "validated live"). Verify the video
curriculum actually shows/plays on all three live pages before driving traffic to them
— a live course with unpublished video will convert poorly and draw bad early reviews.

**Onboarding NOT completed in-sandbox** (can't finish unattended): build-practice-site.js
fails on `fs.rmSync(site/)` (EPERM — the mount blocks deletion), promo-all.js needs
api.anthropic.com + YouTube (YouTube OAuth also still broken per CLAUDE.md), and
register-course.js edits the REAL repo registries — best done atomically via the go-live
wrapper on the Mac so register+build+deploy+promo stay consistent. Left the repo
untouched except this log. Aseem, run on the Mac for each of the 3 CompTIA courses:
```
npm run go-live -- --slug=isc2-cissp-2026            --udemy=https://www.udemy.com/course/cissp-2024-exam-prep-all-8-domains-masterclass/ --promo --announce-live
npm run go-live -- --slug=comptia-pentest-pt0-003-2026 --udemy=https://www.udemy.com/course/comptia-pentest-pt0-003-exam-focused-prep/ --promo --announce-live
npm run go-live -- --slug=comptia-cysa-cs0-003-2026   --udemy=https://www.udemy.com/course/comptia-cysa-cs0-003-complete-analyst-exam-prep/ --promo --announce-live
```
Then add each course's `page` to the most relevant BUNDLE (a "Cybersecurity /
CompTIA" learning path) in scripts/build-practice-site.js, run `npm run sync-coupons`,
rebuild + deploy site/.

**Coupons — HELD (none created).** Reasoning (unattended run):
- A Free:Open / honest-review coupon has value ONLY when distributed. Every
  distribution channel is unavailable this run: educational announcements + LinkedIn/
  Reddit posts are irreversible and need Aseem's approval (he was absent); the site
  coupon-sync path (sync-coupons → build → deploy) needs the Mac (build EPERM in sandbox).
- The 6 newly-live courses have ~0 enrollments, so there are no existing students for a
  coupon to reach either.
- Coupons carry a 5-day expiry and a monthly per-course budget, so creating them now
  would burn this month's slot on coupons that expire undistributed — the exact 0/10
  pattern seen all through July/August, and precisely why Aseem (present) chose to HOLD
  Free:Open on 08-28 and time it to a distribution window.
- NOTE — coupon system changed AGAIN: the promotions page no longer says "1 free open
  coupon/month"; it now shows "N coupons available … Limits reset monthly" (CISSP: 3
  available) plus a new "Create multiple coupons" / bulk-coupon feature. Worth Aseem
  re-reading the new limits before the next bulk regeneration.
RECOMMENDATION: run the coupon lever in an ATTENDED session so creation + distribution
happen inside one 5-day window (create FREEREVIEW10 on the target courses, then the same
day: LinkedIn post + Monday r/AWSCertifications value-first post + sync-coupons to the site).

**Educational announcements — NONE sent.** Irreversible messages to real students →
need Aseem's approval; he was absent. Also low value right now: the 6 newly-live courses
have ~0 enrollments (an announcement reaches almost no one), and the established
portfolio already received August checklist announcements (a repeat risks unsubscribe/
spam fatigue). Recommend a first announcement to each new course once it has an enrolled base.

**Social posts — NONE posted.** Irreversible public posts → need Aseem's approval; absent.
No fresh coupon links to post anyway. r/AWSCertifications remains Mondays-only (next
window Mon 09-07); r/comptia + r/dataengineering remain no-post per their rules. Note: any
future post copy should promote the free practice tests + learning-path bundles generically
(no fixed % / no computed savings) + honest-review free seats — and, per Aseem's 08-28
call, per-course paid coupons MAY still be referenced but only via a live Udemy coupon link
(the site no longer renders per-course paid coupons).

**Decisions / follow-ups needed from Aseem (attended run):**
1. Onboard the 3 live CompTIA cyber courses (CISSP / PenTest+ / CySA+) on the Mac via the
   go-live commands above; add them to a Cybersecurity bundle + sync-coupons + deploy.
2. VERIFY video is actually published/playable on those 3 (the "0min published" flag).
3. Approve + run the coupon lever attended (create FREEREVIEW10 + distribute same day) —
   for the 6 newly-live courses at minimum, and decide whether to bulk-regenerate the
   established portfolio now that the monthly budgets have reset.
4. Approve the recurring LinkedIn post + a Monday r/AWSCertifications post once fresh
   coupons exist.
5. Onboard OCI GenAI Pro (1Z0-1127) / Databricks ML Pro (done) / AB-900 / CISM / SecurityX /
   SC-900 when they flip to Live.
