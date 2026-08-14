# Building & Hosting a "Udemy-level" Course Platform — Feasibility Report

Prepared for: Aseem Mankotia (TechNuggets Academy) · Date: 2026-08-10
Purpose: high-level feasibility, architecture, and running-cost estimates for owning your own course site instead of (or alongside) Udemy. **This is a decision document — nothing was built.**

---

## 1. The honest headline

Building the *technology* for your own course site is **very feasible and surprisingly cheap** — a small branded storefront can run for **$30–100/month** at launch, and the video infrastructure that sounds scary (storage + streaming) costs **single-digit dollars** until you have real traffic. Modern tools have commoditized every hard part.

The catch is not cost or code. It's that **Udemy's real product is the audience and the tax/payments/hosting it handles for you.** When you sell on your own site you keep ~**90%+** of revenue instead of Udemy's ~**37–50%**, but *you* become responsible for driving 100% of the traffic and for global sales-tax compliance. So the question isn't "can I build it" — it's "can I send it enough buyers to beat the free distribution Udemy gives me."

**Recommendation up front:** don't replace Udemy — run a **hybrid**. Keep Udemy for discovery/reach, and stand up a lightweight own-brand storefront to sell the *same* courses at full margin to the audience you already control (your email list, YouTube, the practice-test site). Start with a SaaS platform (days, no code) or a thin custom build (weeks) rather than a full marketplace (months). Details below.

---

## 2. First, define "Udemy-level" — two very different things

| | **A) Branded storefront** (what you likely want) | **B) True marketplace** (what Udemy actually is) |
|---|---|---|
| Who sells | Just you | Thousands of instructors |
| Extra systems needed | Catalog, checkout, video, login | + instructor onboarding, revenue-share payouts, ratings/reviews, search/ranking, moderation, recommendation engine, dispute handling |
| Build effort | Days → a few months | 6–12+ months, a real software company |
| Cold-start problem | Only need buyers | Need buyers **and** sellers simultaneously |
| Recommended? | ✅ Yes, for you | ❌ No — that's a startup, not a margin play |

The rest of this report assumes **(A) a branded single-instructor storefront**. A marketplace is a different business; flag it only if that's the actual goal.

---

## 3. Three ways to build it — effort vs control

| Path | What it is | Time to launch | Monthly floor | You maintain? | Best when |
|---|---|---|---|---|---|
| **1. SaaS platform** (Thinkific, Teachable, Kajabi, Podia) | Hosted course site; upload videos, set price, done | **1–3 days** | $39–$199/mo (0–7.5% fees vary) | No | You want to test demand fast with zero code |
| **2. Open-source LMS self-host** (Moodle, Open edX) | Install an LMS on your own server | **1–4 weeks** (Moodle) / months (Open edX) | $5–$30/mo server (Moodle); Open edX needs DevOps | Yes (updates, security) | You want control + lowest license cost and have sysadmin comfort |
| **3. Custom build** (Next.js + Bunny/Mux + Stripe/Paddle + auth + DB) | You (or a dev / AI-assisted) build a bespoke storefront | **3–8 weeks** for an MVP; longer to polish | $20–$60/mo infra + build cost | Yes | You want a pixel-perfect brand, tight integration with your existing pipeline, and full data ownership |

