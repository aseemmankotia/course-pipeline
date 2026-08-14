#!/usr/bin/env node
/**
 * Build the every-3-days "new + popular courses" email digest for TechNuggets Academy.
 *
 *   node scripts/build-campaign.js [--new=4] [--popular=3] [--out=marketing/email/campaigns]
 *
 * Pulls the single source of truth (COURSES) from build-practice-site.js, selects
 * recently-added ("new") and a rotating set of "popular" live courses, and emits
 * email-safe HTML + plain-text + a JSON manifest. Per-recipient tokens and the
 * physical address are injected at send time (send-campaign.js) via placeholders:
 *   {{unsubscribe_url}}  {{email}}  {{physical_address}}
 *
 * "New" = course entries with addedOn within NEW_WINDOW_DAYS, else the most
 * recently listed live courses. "Popular" rotates every run (seeded by the date)
 * so back-to-back digests stay fresh even without live enrollment data. Flag a
 * course as {popular:true} or {addedOn:'YYYY-MM-DD'} in build-practice-site.js to
 * override the heuristics.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { COURSES, SITE_URL } = require('./build-practice-site.js');

const flag = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const N_NEW = parseInt(flag('new', '4'), 10);
const N_POP = parseInt(flag('popular', '3'), 10);
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, flag('out', 'marketing/email/campaigns'));
const NEW_WINDOW_DAYS = 21;
const BRAND = 'TechNuggets Academy';

const live = COURSES.filter((c) => c.live);
const daysAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;

// --- selection ---
let dated = live.filter((c) => c.addedOn && daysAgo(c.addedOn) <= NEW_WINDOW_DAYS)
  .sort((a, b) => new Date(b.addedOn) - new Date(a.addedOn));
let newCourses = (dated.length ? dated : live.slice(-N_NEW).reverse()).slice(0, N_NEW);

const newSlugs = new Set(newCourses.map((c) => c.slug));
const rest = live.filter((c) => !newSlugs.has(c.slug));
const flagged = rest.filter((c) => c.popular);
// deterministic rotation so each 3-day send highlights a different subset
const seed = Math.floor(Date.now() / (86400000)) % Math.max(rest.length, 1);
const rotated = rest.slice(seed).concat(rest.slice(0, seed));
const popular = (flagged.length >= N_POP ? flagged : rotated).slice(0, N_POP);

const date = new Date().toISOString().slice(0, 10);
const enroll = (c) => (c.coupon && c.coupon.url) ? c.coupon.url : c.udemy;
const practice = (c) => `${SITE_URL}/${c.page}.html`;

// --- HTML (inline styles, email-client safe) ---
function courseBlock(c, tag) {
  const price = c.coupon ? `<span style="color:#16a34a;font-weight:700">${c.coupon.price}</span> <span style="color:#94a3b8;text-decoration:line-through">${c.coupon.list}</span>` : '';
  const deal = c.coupon ? ` &nbsp;·&nbsp; code <b>${c.coupon.code}</b> (ends ${c.coupon.expires})` : '';
  return `<tr><td style="padding:14px 0;border-bottom:1px solid #e2e8f0">
    ${tag ? `<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#0ea5e9;font-weight:700;margin-bottom:4px">${tag}</div>` : ''}
    <div style="font-size:17px;font-weight:700;color:#0f172a">${c.name}</div>
    <div style="font-size:14px;color:#475569;margin:2px 0 8px">${c.tagline}</div>
    <div style="font-size:14px;margin-bottom:10px">${price}${deal}</div>
    <a href="${enroll(c)}" style="background:#0ea5e9;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">Enroll${c.coupon ? ` — ${c.coupon.price}` : ''} →</a>
    &nbsp;<a href="${practice(c)}" style="color:#0284c7;text-decoration:none;font-size:14px;font-weight:600">Free practice test →</a>
  </td></tr>`;
}

const subject = newCourses.length
  ? `New on ${BRAND}: ${newCourses[0].name.replace(/ \(.*\)$/, '')}${newCourses.length > 1 ? ` + ${newCourses.length - 1} more` : ''}`
  : `${BRAND}: fresh exam-prep picks + coupons`;
const preheader = `New certification courses and this week's discounted picks — with free practice tests.`;

const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
  <tr><td style="padding:22px 26px;background:#0f172a">
    <div style="color:#fff;font-size:20px;font-weight:800">${BRAND}</div>
    <div style="color:#94a3b8;font-size:13px">Exam-focused certification prep · new courses every few days</div>
  </td></tr>
  <tr><td style="padding:22px 26px">
    <p style="font-size:15px;color:#334155;margin:0 0 6px">Hi{{name_or_there}},</p>
    <p style="font-size:15px;color:#334155;margin:0 0 4px">Here's what's new and popular right now — every course ships with a free practice test and a launch coupon.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${newCourses.map((c, i) => courseBlock(c, i === 0 ? 'New' : '')).join('')}
      ${popular.map((c, i) => courseBlock(c, i === 0 ? 'Popular this week' : '')).join('')}
    </table>
    <p style="font-size:13px;color:#64748b;margin:18px 0 0">Browse all ${live.length} certifications and free tests at <a href="${SITE_URL}" style="color:#0284c7">${SITE_URL.replace('https://','')}</a>.</p>
  </td></tr>
  <tr><td style="padding:18px 26px;background:#f1f5f9;border-top:1px solid #e2e8f0">
    <p style="font-size:12px;color:#94a3b8;margin:0 0 6px">You're receiving this because you opted in at ${BRAND}. Coupon prices/expiry set by Udemy and may change.</p>
    <p style="font-size:12px;color:#94a3b8;margin:0">{{physical_address}}</p>
    <p style="font-size:12px;color:#64748b;margin:8px 0 0"><a href="{{unsubscribe_url}}" style="color:#64748b">Unsubscribe</a> · sent to {{email}}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

const text = [
  `${BRAND} — new & popular exam-prep courses`, '',
  ...newCourses.map((c) => `NEW: ${c.name}\n  ${c.tagline}\n  ${c.coupon ? `${c.coupon.price} (was ${c.coupon.list}), code ${c.coupon.code} ends ${c.coupon.expires}` : ''}\n  Enroll: ${enroll(c)}\n  Free practice test: ${practice(c)}`),
  ...popular.map((c) => `POPULAR: ${c.name}\n  ${c.tagline}\n  Enroll: ${enroll(c)}\n  Free practice test: ${practice(c)}`),
  '', `All courses: ${SITE_URL}`, '',
  `You opted in at ${BRAND}. {{physical_address}}`,
  `Unsubscribe: {{unsubscribe_url}}  (sent to {{email}})`,
].join('\n');

fs.mkdirSync(OUT_DIR, { recursive: true });
const base = path.join(OUT_DIR, `${date}-digest`);
fs.writeFileSync(`${base}.html`, html);
fs.writeFileSync(`${base}.txt`, text);
fs.writeFileSync(`${base}.json`, JSON.stringify({
  date, subject, preheader,
  new: newCourses.map((c) => c.slug), popular: popular.map((c) => c.slug),
  htmlFile: path.relative(ROOT, `${base}.html`), textFile: path.relative(ROOT, `${base}.txt`),
}, null, 2) + '\n');

console.log(`📧 Campaign built: ${date}-digest`);
console.log(`   Subject: ${subject}`);
console.log(`   New (${newCourses.length}): ${newCourses.map((c) => c.slug).join(', ')}`);
console.log(`   Popular (${popular.length}): ${popular.map((c) => c.slug).join(', ')}`);
console.log(`   → ${base}.{html,txt,json}`);
