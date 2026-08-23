# Subscribe proxy (Cloudflare Worker)

The static site (GitHub Pages) can't hold the Brevo API key, so the subscribe form
POSTs to this tiny Worker, which adds the contact to your Brevo newsletter list
(single opt-in). Free tier is far more than enough (100k requests/day).

## Deploy (one time, ~5 min)

Prereqs: a free Cloudflare account, and `node scripts/brevo-setup.js` already run so
you have the numeric **BREVO_LIST_ID**.

```bash
cd marketing/email/subscribe-worker

# 1. Put the numeric list id + your origins into wrangler.toml [vars]
#    (BREVO_LIST_ID, ALLOWED_ORIGINS)

# 2. Log in and set the API key as a SECRET (never in the repo)
npx wrangler login
npx wrangler secret put BREVO_API_KEY      # paste your xkeysib-... key

# 3. Ship it
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://technuggets-subscribe.<your-subdomain>.workers.dev`.

## Point the site at it

Rebuild the site with the Worker URL baked into the form, then deploy the site:

```bash
SUBSCRIBE_ENDPOINT=https://technuggets-subscribe.<sub>.workers.dev/subscribe \
  node scripts/build-practice-site.js --all
```

(Optional) map a custom route like `https://technuggets.academy/api/subscribe` via a
Cloudflare route if the domain is on Cloudflare — otherwise the `workers.dev` URL is fine.

## Test

```bash
curl -s https://technuggets-subscribe.<sub>.workers.dev/health           # {"ok":true}
curl -s -X POST https://technuggets-subscribe.<sub>.workers.dev/subscribe \
  -H 'Content-Type: application/json' -d '{"email":"you@example.com","name":"Test"}'
```

Then confirm the contact appears in Brevo → Contacts → your newsletter list.

## Notes
- CORS is locked to `ALLOWED_ORIGINS`; update it if the domain changes.
- A hidden honeypot field (`company`) silently drops bots.
- Single opt-in per your setup: the contact is added immediately. Unsubscribe is
  handled by Brevo's link in every campaign.
