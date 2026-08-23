// scripts/udemy/course.js
// Course lifecycle via the Udemy instructor API: create shell, set goals/description,
// build curriculum, set landing page + pricing, submit for review.
//
// VALIDATION STATUS (as of 2026-08-20):
//   [OK]      setGoals, buildCurriculum, attachVideo  — exercised live this session.
//   [VERIFY]  createCourse, setLanding, setPricing, submitForReview — coded to the
//             observed web-app shapes; confirm on first Mac run (they are side-effectful
//             so were not blind-tested). Each logs its request; use --dry-run first.

'use strict';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- create shell -----------------------------------------------------------
// [VERIFY] The New-Course wizard's final step POSTs here. Minimal required fields
// are title + type; category fields make the shell land in the right taxonomy.
async function createCourse(client, { title, primaryCategoryId, primarySubcategoryId }) {
  const body = { title, course_type: 'course' };
  if (primaryCategoryId) body.primary_category = primaryCategoryId;
  if (primarySubcategoryId) body.primary_subcategory = primarySubcategoryId;
  const c = await client.post('/api-2.0/users/me/taught-courses/', body);
  return c; // { id, title, ... }
}

// ---- goals / landing copy ---------------------------------------------------
// [OK] PATCH /api-2.0/courses/{cid}/ with the *_data envelopes. Description MUST
// start with the verbatim AI-disclosure line (enforced by compliance-check.js).
async function setGoals(client, cid, { headline, descriptionHtml, objectives, requirements, audiences }) {
  const body = {};
  if (headline != null) body.headline = headline;
  if (descriptionHtml != null) body.description = descriptionHtml;
  if (objectives) body.what_you_will_learn_data = { items: objectives };
  if (requirements) body.requirements_data = { items: requirements };
  if (audiences) body.who_should_attend_data = { items: audiences };
  return client.patch(`/api-2.0/courses/${cid}/`, body);
}

// ---- landing page (level / category / topic) --------------------------------
// [VERIFY] instructional_level + category fields on the course; the free-text
// "topic"/label uses the course-labels endpoint.
async function setLanding(client, cid, { level, primaryCategoryId, primarySubcategoryId, topicLabelId }) {
  const body = {};
  if (level) body.instructional_level = level;                 // e.g. 'Beginner'|'Intermediate'|'Expert'|'All'
  if (primaryCategoryId) body.primary_category = primaryCategoryId;
  if (primarySubcategoryId) body.primary_subcategory = primarySubcategoryId;
  const res = Object.keys(body).length ? await client.patch(`/api-2.0/courses/${cid}/`, body) : null;
  if (topicLabelId) {
    // [VERIFY] attach a topic/label
    await client.post(`/api-2.0/courses/${cid}/labels/`, { label_id: topicLabelId }).catch((e) => {
      console.warn('  [setLanding] topic label attach failed (verify endpoint):', String(e).slice(0, 120));
    });
  }
  return res;
}

// ---- pricing ----------------------------------------------------------------
// [VERIFY] The pricing page sets a price tier. amount is the list price (e.g. 109.99);
// Udemy maps it to the nearest tier for the course's currency.
async function setPricing(client, cid, { amount, currency = 'usd' }) {
  return client.patch(`/api-2.0/users/me/taught-courses/${cid}/`, {
    price_detail: { amount, currency },
  });
}

// ---- curriculum -------------------------------------------------------------
// [OK] Create chapters + lectures, then set sort_order so chapters interleave
// above their lecture (Udemy orders by DESC sort_order; ch1 highest).
async function buildCurriculum(client, cid, chapterTitles, log = console.log) {
  const base = `/api-2.0/users/me/taught-courses/${cid}`;
  // wipe any existing items (fresh shells only)
  const [dch, dlec] = await Promise.all([
    client.get(`${base}/chapters/`, { query: { page_size: 100, 'fields[chapter]': 'title' } }),
    client.get(`${base}/lectures/`, { query: { page_size: 100, 'fields[lecture]': 'title' } }),
  ]);
  for (const l of (dlec.results || [])) await client.del(`${base}/lectures/${l.id}/`);
  for (const c of (dch.results || [])) await client.del(`${base}/chapters/${c.id}/`);
  // create one chapter + one lecture per title, in order
  for (const t of chapterTitles) {
    await client.post(`${base}/chapters/`, { title: t });
    await client.post(`${base}/lectures/`, { title: t });
  }
  const [chs, lecs] = await Promise.all([
    client.get(`${base}/chapters/`, { query: { page_size: 100, 'fields[chapter]': 'title,sort_order' } }),
    client.get(`${base}/lectures/`, { query: { page_size: 100, 'fields[lecture]': 'title,sort_order' } }),
  ]);
  const chBy = Object.fromEntries((chs.results || []).map((c) => [c.title, c]));
  const lecBy = Object.fromEntries((lecs.results || []).map((l) => [l.title, l]));
  const n = chapterTitles.length;
  for (let i = 0; i < n; i++) {
    const t = chapterTitles[i];
    const cNeed = 2 * n - 1 - 2 * i; // ch1 highest
    const lNeed = cNeed - 1;
    if (chBy[t] && chBy[t].sort_order !== cNeed) await client.patch(`${base}/chapters/${chBy[t].id}/`, { sort_order: cNeed });
    if (lecBy[t] && lecBy[t].sort_order !== lNeed) await client.patch(`${base}/lectures/${lecBy[t].id}/`, { sort_order: lNeed });
  }
  // return lecture ids in chapter order (ch1..chN) for video attach
  const fresh = await client.get(`${base}/lectures/`, { query: { page_size: 100, 'fields[lecture]': 'title,sort_order' } });
  const ordered = (fresh.results || []).sort((a, b) => b.sort_order - a.sort_order); // ch1 first
  log(`  curriculum: ${(chs.results || []).length} sections`);
  return ordered.map((l) => ({ id: l.id, title: l.title }));
}

// ---- attach an already-uploaded video asset to a lecture --------------------
// [OK] PATCH lecture.asset = assetId.
async function attachVideo(client, cid, lectureId, assetId) {
  return client.patch(`/api-2.0/users/me/taught-courses/${cid}/lectures/${lectureId}/`, { asset: assetId });
}

// ---- submit for review ------------------------------------------------------
// [VERIFY] The Submit-for-Review modal sets the (immutable) course URL slug and
// transitions the course into review. Endpoint/shape confirmed on first Mac run.
async function submitForReview(client, cid, { slug }) {
  // Best-effort: set the published URL then request review.
  if (slug) {
    await client.patch(`/api-2.0/courses/${cid}/`, { published_title: slug }).catch(() => {});
  }
  return client.post(`/api-2.0/users/me/taught-courses/${cid}/course-review-request/`, {}).catch(async (e) => {
    // fallback shape
    return client.post(`/api-2.0/courses/${cid}/review-requests/`, {});
  });
}

module.exports = {
  createCourse, setGoals, setLanding, setPricing, buildCurriculum, attachVideo, submitForReview,
};
