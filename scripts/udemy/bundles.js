// scripts/udemy/bundles.js
// Create + publish Udemy instructor "Course Bundles" via the instructor API, reusing
// the cookie-auth UdemyClient. Bundles group 2-3 owned, published courses; Udemy's
// self-serve Course Bundling tool (Instructor -> Tools -> Course Bundling) is what a
// learner buys in one checkout. This module drives the same endpoints that tool calls.
//
// VALIDATION STATUS (as of 2026-08-23):
//   [OK]      listTaughtCourses / resolveCourseIds — use the SAME taught-courses
//             endpoint already exercised live by course-lifecycle.js.
//   [VERIFY]  listBundles, createBundle, publishBundle, getBundle — Udemy's Course
//             Bundling API is undocumented; these are coded to the most likely
//             web-app shapes and CENTRALIZED in BUNDLE_API below so a single 30-second
//             DevTools capture confirms/fixes them. They are side-effectful, so run
//             create-bundles.js with --dry-run first (it prints every request).
//
// HOW TO CONFIRM THE ENDPOINT (once, on the Mac):
//   1. Instructor view -> Tools -> Course Bundling -> create ONE bundle by hand.
//   2. DevTools -> Network -> filter "bundle" -> click the POST request.
//   3. Copy its URL + JSON body + the GET that lists bundles, and reconcile with
//      BUNDLE_API below (path + payload key names). Usually only `path` and the
//      course-ids field name differ. After that, every remaining bundle is automated.

'use strict';

// --------------------------------------------------------------------------
// [VERIFY] Endpoint + payload shapes. Edit HERE after the DevTools capture; the
// rest of the module is shape-agnostic.
// --------------------------------------------------------------------------
const BUNDLE_API = {
  // List the instructor's existing bundles (for idempotency / dedupe by title).
  list: { path: '/api-2.0/users/me/taught-course-bundles/', resultsKey: 'results' },
  // Create a draft bundle. `buildBody` returns the POST JSON.
  // CONFIRMED 2026-08-23 (HAR capture): Udemy AUTO-PRICES bundles by market price —
  // the UI offers no price field — so we do NOT send price_detail. Bundle ids are
  // small integers (the captured bundle was id 34831), a separate id space from
  // 7-digit course ids.
  create: {
    path: '/api-2.0/users/me/taught-course-bundles/', // [VERIFY] — see header; confirm from a create-capture
    buildBody: ({ title, description, courseIds }) => ({
      title,
      description,
      // Most Udemy list-of-related-objects POSTs accept an array of ids under a
      // snake_case key; the two most likely are `course_ids` and `courses`.
      course_ids: courseIds,
      // Some shapes want the objects instead of bare ids — kept for easy switch:
      // courses: courseIds.map((id) => ({ id })),
    }),
  },
  // Publish / set availability on a created bundle.
  publish: {
    path: (id) => `/api-2.0/users/me/taught-course-bundles/${id}/`,
    method: 'PATCH',
    buildBody: () => ({ is_published: true }),
  },
  // Read one bundle back (to pull its public URL / permalink).
  get: { path: (id) => `/api-2.0/users/me/taught-course-bundles/${id}/` },
  // How to derive the public URL from a bundle object (try fields, then construct).
  publicUrl: (base, b) => {
    if (!b) return '';
    if (b.url) return b.url.startsWith('http') ? b.url : base + b.url;
    const permalink = b.permalink || b.published_title || b.slug;
    if (permalink) return `${base}/course-bundle/${permalink}/`;
    if (b.id) return `${base}/course-bundle/${b.id}/`;
    return '';
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const permalinkOf = (u) => {
  const m = String(u || '').match(/\/course\/([^/?#]+)/);
  return m ? m[1] : '';
};

// ---- resolve numeric course ids --------------------------------------------
// [OK] Same endpoint as course-lifecycle.js. Returns every taught course with the
// fields needed to match against our registry's Udemy permalink.
async function listTaughtCourses(client) {
  const out = [];
  let url = '/api-2.0/users/me/taught-courses/?page_size=100&fields[course]=title,url,published_title,status';
  while (url) {
    const r = await client.get(url);
    out.push(...(r.results || []));
    url = r.next || null;
  }
  return out;
}

// Build permalink -> {id,title} from live taught courses.
async function courseIdByPermalink(client) {
  const courses = await listTaughtCourses(client);
  const map = {};
  for (const c of courses) {
    const pl = permalinkOf(c.url) || c.published_title;
    if (pl) map[pl] = { id: c.id, title: c.title, status: c.status };
  }
  return map;
}

// ---- bundle CRUD ------------------------------------------------------------
// [VERIFY] list existing bundles (used to skip / dedupe by title).
async function listBundles(client) {
  try {
    const r = await client.get(BUNDLE_API.list.path + '?page_size=100');
    return r[BUNDLE_API.list.resultsKey] || r.results || [];
  } catch (e) {
    if (e.status === 404) return { __unconfirmed: true, error: e };
    throw e;
  }
}

// [VERIFY] create a draft bundle. Returns the created bundle object.
async function createBundle(client, { title, description, courseIds, priceAmount, currency }) {
  const body = BUNDLE_API.create.buildBody({ title, description, courseIds, priceAmount, currency });
  return client.post(BUNDLE_API.create.path, body);
}

// [VERIFY] publish a created bundle.
async function publishBundle(client, id) {
  const body = BUNDLE_API.publish.buildBody();
  return client.request(BUNDLE_API.publish.method || 'PATCH', BUNDLE_API.publish.path(id), { body });
}

// [VERIFY] read one bundle back.
async function getBundle(client, id) {
  return client.get(BUNDLE_API.get.path(id));
}

// Poll for the public URL after create/publish (mirrors practice-tests' post-create wait).
async function waitForBundleUrl(client, id, base, { tries = 6, gapMs = 1500 } = {}) {
  for (let i = 0; i < tries; i++) {
    let b = null;
    try { b = await getBundle(client, id); } catch (_) {}
    const url = BUNDLE_API.publicUrl(base, b);
    if (url) return url;
    await sleep(gapMs);
  }
  return '';
}

module.exports = {
  BUNDLE_API,
  permalinkOf,
  listTaughtCourses,
  courseIdByPermalink,
  listBundles,
  createBundle,
  publishBundle,
  getBundle,
  waitForBundleUrl,
};
