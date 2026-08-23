#!/usr/bin/env node
// scripts/create-bundles.js
// End-to-end automation for the 20%-off learning-path bundles:
//   1. read BUNDLES (single source of truth) from build-practice-site.js
//   2. resolve each member course's numeric Udemy id (live taught-courses API,
//      falling back to exports/<slug>/shell-spec.json courseId)
//   3. create + publish the bundle on Udemy (idempotent; skips ones already done)
//   4. pull the bundle's public URL and write it back into build-practice-site.js
//      (BUNDLES[].udemyBundleUrl) AND record it in exports/bundles-log.json
//   5. rebuild the practice site so the bundle cards link to the real bundle
//
// Auth: UDEMY_COOKIE in .env (repo root) — same capture as the practice-test loader.
//       See scripts/udemy/README.md / ClaudeFolder/udemy-autopublish/docs/udemy-auth.md.
//
// Usage:
//   node scripts/create-bundles.js --dry-run          # plan only: prints every call
//   node scripts/create-bundles.js                    # create/publish all, sync, rebuild
//   node scripts/create-bundles.js --only=aws-associate-trio,ai-product
//   node scripts/create-bundles.js --force            # recreate even if logged as done
//   node scripts/create-bundles.js --no-build         # skip the site rebuild
//   node scripts/create-bundles.js --list             # show planned bundles + prices, exit
//
// NOTE: the bundle create/publish endpoints are [VERIFY] (see scripts/udemy/bundles.js).
// Run --dry-run first; if a real call 404s, confirm the endpoint per the header in
// bundles.js (one DevTools capture) and re-run. Nothing here is destructive: it only
// creates bundles and edits the registry's udemyBundleUrl fields.

'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE_SRC = path.join(ROOT, 'scripts', 'build-practice-site.js');
const LOG_PATH = path.join(ROOT, 'exports', 'bundles-log.json');

const { COURSES, SITE_URL, BUNDLES, BUNDLE_DISCOUNT } = require('./build-practice-site.js');
const bundlesApi = require('./udemy/bundles');

