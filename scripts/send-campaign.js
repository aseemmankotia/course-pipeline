#!/usr/bin/env node
/**
 * Send the latest (or a given) email digest to active, opted-in subscribers.
 *
 *   node scripts/send-campaign.js                 # DRY RUN (default): writes personalized copies to outbox/, sends nothing
 *   node scripts/send-campaign.js --live          # actually send
 *   node scripts/send-campaign.js --campaign=marketing/email/campaigns/2026-08-10-digest.json --live
 *
 * Providers (EMAIL_PROVIDER in .env): "resend" (REST, no extra deps) or "smtp"
 * (works with Amazon SES SMTP or any SMTP host — lazy-loads nodemailer; run
 * `npm i nodemailer` if you pick smtp).
 *
 * Compliance guardrails (send refuses without these, per CAN-SPAM / 2026 one-click rules):
 *   - PHYSICAL_ADDRESS           postal address in the footer
 *   - UNSUBSCRIBE_BASE_URL       e.g. https://your-host/unsubscribe  (token appended)
 * Every message carries a List-Unsubscribe + List-Unsubscribe-Post header (RFC 8058
 * one-click) and only goes to subscribers with status "active" + email channel on.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('../marketing/email/store.js');

const ROOT = path.join(__dirname, '..');
const flag = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const LIVE = process.argv.includes('--live');
const THROTTLE_MS = parseInt(process.env.SEND_THROTTLE_MS || '400', 10);

const {
  EMAIL_PROVIDER = 'resend', RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME = 'TechNuggets Academy',
  PHYSICAL_ADDRESS, UNSUBSCRIBE_BASE_URL,
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
} = process.env;

function latestCampaign() {
  const explicit = flag('campaign');
  if (explicit) return JSON.parse(fs.readFileSync(path.resolve(ROOT, explicit), 'utf8'));
  const dir = path.join(ROOT, 'marketing/email/campaigns');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('-digest.json')).sort() : [];
  if (!files.length) { console.error('No campaign found. Run: node scripts/build-campaign.js'); process.exit(1); }
  return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
}

function personalize(tpl, sub) {
  const unsub = `${(UNSUBSCRIBE_BASE_URL || '').replace(/\/$/, '')}?token=${sub.token}`;
  return tpl
    .replace(/\{\{name_or_there\}\}/g, sub.name ? ` ${sub.name.split(' ')[0]}` : ' there')
    .replace(/\{\{unsubscribe_url\}\}/g, unsub)
    .replace(/\{\{email\}\}/g, sub.email)
    .replace(/\{\{physical_address\}\}/g, PHYSICAL_ADDRESS || '');
}

async function sendResend({ to, subject, html, text, unsubUrl }) {
  const fetch = require('node-fetch');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`, to: [to], subject, html, text,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).id;
}

let _tx;
async function sendSMTP({ to, subject, html, text, unsubUrl }) {
  if (!_tx) {
    const nodemailer = require('nodemailer'); // npm i nodemailer
    _tx = nodemailer.createTransport({ host: SMTP_HOST, port: +(SMTP_PORT || 587), secure: +(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  }
  const info = await _tx.sendMail({
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`, to, subject, html, text,
    headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  return info.messageId;
}

async function main() {
  const camp = latestCampaign();
  // Resolve campaign files robustly: prefer the stored (repo-relative) path, but if it
  // was written as an absolute path in another environment (e.g. the sandbox), fall back
  // to locating the file by name inside the campaigns dir.
  const resolveCampFile = (f) => {
    const direct = path.resolve(ROOT, f);
    if (fs.existsSync(direct)) return direct;
    const byName = path.join(ROOT, 'marketing/email/campaigns', path.basename(f));
    if (fs.existsSync(byName)) return byName;
    return direct; // let readFileSync throw a clear ENOENT if truly missing
  };
  const html = fs.readFileSync(resolveCampFile(camp.htmlFile), 'utf8');
  const text = fs.readFileSync(resolveCampFile(camp.textFile), 'utf8');
  const db = store.loadDB();
  const recipients = store.activeEmail(db);

  console.log(`Campaign: ${camp.date}-digest  ·  "${camp.subject}"`);
  console.log(`Recipients (active email): ${recipients.length}  ·  provider: ${EMAIL_PROVIDER}  ·  mode: ${LIVE ? 'LIVE' : 'DRY RUN'}`);

  if (LIVE) {
    const missing = [];
    if (!PHYSICAL_ADDRESS) missing.push('PHYSICAL_ADDRESS');
    if (!UNSUBSCRIBE_BASE_URL) missing.push('UNSUBSCRIBE_BASE_URL');
    if (!EMAIL_FROM) missing.push('EMAIL_FROM');
    if (EMAIL_PROVIDER === 'resend' && !RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (EMAIL_PROVIDER === 'smtp' && !(SMTP_HOST && SMTP_USER)) missing.push('SMTP_HOST/SMTP_USER');
    if (missing.length) { console.error(`Refusing to send — missing .env: ${missing.join(', ')}`); process.exit(1); }
  }
  if (!recipients.length) { console.log('Nothing to send (no active email subscribers). Add some via scripts/subscribers.js or the website form.'); return; }

  const outbox = path.join(ROOT, 'marketing/email/outbox', camp.date);
  const send = EMAIL_PROVIDER === 'smtp' ? sendSMTP : sendResend;
  const log = [];
  for (const sub of recipients) {
    const unsubUrl = `${(UNSUBSCRIBE_BASE_URL || 'https://REPLACE/unsubscribe').replace(/\/$/, '')}?token=${sub.token}`;
    const msg = { to: sub.email, subject: camp.subject, html: personalize(html, sub), text: personalize(text, sub), unsubUrl };
    if (!LIVE) {
      fs.mkdirSync(outbox, { recursive: true });
      fs.writeFileSync(path.join(outbox, `${sub.email.replace(/[^a-z0-9]/gi, '_')}.html`), msg.html);
      log.push({ email: sub.email, status: 'dry-run' });
      continue;
    }
    try {
      const id = await send(msg);
      log.push({ email: sub.email, status: 'sent', id });
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    } catch (e) {
      log.push({ email: sub.email, status: 'error', error: e.message });
      process.stdout.write('x');
    }
  }
  const sentDir = path.join(ROOT, 'marketing/email/sent');
  fs.mkdirSync(sentDir, { recursive: true });
  fs.writeFileSync(path.join(sentDir, `${camp.date}-${LIVE ? 'live' : 'dryrun'}.json`),
    JSON.stringify({ campaign: camp.date, mode: LIVE ? 'live' : 'dry-run', at: new Date().toISOString(), log }, null, 2) + '\n');
  const sent = log.filter((l) => l.status === 'sent').length;
  const err = log.filter((l) => l.status === 'error').length;
  console.log(`\n${LIVE ? `Sent ${sent}, errors ${err}.` : `Dry run wrote ${recipients.length} personalized copies → ${outbox}`}`);
  if (!LIVE) console.log('Review the outbox, then re-run with --live to send.');
}

main().catch((e) => { console.error(e); process.exit(1); });
