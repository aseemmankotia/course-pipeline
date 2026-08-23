#!/usr/bin/env node
/**
 * sync-coupons.js — pull each LIVE course's active Udemy promo coupon and write it
 * into marketing/coupons.json, which build-practice-site.js merges onto COURSES so
 * every discounted course shows a price badge + deal-link CTA on technuggets.academy.
 *
 * WHY: coupons are created in Udemy's promotions UI (there's no create API worth
 * trusting, and Udemy caps the coupon price to a ~$12.99–$34.99 band + a monthly
 * creation limit). Most live courses already carry an active FREETEST33 / FREETEST33B
 * coupon — this script just SURFACES them on the site (read-only against Udemy) and
 * reports which live courses still have no coupon so you can create one in the UI.
 *
 * Runs ON THE MAC (needs UDEMY_COOKIE in .env — same auth as load-practice-tests.js).
 *
 * Usage:
 *   node scripts/sync-coupons.js            # fetch + write marketing/coupons.json
 *   node scripts/sync-coupons.js --dry-run  # print what it would write, no file
 *   npm run sync-coupons
 * Then rebuild + deploy the site:  node scripts/build-practice-site.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { UdemyClient } = require('./udemy/client');
const { COURSES } = require('./build-practice-site.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'marketing', 'coupons.json');
const DRY = process.argv.includes('--dry-run');
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = iso => { const d = new Date(iso); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const urlSlug = u => { const m = String(u || '').match(/\/course\/([^/?#]+)/); return m ? m[1] : null; };
const baseUrl = u => String(u || '').split('?')[0];

(async () => {
  const client = new UdemyClient();
  const me = await client.whoami().catch(e => { console.error(String(e)); process.exit(1); });
  console.log(`Authenticated as: ${me.display_name || '(unknown)'}`);

  // 1. map every taught course's URL slug -> numeric id
  const slugToId = {};
  let url = '/api-2.0/users/me/taught-courses/?fields[course]=published_title,is_published&page_size=100';
  for (let i = 0; i < 4 && url; i++) {
    const j = await client.get(url);
    for (const c of (j.results || [])) if (c.published_title) slugToId[c.published_title] = c.id;
    url = j.next ? j.next.replace('https://www.udemy.com', '') : null;
  }

  const coupons = {};      // page -> {code, price, expires, url}
  const missing = [];      // live courses with no active coupon
  const unmatched = [];    // couldn't resolve a Udemy id

  for (const c of COURSES.filter(x => x.live)) {
    const slug = urlSlug(c.udemy);
    const id = slug ? slugToId[slug] : null;
    if (!id) { unmatched.push(c.page); continue; }
    let active = null;
    try {
      const j = await client.get(`/api-2.0/courses/${id}/coupons-v2/?ordering=end_time,-created&page=1&invalid=false&page_size=5`);
      const list = (j.results || []).filter(x => x.is_active);
      active = list.sort((a, b) => new Date(a.end_time) - new Date(b.end_time))[0] || null;
    } catch (e) { console.warn(`  ${c.page}: coupon fetch failed — ${String(e).slice(0, 80)}`); }
    if (!active) { missing.push(c.page); continue; }
    coupons[c.page] = {
      code: active.code,
      price: `$${Number(active.discount_value).toFixed(2)}`,
      expires: fmtDate(active.end_time),
      url: `${baseUrl(c.udemy)}?couponCode=${active.code}`,
    };
    await new Promise(r => setTimeout(r, 120)); // gentle on the API
  }

  const n = Object.keys(coupons).length;
  console.log(`\nActive coupons wired: ${n}`);
  console.log(`Live courses with NO coupon (create one in the promotions UI): ${missing.length}`);
  if (missing.length) console.log('  ' + missing.join(', '));
  if (unmatched.length) console.log(`Could not resolve a Udemy id for: ${unmatched.join(', ')}`);

  if (DRY) { console.log('\n[dry-run] not writing. Sample:\n' + JSON.stringify(coupons, Object.keys(coupons).slice(0, 3), 2)); process.exit(0); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(coupons, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(ROOT, OUT)} (${n} coupons). Now run: node scripts/build-practice-site.js`);
})().catch(e => { console.error('\nFATAL:', String(e)); process.exit(1); });
