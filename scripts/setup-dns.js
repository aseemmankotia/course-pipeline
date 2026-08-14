#!/usr/bin/env node
/**
 * Porkbun DNS setup for the marketing domain (email auth + optional site records).
 *
 *   node scripts/setup-dns.js                 # PLAN (default): auth-check, show existing vs desired, write NOTHING
 *   node scripts/setup-dns.js --apply         # create the email records that are missing
 *   node scripts/setup-dns.js --apply --site  # also apply the GitHub Pages site records
 *   node scripts/setup-dns.js --apply --replace  # also update records whose value drifted
 *
 * Reads from .env: MARKETING_DOMAIN (e.g. technuggets.academy), PORKBUN_API_KEY,
 * PORKBUN_SECRET_API_KEY. Records come from marketing/email/dns-records.json.
 * Any record whose content still contains "REPLACE_" is SKIPPED with a warning —
 * paste the real DKIM/SPF value from your email provider's domain-auth page first.
 * Idempotent: a record that already exists (same host+type+content) is left alone.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API = 'https://api.porkbun.com/api/json/v3';
const DOMAIN = process.env.MARKETING_DOMAIN;
const KEY = process.env.PORKBUN_API_KEY;
const SECRET = process.env.PORKBUN_SECRET_API_KEY;
const APPLY = process.argv.includes('--apply');
const WITH_SITE = process.argv.includes('--site');
const REPLACE = process.argv.includes('--replace');
const LIST = process.argv.includes('--list');
const CLEAN_PARKING = process.argv.includes('--clean-parking');

function die(msg) { console.error(`✖ ${msg}`); process.exit(1); }
if (!DOMAIN) die('Set MARKETING_DOMAIN in .env (e.g. technuggets.academy).');
if (!KEY || !SECRET) die('Set PORKBUN_API_KEY and PORKBUN_SECRET_API_KEY in .env (Porkbun → Account → API Access; enable API access for the domain too).');

const fetch = require('node-fetch');
const auth = { apikey: KEY, secretapikey: SECRET };
async function pb(pathname, body = {}) {
  const r = await fetch(`${API}${pathname}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...auth, ...body }) });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 'SUCCESS') throw new Error(`${pathname} → ${j.message || r.status}`);
  return j;
}

const fullHost = (name) => (name ? `${name}.${DOMAIN}` : DOMAIN);
const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');

async function main() {
  // 1) auth check
  let ip;
  try { ip = (await pb('/ping')).yourIp; } catch (e) { die(`Porkbun auth failed: ${e.message}. Check the API keys AND that API access is toggled ON for ${DOMAIN}.`); }
  console.log(`✓ Authenticated with Porkbun (your IP ${ip}). Domain: ${DOMAIN}\n`);

  // 2) desired records
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'marketing/email/dns-records.json'), 'utf8'));
  let desired = [...manifest.email];
  if (WITH_SITE) desired = desired.concat(manifest.site);
  desired = desired.map((r) => ({ ...r, content: r.content.replace(/REPLACE_DOMAIN/g, DOMAIN) }));

  // 3) existing records
  const existing = (await pb(`/dns/retrieve/${DOMAIN}`)).records || [];

  // --list: dump everything currently in the zone (with IDs) and stop
  if (LIST) {
    console.log(`Current DNS records for ${DOMAIN} (${existing.length}):\n`);
    existing.forEach((e) => console.log(`  ${String(e.id).padEnd(11)} ${e.type.padEnd(6)} ${(e.name || DOMAIN).padEnd(40)} ${e.content}${e.prio && e.prio !== '0' ? '  prio=' + e.prio : ''}`));
    return;
  }

  // --clean-parking: remove Porkbun's default parking records (root + * wildcard -> pixie.porkbun.com)
  if (CLEAN_PARKING) {
    const parking = existing.filter((e) => /pixie\.porkbun\.com/i.test(e.content));
    if (!parking.length) { console.log('No Porkbun parking records (pixie.porkbun.com) found — nothing to clean.'); return; }
    console.log(`Porkbun parking records ${APPLY ? 'to DELETE' : '(DRY RUN — nothing deleted)'}:`);
    parking.forEach((e) => console.log(`  ${e.id}  ${e.type.padEnd(6)} ${(e.name || DOMAIN).padEnd(40)} -> ${e.content}`));
    if (!APPLY) { console.log('\nRe-run with --apply to delete these: node scripts/setup-dns.js --clean-parking --apply'); return; }
    for (const e of parking) { await pb(`/dns/delete/${DOMAIN}/${e.id}`); console.log(`  deleted ${e.id}`); }
    console.log(`\n✓ Removed ${parking.length} parking record(s). Specific records (DKIM, etc.) will now resolve.`);
    return;
  }

  const findMatch = (r) => existing.filter((e) => e.type === r.type && norm(e.name) === norm(fullHost(r.name)));

  const plan = { create: [], skipExists: [], replace: [], skipPlaceholder: [] };
  for (const r of desired) {
    if (/REPLACE_/.test(r.content)) { plan.skipPlaceholder.push(r); continue; }
    const matches = findMatch(r);
    const exact = matches.find((e) => norm(e.content) === norm(r.content));
    if (exact) plan.skipExists.push(r);
    else if (matches.length && REPLACE) plan.replace.push({ r, id: matches[0].id });
    else if (matches.length) plan.skipExists.push({ ...r, _drift: matches[0].content }); // same host+type, different value — leave unless --replace
    else plan.create.push(r);
  }

  // 4) print plan
  const line = (r) => `${(r.type).padEnd(5)} ${fullHost(r.name).padEnd(34)} ${r.content}`;
  console.log(`Plan for ${DOMAIN}  (${APPLY ? 'APPLY' : 'DRY RUN — nothing will be written'})\n`);
  if (plan.create.length) { console.log('CREATE:'); plan.create.forEach((r) => console.log('  + ' + line(r))); }
  if (plan.replace.length) { console.log('REPLACE (--replace):'); plan.replace.forEach(({ r }) => console.log('  ~ ' + line(r))); }
  if (plan.skipExists.length) { console.log('ALREADY SET / skip:'); plan.skipExists.forEach((r) => console.log('  = ' + line(r) + (r._drift ? `   (drift: existing="${r._drift}" — re-run with --replace to update)` : ''))); }
  if (plan.skipPlaceholder.length) {
    console.log('\n⚠ NEEDS A REAL VALUE (skipped — still a REPLACE_ placeholder in dns-records.json):');
    plan.skipPlaceholder.forEach((r) => console.log(`  ! ${r.type} ${fullHost(r.name)} — ${r.note || 'paste the value from your provider'}`));
  }

  if (!APPLY) {
    console.log(`\nDry run. To write the CREATE items: node scripts/setup-dns.js --apply${WITH_SITE ? ' --site' : ''}`);
    return;
  }

  // 5) apply
  console.log('');
  for (const r of plan.create) {
    await pb(`/dns/create/${DOMAIN}`, { name: r.name, type: r.type, content: r.content, ttl: String(r.ttl || 600), ...(r.prio != null ? { prio: String(r.prio) } : {}) });
    console.log('  created ' + line(r));
  }
  for (const { r, id } of plan.replace) {
    await pb(`/dns/edit/${DOMAIN}/${id}`, { name: r.name, type: r.type, content: r.content, ttl: String(r.ttl || 600), ...(r.prio != null ? { prio: String(r.prio) } : {}) });
    console.log('  updated ' + line(r));
  }
  console.log(`\n✓ Done. Created ${plan.create.length}, updated ${plan.replace.length}. DNS can take a few minutes to propagate; then click "verify" in your email provider's domain page.`);
  if (plan.skipPlaceholder.length) console.log(`⚠ ${plan.skipPlaceholder.length} record(s) still need real values — fill them in marketing/email/dns-records.json and re-run --apply.`);
}

main().catch((e) => die(e.message));
