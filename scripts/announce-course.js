#!/usr/bin/env node
/**
 * announce-course.js — auto "new course just launched" newsletter.
 *
 * Builds a single-course launch email (brand-styled, same placeholders as the digest
 * so it works with any EMAIL_PROVIDER), then hands it to send-campaign.js. DRY RUN by
 * default; --live actually sends to the Brevo list. Deduped per slug so a course is
 * never announced live twice (marketing/email/announced.json), unless --force.
 *
 * Usage:
 *   node scripts/announce-course.js --slug=<slug>              # build + dry-run preview
 *   node scripts/announce-course.js --slug=<slug> --live       # build + send to the list
 *   node scripts/announce-course.js --slug=<slug> --live --force  # re-announce (override dedupe)
 *
 * The course must already be registered live (scripts/register-course.js) so its
 * name/tagline/coupon/links resolve from the COURSES registry.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { COURSES, SITE_URL } = require('./build-practice-site.js');

const ROOT = path.join(__dirname, '..');
const BRAND = 'TechNuggets Academy';
const flag = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const LIVE = process.argv.includes('--live');
const FORCE = process.argv.includes('--force');
const slug = flag('slug');

if (!slug) { console.error('Usage: node scripts/announce-course.js --slug=<slug> [--live] [--force]'); process.exit(1); }

const c = COURSES.find((x) => x.slug === slug);
if (!c) { console.error(`Unknown slug '${slug}'. Register it first: node scripts/register-course.js --slug=${slug} --udemy=<url>`); process.exit(1); }
if (!c.live) { console.error(`Course '${slug}' is not marked live in the registry — not announcing.`); process.exit(1); }

// Dedupe: never blast the list twice for the same course unless --force.
const ANNOUNCED = path.join(ROOT, 'marketing/email/announced.json');
const announced = fs.existsSync(ANNOUNCED) ? JSON.parse(fs.readFileSync(ANNOUNCED, 'utf8')) : {};
if (LIVE && announced[slug] && !FORCE) {
  console.error(`Already announced '${slug}' on ${announced[slug].date} (campaign ${announced[slug].campaignId || 'n/a'}). Use --force to re-send.`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const enroll = (c.coupon && c.coupon.url) ? c.coupon.url : c.udemy;
const practice = `${SITE_URL}/${c.page}.html`;
const priceLine = c.coupon
  ? `<div style="font-size:15px;margin:10px 0"><span style="color:#16a34a;font-weight:800;font-size:18px">${c.coupon.price}</span> <span style="color:#94a3b8;text-decoration:line-through">${c.coupon.list}</span> &nbsp;·&nbsp; launch code <b>${c.coupon.code}</b>${c.coupon.expires ? ` (ends ${c.coupon.expires})` : ''}</div>`
  : '';

const subject = `New course: ${c.name.replace(/ \(.*\)$/, '')} — free practice test inside`;
const preheader = `Just launched on ${BRAND}: ${c.tagline}. Free practice test + a launch discount.`;

const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
  <tr><td style="padding:22px 26px;background:#0f172a">
    <div style="color:#fff;font-size:20px;font-weight:800">${BRAND}</div>
    <div style="color:#f59e0b;font-size:13px;font-weight:700;letter-spacing:.04em">JUST LAUNCHED</div>
  </td></tr>
  <tr><td style="padding:24px 26px">
    <p style="font-size:15px;color:#334155;margin:0 0 12px">Hi{{name_or_there}}, a new certification course just went live:</p>
    <div style="font-size:21px;font-weight:800;color:#0f172a;line-height:1.25">${c.name}</div>
    <div style="font-size:15px;color:#475569;margin:6px 0 4px">${c.tagline}</div>
    ${priceLine}
    <div style="margin:16px 0 4px">
      <a href="${enroll}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:800;font-size:15px;display:inline-block">Enroll${c.coupon ? ` — ${c.coupon.price}` : ''} →</a>
      &nbsp;&nbsp;<a href="${practice}" style="color:#0284c7;text-decoration:none;font-size:15px;font-weight:700">Try the free practice test →</a>
    </div>
    <p style="font-size:13px;color:#64748b;margin:20px 0 0">Every course ships with free, no-sign-up practice questions and detailed explanations. Browse all ${COURSES.filter((x) => x.live).length} certifications at <a href="${SITE_URL}" style="color:#0284c7">${SITE_URL.replace('https://', '')}</a>.</p>
  </td></tr>
  <tr><td style="padding:18px 26px;background:#f1f5f9;border-top:1px solid #e2e8f0">
    <p style="font-size:12px;color:#94a3b8;margin:0 0 6px">You're receiving this because you opted in at ${BRAND}. Coupon price/expiry set by Udemy and may change.</p>
    <p style="font-size:12px;color:#94a3b8;margin:0">{{physical_address}}</p>
    <p style="font-size:12px;color:#64748b;margin:8px 0 0"><a href="{{unsubscribe_url}}" style="color:#64748b">Unsubscribe</a> · sent to {{email}}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

const text = [
  `${BRAND} — new course just launched`, '',
  `${c.name}`, `${c.tagline}`,
  c.coupon ? `${c.coupon.price} (was ${c.coupon.list}), launch code ${c.coupon.code}${c.coupon.expires ? ` ends ${c.coupon.expires}` : ''}` : '',
  `Enroll: ${enroll}`, `Free practice test: ${practice}`, '',
  `All courses: ${SITE_URL}`, '',
  `You opted in at ${BRAND}. {{physical_address}}`,
  `Unsubscribe: {{unsubscribe_url}}  (sent to {{email}})`,
].filter((l) => l !== '').join('\n');

const OUT_DIR = path.join(ROOT, 'marketing/email/campaigns');
fs.mkdirSync(OUT_DIR, { recursive: true });
const base = path.join(OUT_DIR, `${date}-launch-${slug}`);
fs.writeFileSync(`${base}.html`, html);
fs.writeFileSync(`${base}.txt`, text);
const manifest = {
  date, subject, preheader, kind: 'launch', slug,
  htmlFile: path.relative(ROOT, `${base}.html`), textFile: path.relative(ROOT, `${base}.txt`),
};
fs.writeFileSync(`${base}.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`📣 Launch email built for ${slug}: "${subject}"\n   → ${base}.{html,txt,json}`);

// Hand off to the sender (reuses the provider config: brevo / smtp / resend).
const args = ['scripts/send-campaign.js', `--campaign=${manifest.htmlFile.replace(/\.html$/, '.json')}`];
if (LIVE) args.push('--live');
console.log(`\n▶ send-campaign ${LIVE ? '(LIVE)' : '(dry run)'} …\n`);
try {
  const out = execFileSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(out);
  if (LIVE) {
    // Record the dedupe marker; capture the Brevo campaign id if the sender printed one.
    const m = out.match(/Brevo campaign (\d+)/);
    announced[slug] = { date, campaignId: m ? m[1] : null };
    fs.writeFileSync(ANNOUNCED, JSON.stringify(announced, null, 2) + '\n');
    console.log(`\n✅ Recorded announcement for ${slug} in marketing/email/announced.json`);
  } else {
    console.log(`\nDry run only. To send to the list:\n   node scripts/announce-course.js --slug=${slug} --live`);
  }
} catch (e) {
  console.error(`send-campaign failed: ${e.message}`);
  process.exit(1);
}