function arg(name, def) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  const i = hit.indexOf('=');
  return i === -1 ? true : hit.slice(i + 1);
}
const DRY = !!arg('dry-run', false);
const FORCE = !!arg('force', false);
const NO_BUILD = !!arg('no-build', false);
const ONLY = (arg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

const priceNum = (s) => parseFloat(String(s || '').replace(/[^0-9.]/g, '')) || 0;
const money = (n) => '$' + n.toFixed(2);
const courseByPage = Object.fromEntries(COURSES.map((c) => [c.page, c]));

// exports/*/shell-spec.json courseId, keyed by slug (fallback id source).
function shellSpecCourseIds() {
  const out = {};
  const dir = path.join(ROOT, 'exports');
  if (!fs.existsSync(dir)) return out;
  for (const slug of fs.readdirSync(dir)) {
    const p = path.join(dir, slug, 'shell-spec.json');
    if (!fs.existsSync(p)) continue;
    try {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (s.courseId) out[s.slug || slug] = s.courseId;
    } catch (_) {}
  }
  return out;
}

function bundlePrice(bundle) {
  const members = bundle.pages.map((pg) => courseByPage[pg]).filter(Boolean);
  const listTotal = members.reduce((s, c) => s + priceNum(c.list), 0);
  const price = Math.round(listTotal * (1 - BUNDLE_DISCOUNT) * 100) / 100;
  return { members, listTotal, price };
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch (_) { return {}; }
}
function saveLog(log) {
  if (DRY) return;
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n');
}

// Write a bundle's public URL back into build-practice-site.js BUNDLES[id].udemyBundleUrl.
function writeBundleUrl(id, url) {
  let src = fs.readFileSync(SITE_SRC, 'utf8');
  const re = new RegExp(`(id: '${id}'[\\s\\S]*?udemyBundleUrl: ')[^']*(')`);
  if (!re.test(src)) { console.warn(`  ! could not find BUNDLES entry '${id}' to write url`); return false; }
  src = src.replace(re, `$1${url}$2`);
  if (!DRY) fs.writeFileSync(SITE_SRC, src);
  return true;
}

function rebuildSite() {
  console.log('\n> rebuilding practice site (build-practice-site.js --all)…');
  const r = spawnSync('node', [path.join('scripts', 'build-practice-site.js'), '--all'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) console.warn('  ! site rebuild exited non-zero');
}

(async () => {
  let targets = BUNDLES.filter((b) => !ONLY.length || ONLY.includes(b.id));
  if (!targets.length) { console.error('No matching bundles. --only ids:', BUNDLES.map((b) => b.id).join(', ')); process.exit(1); }

  if (arg('list', false)) {
    for (const b of targets) {
      const { members, listTotal, price } = bundlePrice(b);
      console.log(`${b.id}\n  ${b.title} — ${members.length} courses\n  ${members.map((m) => m.page).join(', ')}\n  ${money(listTotal)} -> ${money(price)} (${Math.round(BUNDLE_DISCOUNT * 100)}% off)\n`);
    }
    return;
  }

  // Client (needed for live create). In dry-run we tolerate a missing cookie so the
  // plan can be printed offline; ids then come from shell-spec where available.
  let client = null;
  try {
    const { UdemyClient } = require('./udemy/client');
    client = new UdemyClient({ dryRun: DRY });
  } catch (e) {
    if (!DRY) { console.error('Auth error:', e.message); process.exit(1); }
    console.warn('(dry-run, no live session) — will plan from shell-spec ids only:\n  ' + String(e.message).split('\n')[0]);
  }

  if (client && !DRY) {
    const me = await client.whoami().catch((e) => { console.error(e.message); process.exit(1); });
    console.log(`Authenticated as: ${me.display_name || me.email || 'unknown'}\n`);
  }

  // --probe: read-only discovery of the real bundle endpoint. GET-only (no writes),
  // prints the HTTP status for each candidate so we can point BUNDLE_API at the one
  // that responds 200. Safe to run anytime.
  const probeId = arg('probe-id', null); // e.g. --probe-id=34831 (a bundle you already created)
  if (arg('probe', false) || probeId) {
    if (!client) { console.error('probe needs a live session (UDEMY_COOKIE in .env)'); process.exit(1); }
    // namespaces to try; probed as a collection (…/) and, if --probe-id given, as a
    // detail (…/<id>/). A known-id detail GET is the most reliable: it 200s only for
    // the correct namespace.
    const namespaces = [
      '/api-2.0/course-bundles/',
      '/api-2.0/bundles/',
      '/api-2.0/users/me/taught-course-bundles/',
      '/api-2.0/users/me/course-bundles/',
      '/api-2.0/users/me/bundles/',
      '/api-2.0/users/me/taught-bundles/',
      '/api-2.0/marketplace-course-bundles/',
      '/api-2.0/instructor-course-bundles/',
      '/api-2.0/users/me/instructor-course-bundles/',
      '/api-2.0/course-collections/',
      '/api-2.0/users/me/taught-course-collections/',
      '/api-2.0/seo-course-bundles/',
      '/api-2.0/organization-course-bundles/',
    ];
    console.log(`Probing bundle endpoints (GET, read-only)${probeId ? ` for bundle id ${probeId}` : ''}:\n`);
    let found = null;
    for (const ns of namespaces) {
      const url = probeId ? `${ns}${probeId}/` : `${ns}?page_size=1`;
      try {
        const r = await client.get(url);
        const keys = r && typeof r === 'object' ? Object.keys(r).slice(0, 8).join(',') : typeof r;
        console.log(`  200  ${url}   <-- EXISTS  (keys: ${keys})`);
        found = found || ns;
      } catch (e) {
        const code = e.status || (String(e.message).match(/AUTH FAILED \((\d+)\)/) || [])[1] || 'ERR';
        console.log(`  ${String(code).padEnd(4)} ${url}`);
      }
    }
    if (found) console.log(`\n==> Bundle namespace looks like: ${found}\n    Tell me this and I'll wire BUNDLE_API to it.`);
    else console.log('\nNo namespace matched. Best next step: capture a HAR *while creating* a bundle\n(record BEFORE clicking Create) so the POST request is included.');
    return;
  }

  // Resolve course ids: live permalink map (preferred) + shell-spec fallback.
  let liveMap = {};
  if (client) {
    try { liveMap = await bundlesApi.courseIdByPermalink(client); }
    catch (e) { if (!DRY) throw e; console.warn('  (could not fetch taught courses in dry-run)'); }
  }
  const specIds = shellSpecCourseIds();

  function resolveMember(course) {
    const pl = bundlesApi.permalinkOf(course.udemy);
    if (liveMap[pl]) return { id: liveMap[pl].id, via: 'api', permalink: pl };
    if (specIds[course.slug]) return { id: specIds[course.slug], via: 'shell-spec', permalink: pl };
    return { id: null, via: 'unresolved', permalink: pl };
  }

  // Optional dedupe: existing bundles by title (skip if endpoint unconfirmed).
  let existingByTitle = {};
  if (client && !DRY) {
    const existing = await bundlesApi.listBundles(client);
    if (Array.isArray(existing)) existingByTitle = Object.fromEntries(existing.map((b) => [String(b.title || '').trim(), b]));
    else console.warn('  (bundle-list endpoint unconfirmed — dedupe by log only)');
  }

  const log = loadLog();
  const summary = [];

  for (const b of targets) {
    const { members, listTotal, price } = bundlePrice(b);
    const resolved = members.map((m) => ({ course: m, ...resolveMember(m) }));
    const unresolved = resolved.filter((r) => !r.id);
    console.log(`\n=== ${b.title} (${b.id}) ===`);
    console.log(`  courses: ${resolved.map((r) => `${r.course.page}${r.id ? '#' + r.id : ' [UNRESOLVED]'}`).join(', ')}`);
    console.log(`  price:   ${money(listTotal)} -> ${money(price)} (${Math.round(BUNDLE_DISCOUNT * 100)}% off)`);

    const prior = log[b.id];
    if (prior && prior.udemyBundleId && FORCE) {
      console.warn(`  ! --force will create a NEW bundle; the existing one (id ${prior.udemyBundleId}) is left on Udemy — delete it by hand if unwanted.`);
    }
    if (prior && prior.udemyBundleId && !FORCE) {
      // Created in a previous run — NEVER re-create (that would duplicate on Udemy).
      // Finish/repair the run instead: ensure published, (re)fetch the URL, re-sync source.
      let url = prior.url || '';
      if (!url && client && !DRY) {
        await bundlesApi.publishBundle(client, prior.udemyBundleId).catch(() => {});
        url = await bundlesApi.waitForBundleUrl(client, prior.udemyBundleId, client.base);
        if (url) { prior.url = url; log[b.id] = prior; saveLog(log); }
      }
      if (url) {
        console.log(`  ✓ already created (id ${prior.udemyBundleId}): ${url} — re-syncing (use --force to recreate)`);
        writeBundleUrl(b.id, url);
        summary.push([b.id, 'synced', url]);
      } else {
        console.log(`  ✓ already created (id ${prior.udemyBundleId}) but URL still pending — re-run live to fetch it`);
        summary.push([b.id, 'pending', '']);
      }
      continue;
    }
    if (unresolved.length) {
      console.log(`  ! skipping — ${unresolved.length} member id(s) unresolved: ${unresolved.map((r) => r.course.page).join(', ')}`);
      console.log(`    (run without --dry-run so the live taught-courses API can resolve them)`);
      summary.push([b.id, 'unresolved', '']);
      continue;
    }
    const courseIds = resolved.map((r) => r.id);

    if (existingByTitle[b.title.trim()] && !FORCE) {
      const ex = existingByTitle[b.title.trim()];
      const url = bundlesApi.BUNDLE_API.publicUrl(client.base, ex);
      console.log(`  ✓ bundle with this title already on Udemy (id ${ex.id}); reusing ${url || '(url pending)'}`);
      log[b.id] = { udemyBundleId: ex.id, url, title: b.title, courseIds, status: 'reused', at: new Date().toISOString() };
      if (url) writeBundleUrl(b.id, url);
      saveLog(log);
      summary.push([b.id, 'reused', url]);
      continue;
    }

    if (DRY) {
      const body = bundlesApi.BUNDLE_API.create.buildBody({ title: b.title, description: b.blurb, courseIds, priceAmount: price });
      console.log(`  [dry-run] POST ${bundlesApi.BUNDLE_API.create.path}`);
      console.log(`            ${JSON.stringify(body)}`);
      console.log(`  [dry-run] PATCH ${bundlesApi.BUNDLE_API.publish.path('<newId>')} ${JSON.stringify(bundlesApi.BUNDLE_API.publish.buildBody())}`);
      summary.push([b.id, 'planned', '']);
      continue;
    }

    // ---- live create + publish + url ----
    try {
      const created = await bundlesApi.createBundle(client, { title: b.title, description: b.blurb, courseIds, priceAmount: price });
      const bid = created.id || created.pk || (created.bundle && created.bundle.id);
      if (!bid) throw new Error('create returned no id: ' + JSON.stringify(created).slice(0, 200));
      console.log(`  created bundle id ${bid}`);
      await bundlesApi.publishBundle(client, bid).catch((e) => console.warn(`  ! publish failed (verify endpoint): ${String(e).slice(0, 140)}`));
      const url = await bundlesApi.waitForBundleUrl(client, bid, client.base) || bundlesApi.BUNDLE_API.publicUrl(client.base, created);
      console.log(`  url: ${url || '(pending — check the bundle in Udemy)'}`);
      log[b.id] = { udemyBundleId: bid, url, title: b.title, courseIds, status: 'created', at: new Date().toISOString() };
      if (url) writeBundleUrl(b.id, url);
      saveLog(log);
      summary.push([b.id, 'created', url]);
    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}`);
      if (e.status === 404) console.error('    -> the bundle endpoint is likely wrong; confirm it (see scripts/udemy/bundles.js header) and re-run.');
      log[b.id] = { status: 'error', error: String(e.message).slice(0, 300), courseIds, at: new Date().toISOString() };
      saveLog(log);
      summary.push([b.id, 'error', '']);
    }
  }

  console.log('\n===== summary =====');
  for (const [id, status, url] of summary) console.log(`  ${status.padEnd(10)} ${id}${url ? '  ' + url : ''}`);

  const created = summary.filter((s) => ['created', 'reused'].includes(s[1])).length;
  if (created && !NO_BUILD && !DRY) rebuildSite();
  else if (DRY) console.log('\n(dry-run: no bundles created, source + site unchanged)');
})();
