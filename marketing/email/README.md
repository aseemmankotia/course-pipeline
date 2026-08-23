# TechNuggets Academy — Email + WhatsApp marketing pipeline

Consent-first advertising: a subscriber database, a website subscribe/unsubscribe
service, an every-3-days "new + popular courses" digest, and email + WhatsApp
senders. Nothing is ever sent to anyone who isn't an **active, opted-in** subscriber,
and every message carries a one-click unsubscribe.

## Why consent-first (don't skip this)
- **WhatsApp** marketing (2026) is *only* allowed to opted-in numbers, using a
  Meta-**approved template**, from a **verified** business with a privacy policy.
  Blasting a sourced/scraped list gets the number banned. There is no legal way to
  broadcast to WhatsApp *groups* via the API.
- **Email**: US CAN-SPAM allows opt-out-style sending but requires a real postal
  address + a working unsubscribe honored within ~72h. Any **EU** recipient triggers
  GDPR, which requires prior consent — purchased/scraped lists are the top fine tier.
- So: only the website form + lists you already hold **documented opt-in** for.

## Architecture (Brevo-native — current default)
The site is static (GitHub Pages), so it can't hold an API key. The subscribe form
POSTs to a tiny **Cloudflare Worker** that adds the contact to a **Brevo** list
(single opt-in). Newsletters are sent as **Brevo campaigns**, so the contact list,
unsubscribe handling, suppression, and the address footer all live in Brevo. Two
triggers: an automatic **new-course announcement** (on `register-course.js`) and the
recurring **every-3-days digest**.

```
website form ─POST─▶ Cloudflare Worker ─Brevo Contacts API─▶ Brevo list
                                                                  ▲
register-course.js ─▶ announce-course.js ┐                        │
build-campaign.js (3-day) ───────────────┴─▶ send-campaign.js ─Brevo Campaign API─┘
```

## Pieces
| File | Role |
|---|---|
| `brevo.js` | Brevo API helper (contacts + campaigns + list bootstrap) |
| `subscribe-worker/` | Cloudflare Worker: `POST /subscribe` → Brevo (holds the key server-side) |
| `../../scripts/brevo-setup.js` | verify key, check sender, create/find the list, print `BREVO_LIST_ID` |
| `../../scripts/build-campaign.js` | builds the 3-day digest (HTML + text + JSON) from the course registry |
| `../../scripts/announce-course.js` | builds + sends a single-course launch email; deduped per slug |
| `../../scripts/send-campaign.js` | sends the campaign — `brevo` (bulk) / `resend` / `smtp`; **dry-run by default** |
| `../../scripts/send-whatsapp.js` | WhatsApp Cloud API template sender (scaffold, hard-gated off) |
| `announced.json` | which slugs have been announced live (dedupe) |
| `campaigns/` `outbox/` `sent/` | generated digests/launches, dry-run previews, send logs |
| `store.js` `subscribers.json` `server.js` | **legacy** self-hosted store + subscribe/unsubscribe server (kept for the resend/smtp path; not used in brevo mode) |

## One-time setup (Brevo)
1. Fill `.env` (see `.env.example`): `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM`
   (a **verified** Brevo sender on your authenticated domain), **`PHYSICAL_ADDRESS`**.
2. `npm run brevo:setup` — validates the key, checks the sender, creates the newsletter
   list, and prints the numeric **`BREVO_LIST_ID`**. Put it in `.env` (and the Worker's
   `wrangler.toml`).
3. Deploy the subscribe Worker: see `subscribe-worker/README.md` (`wrangler deploy` +
   `wrangler secret put BREVO_API_KEY`).
4. Rebuild the site with the Worker URL baked in so the form resolves, then deploy:
   `SUBSCRIBE_ENDPOINT=https://<worker-url>/subscribe node scripts/build-practice-site.js --all`

## Every-3-days digest
```
npm run campaign:build          # pick new + popular courses, render the digest
npm run campaign:send           # DRY RUN -> renders the Brevo campaign HTML to outbox/, sends nothing
npm run campaign:send:live      # create + send the Brevo campaign to the whole list
```
`marketing:digest` does build + dry-run in one step. In `brevo` mode the live send
refuses without `BREVO_API_KEY` + `BREVO_LIST_ID` + `EMAIL_FROM` + `PHYSICAL_ADDRESS`.

## Automatic new-course announcement
`register-course.js` fires `announce-course.js` in **dry run** by default (safe against
re-runs) and prints the live command. Hands-off: `register-course.js … --announce-live`.
Standalone:
```
node scripts/announce-course.js --slug=<slug>          # build + dry-run preview
node scripts/announce-course.js --slug=<slug> --live   # send to the Brevo list (deduped per slug)
```

### Automate the 3-day cadence (Mac, cron)
```
# 9am every 3rd day: rebuild digest, send live, log
0 9 */3 * * cd ~/course-pipeline && /usr/bin/env node scripts/build-campaign.js && /usr/bin/env node scripts/send-campaign.js --live >> marketing/email/sent/cron.log 2>&1
```

## WhatsApp (when your Meta business is verified)
Set `WHATSAPP_ENABLED=true` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` + an approved
`WHATSAPP_TEMPLATE`, collect WhatsApp opt-in on the form, then `npm run whatsapp:send -- --live`.
Until then `npm run whatsapp:send` just prints the exact payload it would send.

## Selection knobs
Add `addedOn:'YYYY-MM-DD'` or `popular:true` to a course entry in
`scripts/build-practice-site.js` to control what shows as New / Popular; otherwise
"new" = most recently listed live courses and "popular" rotates each run.

## Domain + DNS (Porkbun) — email authentication
Once the domain is registered and you've generated a Porkbun API key (Account → API
Access; toggle API access ON for the domain), set `MARKETING_DOMAIN`, `PORKBUN_API_KEY`,
`PORKBUN_SECRET_API_KEY` in `.env`, then:
```
npm run dns:plan          # auth-check + show what it would create (writes nothing)
npm run dns:apply         # create the SPF/DKIM/DMARC records
npm run dns:apply -- --site   # also add GitHub-Pages A/CNAME records for the domain
```
First paste the exact DKIM/SPF values from your email provider's "authenticate domain"
page into `marketing/email/dns-records.json` (records with `REPLACE_` are skipped). After
apply + a few minutes' propagation, click "verify" in the provider dashboard.
