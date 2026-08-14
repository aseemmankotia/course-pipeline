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

## Pieces
| File | Role |
|---|---|
| `store.js` | JSON subscriber DB + consent records + unsubscribe tokens |
| `subscribers.json` | the database (ships empty) |
| `server.js` | zero-dep self-hosted `POST /subscribe`, `GET/POST /unsubscribe` (RFC 8058 one-click) |
| `../../scripts/subscribers.js` | CLI: add / import owned lists / unsubscribe / list / stats / export |
| `../../scripts/build-campaign.js` | builds the digest (HTML + text + JSON) from the course registry |
| `../../scripts/send-campaign.js` | emails active subscribers (Resend or SMTP/SES); **dry-run by default** |
| `../../scripts/send-whatsapp.js` | WhatsApp Cloud API template sender (scaffold, hard-gated off) |
| `campaigns/` `outbox/` `sent/` | generated digests, dry-run previews, send logs |

## One-time setup
1. Fill the marketing vars in `.env` (see `.env.example`): provider + key, `EMAIL_FROM`
   (on a domain you verified), **`PHYSICAL_ADDRESS`**, **`UNSUBSCRIBE_BASE_URL`**.
2. Run the subscribe service where it can persist the DB (the Mac, a VPS, a container),
   behind HTTPS:  `npm run subscribe:server`
3. Rebuild the site with the endpoint baked in so the form + unsubscribe links resolve:
   `SUBSCRIBE_ENDPOINT=https://your-host/subscribe node scripts/build-practice-site.js --all`, then deploy.
4. (Optional) Seed lists you have consent for:
   `node scripts/subscribers.js import --file=past-students.csv --source=past-students --consent=owned_list_import`

## Every-3-days digest
```
npm run campaign:build          # pick new + popular courses, render the digest
npm run campaign:send           # DRY RUN -> writes personalized copies to outbox/, sends nothing
npm run campaign:send:live      # actually email active subscribers
```
`marketing:digest` does build + dry-run in one step. The send refuses to go live
without `PHYSICAL_ADDRESS` + `UNSUBSCRIBE_BASE_URL` set.

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
