# Bundle strategy — retire free coupons, sell learning-path bundles at 20% off

_Created 2026-08-23. Supersedes the weekly `FREETEST33` free/near-free coupon campaign._

## Why the change

The old funnel discounted single courses to ~$17.99–$34.99 (roughly 68–82% off list)
on rotating monthly `FREETEST33*` coupons. That trained buyers to wait for the next
deep coupon, compressed revenue per sale, and needed a manual refresh every ~31 days
(Udemy custom-price coupons expire, max 3/course/month).

New approach: **stop the deep single-course discounts** and instead group courses into
**learning-path bundles** by shared domain / base technology, offered at **20% off the
combined original price**. Bundles raise average order value, are defensible on price
(a curated path, not a fire-sale), and — sold through Udemy's native bundling feature —
need no monthly coupon refresh.

## Mechanism on Udemy (grounded in Udemy docs, Aug 2026)

Two ways to sell a multi-course discount; we use the first as primary.

1. **Udemy native Course Bundling (PRIMARY).** Instructor view → **Tools → Course
   Bundling → Get Started**. Self-serve, **2–3 published courses** per bundle, owner-only.
   Bundle price = sum of the courses' prices, and for instructors in the **Deals Program**
   Udemy automatically applies special bundle pricing. Single checkout, one URL, no
   expiry to babysit. Every path below is 2–3 courses precisely so it fits this tool.
   Caveat: the discount is applied automatically by Udemy — you cannot type an exact
   "20%". Treat 20% as the marketing anchor; Udemy's auto price is typically in that
   band or better.

2. **Per-course custom-price coupons (FALLBACK, only if an exact/guaranteed 20% is
   required).** Set each member course to a custom price at the tier at/just below 80%
   of its list. Udemy coupons only allow fixed price tiers, so the realized discount
   rounds to ~18–20%. Downside: coupons expire and are capped at 3/course/month — i.e.
   the same treadmill we're leaving. Prefer native bundles.

