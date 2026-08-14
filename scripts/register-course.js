#!/usr/bin/env node
/**
 * register-course.js — wire a NEWLY-LIVE course into the marketing surfaces so
 * the funnel stays in sync (this was the manual step that left Agentforce and
 * CCDV-F off the site/promo for weeks). Idempotent.
 *
 * Adds the slug to:
 *   • scripts/build-practice-site.js  COURSES  (free practice-test funnel)
 *   • scripts/promo-all.js            COURSES  (YouTube Short pipeline)
 *   • marketing/reviews-campaign-2026-07.md  portfolio line
 *
 * The live Udemy URL is required (promo + site links must resolve). Coupon is
 * optional (add it when the monthly FREETEST33 batch is created).
 *
 * Usage:
 *   node scripts/register-course.js --slug=<slug> --udemy=<liveCourseUrl> \
 *        [--tagline="..."] [--page=<short>] [--coupon=CODE --price=$X --list=$Y --expires="Aug 22"]
 *
 * After running: `node scripts/build-practice-site.js --all` + deploy, and
 * `node scripts/promo-all.js --slug=<slug> && node scripts/promo-all.js --upload`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug || !args.udemy) {
  console.error('Usage: node scripts/register-course.js --slug=<slug> --udemy=<liveCourseUrl> [--tagline=..] [--page=..] [--coupon=CODE --price=$X --list=$Y --expires="Aug 22"]');
  process.exit(1);
}
const slug = args.slug;
const cfg = (() => {
  for (const f of fs.readdirSync(path.join(ROOT, 'course-configs'))) {
    if (!f.endsWith('.json')) continue;
    try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'course-configs', f), 'utf8')); if (c.slug === slug) return c; } catch {}
  }
  return {};
})();
const name = cfg.cert_name || slug;
const page = (args.page && typeof args.page === 'string' ? args.page : (cfg.exam_code || slug).toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
const tagline = (typeof args.tagline === 'string' && args.tagline) || (cfg.domains || []).slice(0, 2).map(d => d.name).join(', ') || (cfg.topic || '');
const tags = [cfg.exam_vendor, cfg.exam_code, 'certification', 'exam prep'].filter(Boolean).join(',').toLowerCase();
const shortTitle = `${name}: exam-prep in 60 seconds #Shorts`;

const done = [];
function patch(file, marker, insert, presentTest) {
  const p = path.join(ROOT, file);
  let src = fs.readFileSync(p, 'utf8');
  if (presentTest(src)) { done.push(`${file}: already present`); return; }
  const i = src.lastIndexOf(marker);
  if (i < 0) { done.push(`${file}: ⚠ marker not found — skipped`); return; }
  src = src.slice(0, i) + insert + src.slice(i);
  fs.writeFileSync(p, src);
  done.push(`${file}: added`);
}

// 1. practice-site registry
// NOTE: anchor on the COURSES sentinel, NOT the generic '\n];' — build-practice-site.js
// has a later VENDOR_ACCENT array whose close would otherwise capture the insert (2026-08-14 fix).
patch('scripts/build-practice-site.js', '  // __COURSES_END__ (register-course.js inserts new course objects immediately above this line)\n', `  { slug: '${slug}', name: ${JSON.stringify(name)},
    tagline: ${JSON.stringify(tagline)}, page: '${page}',
    udemy: '${args.udemy}', live: true${args.coupon ? `,
    coupon: { code: '${args.coupon}', price: '${args.price || ''}', list: '${args.list || ''}', expires: '${args.expires || ''}',
      url: '${args.udemy.split('?')[0]}?couponCode=${args.coupon}' }` : ''} },
`, s => s.includes(`slug: '${slug}'`));

// 2. promo-all registry
patch('scripts/promo-all.js', '\n];', `  { slug: '${slug}', short: ${JSON.stringify(name.slice(0, 40))},
    title: ${JSON.stringify(shortTitle)},
    tags: ${JSON.stringify(tags)},
    udemy: '${args.udemy}', live: true },
`, s => s.includes(`slug: '${slug}'`));

// 3. reviews-campaign portfolio
const rc = path.join(ROOT, 'marketing', 'reviews-campaign-2026-07.md');
if (fs.existsSync(rc)) {
  let m = fs.readFileSync(rc, 'utf8');
  if (m.includes(name)) done.push('reviews-campaign: already present');
  else {
    m = m.replace(/(Portfolio:[\s\S]*?)\n\n/, (blk) => blk.replace(/\.?\s*$/, '') + `, ${name} (added ${new Date().toISOString().slice(0, 10)}).\n\n`);
    fs.writeFileSync(rc, m); done.push('reviews-campaign: added');
  }
}

console.log(`Registered ${slug}:`);
done.forEach(d => console.log('  • ' + d));
console.log('\nNext: node scripts/build-practice-site.js --all  (then deploy) · node scripts/promo-all.js --slug=' + slug + ' && node scripts/promo-all.js --upload');
