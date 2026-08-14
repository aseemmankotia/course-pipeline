#!/usr/bin/env node
/**
 * WhatsApp digest sender — SCAFFOLD (opt-in only, hard-gated off by default).
 *
 *   node scripts/send-whatsapp.js               # DRY RUN: prints the exact API payloads, sends nothing
 *   WHATSAPP_ENABLED=true node scripts/send-whatsapp.js --live
 *
 * WhatsApp marketing (2026) is strictly opt-in and template-gated. Before this can
 * send you MUST have: a verified Meta Business + a valid privacy-policy URL, a
 * WhatsApp Business (Cloud API) number, and a Meta-APPROVED marketing *template*.
 * Freeform marketing blasts are not allowed and will get the number banned. This
 * script therefore:
 *   - only targets subscribers with status "active" AND channels.whatsapp AND a number
 *     that opted in specifically for WhatsApp,
 *   - sends a pre-approved TEMPLATE (name in WHATSAPP_TEMPLATE) with course variables,
 *   - refuses to run live unless WHATSAPP_ENABLED=true and all creds are present,
 *   - honors STOP (subscribers who reply STOP should be unsubscribed via the CLI/webhook).
 *
 * Env: WHATSAPP_ENABLED, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE,
 *      WHATSAPP_LANG (default en_US), WHATSAPP_API_VERSION (default v20.0).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('../marketing/email/store.js');
const { COURSES, SITE_URL } = require('./build-practice-site.js');

const ROOT = path.join(__dirname, '..');
const LIVE = process.argv.includes('--live');
const {
  WHATSAPP_ENABLED, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
  WHATSAPP_TEMPLATE, WHATSAPP_LANG = 'en_US', WHATSAPP_API_VERSION = 'v20.0',
} = process.env;

function latestCampaign() {
  const dir = path.join(ROOT, 'marketing/email/campaigns');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('-digest.json')).sort() : [];
  if (!files.length) { console.error('No campaign found. Run: node scripts/build-campaign.js'); process.exit(1); }
  return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
}

// Map the digest's first new course into template body variables {{1}} {{2}} {{3}}.
// Your approved template should read like:
//   "New on TechNuggets: {{1}} — {{2}}. Enroll: {{3}}  Reply STOP to opt out."
function templateComponents(camp) {
  const first = COURSES.find((c) => c.slug === (camp.new[0] || camp.popular[0]));
  const enroll = first ? ((first.coupon && first.coupon.url) || first.udemy) : SITE_URL;
  return [{
    type: 'body',
    parameters: [
      { type: 'text', text: first ? first.name.replace(/ \(.*\)$/, '') : 'new certification courses' },
      { type: 'text', text: first ? first.tagline : 'exam-focused prep' },
      { type: 'text', text: enroll },
    ],
  }];
}

async function main() {
  const camp = latestCampaign();
  const db = store.loadDB();
  const recipients = store.activeWhatsapp(db);
  console.log(`WhatsApp digest: ${camp.date}  ·  opted-in recipients: ${recipients.length}  ·  mode: ${LIVE ? 'LIVE' : 'DRY RUN'}`);

  const components = templateComponents(camp);
  const payloadFor = (num) => ({
    messaging_product: 'whatsapp', to: num, type: 'template',
    template: { name: WHATSAPP_TEMPLATE, language: { code: WHATSAPP_LANG }, components },
  });

  if (!LIVE) {
    console.log('DRY RUN — example payload (no send):');
    console.log(JSON.stringify(payloadFor(recipients[0]?.whatsapp_number || '+1XXXXXXXXXX'), null, 2));
    console.log(`\nTo go live: set WHATSAPP_ENABLED=true and provide WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, an APPROVED WHATSAPP_TEMPLATE, then re-run with --live.`);
    return;
  }

  const missing = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_TEMPLATE'].filter((k) => !process.env[k]);
  if (WHATSAPP_ENABLED !== 'true' || missing.length) {
    console.error(`Refusing to send. Need WHATSAPP_ENABLED=true and: ${missing.join(', ') || '(creds present)'}`);
    console.error('WhatsApp marketing requires a verified business + approved template. See CLAUDE.md.');
    process.exit(1);
  }

  const fetch = require('node-fetch');
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;
  let sent = 0, err = 0;
  for (const sub of recipients) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFor(sub.whatsapp_number)) });
      if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 160)}`);
      sent++; process.stdout.write('.');
      await new Promise((res) => setTimeout(res, 600));
    } catch (e) { err++; process.stdout.write('x'); }
  }
  console.log(`\nWhatsApp sent ${sent}, errors ${err}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