**Effort reality for the custom path (#3):** an MVP storefront — catalog pages, account/login, checkout, secure video playback, "my courses" — is roughly **80–160 hours** of competent dev work (or noticeably faster AI-assisted, but still real). A polished, production-hardened version is a few months. Ongoing maintenance is a few hours/month plus dependency/security upkeep. Given you already have a code pipeline and a static site, #3 is realistic — but #1 is the fastest way to *validate that people will buy direct at all* before investing build time.

---

## 4. Reference architecture (custom / self-host path)

The system decomposes into seven boxes. None are exotic in 2026.

```
[ Browser / SPA ]  ──►  [ Web app + API ]  ──►  [ Postgres DB ]  (users, purchases, progress)
      │                       │
      │                       ├──►  [ Auth ]              (email/OAuth; e.g. Clerk/Auth0/self-rolled)
      │                       ├──►  [ Payments + tax ]    (Stripe, or Paddle/Lemon Squeezy = Merchant of Record)
      │                       └──►  [ Email ]             (Brevo/Resend — you already have this)
      │
      └──►  [ Video: storage + transcode + streaming CDN + signed playback ]   ◄── the cost driver
                     (Bunny Stream / Cloudflare Stream / Mux)
```

- **Frontend + app/API:** one Next.js (or similar) app on a serverless host (Vercel/Cloudflare/Netlify) or a small VPS. Handles catalog, checkout, gated "watch" pages.
- **Database:** managed Postgres (Neon/Supabase/RDS) — users, entitlements (who bought what), progress, coupons.
- **Auth:** managed (Clerk/Auth0 free tiers) or self-rolled; also gates video access.
- **Video (the important one):** upload → auto-transcode → adaptive HLS delivery over a global CDN, with **signed/expiring playback URLs** so paid videos can't be freely shared or hot-linked. This is a solved, cheap commodity (Section 5).
- **Payments + tax:** either Stripe (cheapest %, but *you* owe global VAT/sales tax) or a Merchant-of-Record (higher %, but they become the legal seller and handle tax) (Section 6).
- **Email/marketing:** already built in your pipeline (Brevo/Resend + digest).
- **Content protection:** signed URLs everywhere; optional DRM for higher tiers. Perfect anti-piracy is impossible — good-enough is signed, expiring, watermarked streams.

---

## 5. Video hosting & storage — the part you asked about

This is the "storage for courses" question, and the good news is it's **cheap and reliable**. Three solid managed options (all include transcoding + a player + global CDN, so you don't run servers):

| Provider | Storage | Delivery (streaming) | Notes |
|---|---|---|---|
| **Bunny Stream** ⭐ | **$0.01 / GB / month** | from **$0.01 / GB** (NA/EU) | Cheapest overall; player + transcode + DRM options included. ~$1/mo minimum. |
| **Cloudflare Stream** | **$1 per 1,000 min stored** (~$5/1,000 min ≈ per-minute model) | **$5 per 1,000 min delivered** | Simple flat per-minute pricing, no bandwidth surprises; great global network. |
| **Mux** | (encode **$0.07/min** one-time) | **$0.025 / min delivered** | Best analytics + developer API; priced for SaaS embedding. |

**Worked example (Bunny, real quote from their docs):** ~**300 GB stored** + **50 GB/month** of viewing ≈ **~$3.50/month**. That's your entire ~30-course catalog hosted for the price of a coffee — until viewership scales.

**How the cost actually grows:** storage is trivial; **delivery (watch-time bandwidth) is the variable that scales with success.** Rough rule: 1 hour of 1080p ≈ 1–2 GB delivered per viewer. So 10,000 course-hours watched/month ≈ 10–20 TB ≈ **$100–200/mo on Bunny** (or the equivalent per-minute charge on Cloudflare/Mux). That's a "nice problem" — it only gets big when a lot of people are watching, i.e., when you're making money.

**Pick:** **Bunny Stream** for lowest cost, or **Cloudflare Stream** if you prefer dead-simple flat per-minute billing with no bandwidth math. Both are reliable and used in production widely. Store the *masters* in cheap object storage (Backblaze B2/Bunny Storage ~$0.005–0.01/GB) as backup.

---

## 6. Payments & tax — the sneaky-hard part

Selling globally means **40+ US states and 170+ countries** can require you to collect digital sales tax/VAT. Two routes:

| Route | Fee (approx.) | Who owes the tax | Effort |
|---|---|---|---|
| **Stripe** (direct) | 2.9% + $0.30 (US); ~5.9% effective for non-US/international | **You** (register, calculate, file, remit — or add Stripe Tax at +0.5% and still file yourself) | High compliance burden |
| **Merchant of Record** — Paddle / Lemon Squeezy / Gumroad | ~5% + $0.50, or ~7–8% effective internationally | **They** are the legal seller and handle all VAT/sales tax | Near-zero tax effort |