Sources: [Instructors: How to create and manage course bundles](https://support.udemy.com/hc/en-us/articles/34478609284247-Instructors-How-to-create-and-manage-course-bundles),
[Introducing Course Bundles](https://teach.udemy.com/introducing-course-bundles/),
[Instructors: Udemy's pricing tiers](https://support.udemy.com/hc/en-us/articles/229605368-Instructors-Udemy-s-pricing-tiers-for-courses),
[Pricing & coupons](https://support.udemy.com/hc/en-us/sections/206458388-Pricing-coupons).

## The 13 bundles (grouped by domain / base technology)

Each is 2–3 courses (native-bundle-eligible). Prices are USD list; **bundle price =
20% off the combined list**. Courses may appear in more than one bundle.

| # | Bundle | Courses | Combined list | Bundle (20% off) | You save |
|---|--------|---------|--------------:|-----------------:|---------:|
| 1 | AWS Associate Trio | SAA-C04 + DVA-C02 + SOA-C02 | $329.97 | $263.98 | $65.99 |
| 2 | AWS AI/ML Engineer Path | AIF-C01 + AIP-C01 + MLA-C01 | $219.97 | $175.98 | $43.99 |
| 3 | AWS Data Engineering Path | DEA-C01 + MLA-C01 | $219.98 | $175.98 | $44.00 |
| 4 | NVIDIA Generative AI & LLMs Path | NCA-GENL + NCP-GENL + NCA-GENM | $284.97 | $227.98 | $56.99 |
| 5 | NVIDIA AI Infrastructure & Operations Path | NCP-AIO + NCP-AII + NCP-AAI | $529.97 | $423.98 | $105.99 |
| 6 | NVIDIA Accelerated Data Science Path | NCA-ADS + NCP-ADS | $229.98 | $183.98 | $46.00 |
| 7 | Microsoft Azure AI Developer Path | AI-103 + AI-300 | $239.98 | $191.98 | $48.00 |
| 8 | Microsoft AI Business Leadership Path | AB-730 + AB-731 | $209.98 | $167.98 | $42.00 |
| 9 | Google Cloud Professional Path | PCA + PDE + PMLE | $389.97 | $311.98 | $77.99 |
| 10 | Google Cloud Foundations Path | ACE + GenAI Leader | $199.98 | $159.98 | $40.00 |
| 11 | CompTIA Security Path | Network+ + Security+ + SecAI+ | $329.97 | $263.98 | $65.99 |
| 12 | AI Governance, Risk & Compliance Path | AIGP + AAIR + PMI CPMAI | $329.97 | $263.98 | $65.99 |
| 13 | AI Product Management Path | AIPMM CDPM + AIPMM CPM | $219.98 | $175.98 | $44.00 |

Bundle price is exactly `combined_list × 0.80`. The site computes this from each
course's list price, so it stays correct if a list price changes.

### List prices needing confirmation

Four courses had no coupon block, so their list price isn't recorded in the repo. The
table above uses peer-based assumptions — **confirm the real Udemy list price** and
update `build-practice-site.js` if different:

- **AWS SOA-C02** — assumed **$109.99** (matches other AWS associates). In bundle 1.
- **Google PCA** — assumed **$129.99** (matches PDE/PMLE). In bundle 9.
- **CompTIA Network+** — assumed **$109.99** (matches Security+/SecAI+). In bundle 11.
- **Microsoft AZ-305** — assumed **$119.99**. Not in any bundle (kept standalone).

### Courses intentionally left standalone (no bundle yet)

SCS-C03 (AWS specialty), DP-600 (MS Fabric), Databricks GenAI Engineer, Salesforce
Agentforce, Claude CCDV-F, GSDC CFDE, AZ-305. These lack a same-technology sibling to
pair with cleanly. Revisit as the catalog grows (e.g. a future cross-vendor "GenAI
Developer" path once there are 2–3 tightly matched titles).

## Rollout runbook

1. **Site (done in code).** `scripts/build-practice-site.js` now renders a "Learning
   Path Bundles — save 20%" section (combined list, 20%-off price, savings, member
   courses). Each bundle has an optional `udemyBundleUrl`; until it's filled, the card
   links members to their individual course pages.
2. **Create the native bundles on Udemy — automated.** `scripts/create-bundles.js`
   reads the 13 `BUNDLES`, resolves each member's Udemy course id, creates + publishes
   the bundle, pulls its public URL back into `BUNDLES[].udemyBundleUrl`, logs
   `exports/bundles-log.json`, and rebuilds the site. Idempotent.
   ```
   npm run bundles:plan     # dry run — prints every API call, no changes
   npm run bundles:create   # create + publish all, sync URLs, rebuild site
   ```
   First time only: the bundle create/publish endpoint is `[VERIFY]` (Udemy's Course
   Bundling API is undocumented). Run `bundles:plan`, then one `--only=<id>` live run; if
   it 404s, confirm the endpoint with a single DevTools capture and correct `BUNDLE_API`
   in `scripts/udemy/bundles.js` (see its header / `scripts/udemy/README.md`). Then
   re-run for the rest. Manual fallback: Tools → Course Bundling → Get Started per bundle,
   then paste each URL into the matching `udemyBundleUrl`.
3. **Deploy the site** — `bundles:create` already rebuilds `site/`; rsync `site/` → the
   Pages repo and push (same publish order as before). To rebuild without creating,
   `npm run bundles:sync`.
4. **Ensure the Deals Program is on** so native-bundle special pricing applies.

## What changed in code (this commit)

- **Removed the free-coupon strategy** from `build-practice-site.js`: every `coupon: {…}`
  block is gone. The list price it carried is preserved as a plain `list` field on each
  course so bundle math still works. CTAs now link to the plain referral URL at list
  price; the score-gap reveal, "$X deal" badges, urgency timers, and "fresh coupons
  every week" copy are removed.
- **Added `BUNDLES` + `BUNDLE_DISCOUNT` (0.20)** and a bundles section on the homepage,
  with a pricing helper that reads each course's `list`.
- No change to the question banks, per-course practice pages, or the email pipeline
  registry export (`module.exports = { COURSES, SITE_URL }` unchanged; `list` is additive).
