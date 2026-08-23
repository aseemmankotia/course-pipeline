#!/usr/bin/env node
/**
 * brevo-setup.js — one-time Brevo wiring check + list bootstrap.
 *
 *   node scripts/brevo-setup.js
 *
 * Does four things (read-only except creating the list if missing):
 *   1. Validates BREVO_API_KEY (GET /account) and prints the account.
 *   2. Confirms EMAIL_FROM is a VERIFIED Brevo sender (campaigns fail otherwise).
 *   3. Ensures a newsletter list exists (name from BREVO_LIST_NAME, default
 *      "TechNuggets Newsletter") and prints its numeric id → put it in .env as
 *      BREVO_LIST_ID and in the Worker's wrangler.toml.
 *   4. Prints the remaining manual steps (Worker deploy, site rebuild).
 */
require('dotenv').config();
const brevo = require('../marketing/email/brevo.js');

const LIST_NAME = process.env.BREVO_LIST_NAME || 'TechNuggets Newsletter';
const EMAIL_FROM = process.env.EMAIL_FROM || '';

(async () => {
  // 1. key + account
  let acct;
  try {
    acct = await brevo.getAccount();
  } catch (e) {
    console.error(`❌ ${e.message}`);
    console.error('   Add a valid BREVO_API_KEY to .env (Brevo → SMTP & API → API Keys, starts with "xkeysib-").');
    process.exit(1);
  }
  const plan = Array.isArray(acct.plan) ? acct.plan[0] : acct.plan;
  console.log(`✅ Brevo key OK — ${acct.companyName || acct.email || 'account'} · ${acct.email || ''}`);
  if (plan) console.log(`   Plan: ${plan.type || ''} ${plan.credits != null ? `· ${plan.credits} ${plan.creditsType || 'credits'}` : ''}`);

  // 2. sender verification
  try {
    const s = await brevo.getSenders();
    const senders = (s && s.senders) || [];
    const match = senders.find((x) => (x.email || '').toLowerCase() === EMAIL_FROM.toLowerCase());
    if (!EMAIL_FROM) {
      console.log('⚠  EMAIL_FROM not set in .env — set it to a verified Brevo sender (e.g. news@technuggets.academy).');
    } else if (match && match.active) {
      console.log(`✅ Sender verified: ${EMAIL_FROM}`);
    } else if (match) {
      console.log(`⚠  Sender ${EMAIL_FROM} exists but is NOT active/verified — finish verification in Brevo → Senders.`);
    } else {
      console.log(`⚠  Sender ${EMAIL_FROM} not found in Brevo. Add + verify it (Brevo → Senders, Domains & Dedicated IPs),`);
      console.log('   and make sure the domain SPF/DKIM are authenticated (you already applied DNS via Porkbun).');
      if (senders.length) console.log(`   Existing senders: ${senders.map((x) => x.email).join(', ')}`);
    }
  } catch (e) {
    console.log(`⚠  Could not list senders: ${e.message}`);
  }

  // 3. list bootstrap
  try {
    const id = await brevo.ensureList(LIST_NAME);
    const count = await brevo.listContactCount(id).catch(() => '?');
    console.log(`✅ Newsletter list "${LIST_NAME}" → id ${id} (${count} contacts)`);
    console.log('');
    console.log('▶ NEXT STEPS');
    console.log(`   1. Put this in .env:            BREVO_LIST_ID=${id}`);
    console.log('   2. Set EMAIL_PROVIDER=brevo in .env (so campaigns send via Brevo).');
    console.log(`   3. In marketing/email/subscribe-worker/wrangler.toml set BREVO_LIST_ID="${id}".`);
    console.log('   4. Deploy the Worker (marketing/email/subscribe-worker/README.md), then rebuild the site:');
    console.log('        SUBSCRIBE_ENDPOINT=https://<worker-url>/subscribe node scripts/build-practice-site.js --all');
    console.log('   5. Test the digest end to end:  node scripts/build-campaign.js && node scripts/send-campaign.js   (dry run)');
  } catch (e) {
    console.error(`❌ Could not ensure list "${LIST_NAME}": ${e.message}`);
    process.exit(1);
  }
})();