For a solo operator selling worldwide, a **Merchant of Record is usually worth the extra ~2–3%** — it removes the single biggest hidden liability of leaving Udemy (Udemy currently acts as your MoR — that's part of what its cut pays for). Lemon Squeezy or Paddle are the common picks for digital courses; Gumroad is the simplest for pure downloads.

---

## 7. Running-cost estimates (infrastructure only)

Costs excluding payment fees (which are a % of sales, not fixed) and excluding your own time/marketing spend.

| Component | **Launch** (<500 students, ~30 courses, ~200 GB) | **Growing** (~5k students, ~500 GB, heavier viewing) | **Larger** (50k+ students, 1 TB+, heavy viewing) |
|---|---|---|---|
| Video storage + streaming (Bunny) | $5–20 | $100–300 | $1,000–3,000 |
| App hosting + DB | $0–30 (serverless free tiers / small VPS) | $50–200 | $300–1,000 |
| Auth / misc SaaS | $0 (free tiers) | $0–50 | $100–300 |
| Email/marketing | $0 (Brevo free) → later paid | $10–50 | $50–200 |
| Domain | ~$1–3/mo (annualized) | ~$3 | ~$3 |
| **Monthly infra total** | **~$30–100** | **~$200–600** | **~$1,500–4,500** |
| **+ Payment fees** | 3% (Stripe) to ~7% (MoR) of revenue | same | same |

**If you go SaaS instead (Path #1):** swap most of the above for a flat **$39–$199/month** platform fee (Thinkific $49–199 with **0% transaction fees**; Kajabi $89–399 with 0%; Teachable $39–499 but 5–7.5% on lower tiers; Podia $39–199, 5% on Starter). SaaS is more per month but **zero build/maintenance** and video hosting is included.

**One-time build cost (Path #3, custom):** roughly **$0** if you build it yourself with your existing skills/AI assistance (just your time), or **$3,000–15,000** if you hire out an MVP. A full marketplace would be **$50k+** and months — not recommended.

---

## 8. The costs that aren't on the invoice

- **Traffic is the whole game.** Udemy's ~50% cut buys you a marketplace of millions of searchers. Your own site starts at zero visitors — you must supply every one via SEO, email, YouTube, ads, communities. This is *the* deciding factor, and it's exactly why the email list + practice-test SEO site you're building matter.
- **Tax compliance** (handled if you use a Merchant of Record; a real burden if you use Stripe direct).
- **Chargebacks & fraud** (~$15–25 per dispute; digital goods attract fraud — MoRs absorb much of this).
- **Support & refunds** — you now field "I can't log in / I want a refund" yourself.
- **Piracy** — signed/expiring streams deter casual sharing; nothing stops a determined ripper. Price and convenience beat DRM.
- **Maintenance & uptime** — dependency updates, security patches, and being on-call if the site goes down on launch day.

---

## 9. Bottom line & recommended path

**Feasible? Yes — cheaply, technically.** The infrastructure for a professional own-brand course site is a **$30–100/month** proposition at your stage, dominated later by streaming bandwidth (a good problem). The blocker is audience, not architecture.

**Recommended sequence (lowest risk → highest control):**
1. **Validate with SaaS first (this month).** Put 2–3 of your best courses on **Thinkific** (0% fees) as a branded storefront at `technuggets.academy`. If your email list + practice-site traffic converts *any* direct buyers, you've proven demand at ~90% margin — with zero code.
2. **Add a Merchant of Record** (Lemon Squeezy/Paddle) so global tax is never your problem.
3. **Graduate to a custom build only if** direct sales justify it — then a Next.js + **Bunny Stream** + MoR storefront, tightly wired into the pipeline you already run, is a few weeks of work and ~$30–60/month to operate.
4. **Keep Udemy the whole time.** It's free distribution and it de-risks everything; the own-site is upside on the audience you control, not a replacement.

**Do not** attempt a multi-instructor marketplace — that's a separate company with a two-sided cold-start problem, not a margin improvement.

---

## Sources
- [Video streaming pricing comparison — Mux / Cloudflare Stream / AWS (2026)](https://www.buildmvpfast.com/api-costs/video)
- [Mux vs Cloudflare Stream vs CloudFront (2026)](https://leanopstech.com/blog/mux-vs-cloudflare-stream-vs-cloudfront-2026/)
- [Bunny.net Stream pricing docs](https://docs.bunny.net/stream/pricing) · [Bunny Stream review & example costs (2026)](https://swarmify.com/blog/bunny-stream-review/)
- [Online course platform pricing 2026 — Thinkific/Kajabi/Teachable/Podia](https://ddiy.co/pricing-plan-guide-course-platforms/)
- [Stripe vs Paddle vs Lemon Squeezy — fees, tax & Merchant of Record (2026)](https://buildmvpfa.st/blog/stripe-vs-paddle-vs-lemonsqueezy-2026)
- [Open edX hosting: self-hosted vs managed vs SaaS (2026)](https://cubite.io/blogs/open-edx-hosting) · [Real cost of Moodle TCO (2026)](https://blog.moodiycloud.com/real-cost-of-moodle-tco-guide-2026)
