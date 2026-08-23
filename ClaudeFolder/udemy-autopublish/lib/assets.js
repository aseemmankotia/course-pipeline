// scripts/udemy/assets.js
// Upload video + image files to Udemy and attach them (lecture video / course image),
// entirely via the instructor API. Runs on the Mac (Node 18+) where the files live.
//
// ============================================================================
//  IMPORTANT — the upload *initiation* endpoint needs a one-time capture.
//  Udemy uploads a file by (1) asking the API for short-lived storage credentials,
//  (2) PUT/POSTing the bytes to that storage (S3/Azure), (3) telling the API the
//  upload finished. Steps (2)+(3) are generic; step (1)'s exact path changes and
//  could not be observed headless. Run scripts/udemy/capture-upload.js once (it
//  prints the real endpoints during a manual drag-drop) and paste the result — then
//  set CREATE_ASSET_ENDPOINT below. Until then, uploadFile() throws a clear message.
// ============================================================================

'use strict';
const fs = require('fs');
const path = require('path');

// Filled in after one capture (see capture-upload.js). Example shape once known:
//   const CREATE_ASSET_ENDPOINT = (cid) => `/api-2.0/users/me/taught-courses/${cid}/asset-creation/`;
const CREATE_ASSET_ENDPOINT = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll an asset until it finishes processing (status 1 = ready, -1 = failed).
async function waitForAsset(client, assetId, { timeoutMs = 30 * 60 * 1000, everyMs = 10000, log = console.log } = {}) {
  const t0 = Date.now();
  for (;;) {
    const a = await client.get(`/api-2.0/users/me/assets/${assetId}/`, { query: { 'fields[asset]': 'status,title' } });
    if (a.status === 1) return a;
    if (a.status === -1) throw new Error(`Asset ${assetId} (${a.title}) FAILED processing on Udemy.`);
    if (Date.now() - t0 > timeoutMs) throw new Error(`Asset ${assetId} still processing after ${Math.round(timeoutMs / 60000)}min.`);
    log(`    ...processing ${a.title} (status ${a.status})`);
    await sleep(everyMs);
  }
}

// Create the asset + upload the bytes. Returns the asset id.
async function uploadFile(client, cid, filePath, assetType /* 'Video' | 'Image' */) {
  if (!CREATE_ASSET_ENDPOINT) {
    throw new Error(
      'Upload endpoint not captured yet. Run: node scripts/udemy/capture-upload.js , do one manual ' +
      'video drop in the Bulk Uploader, paste the printed endpoints back, and set CREATE_ASSET_ENDPOINT in assets.js.'
    );
  }
  const filename = path.basename(filePath);
  const size = fs.statSync(filePath).size;
  // (1) ask for storage credentials + a pending asset
  const init = await client.post(CREATE_ASSET_ENDPOINT(cid), { asset_type: assetType, title: filename, filename, file_size: size });
  const asset = init.asset || init;
  const upload = init.upload || init.credentials || init; // { url, fields } style presigned POST
  // (2) send bytes to storage (S3 presigned POST or PUT)
  const buf = fs.readFileSync(filePath);
  if (upload.fields) {
    const form = new FormData();
    for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
    form.append('file', new Blob([buf]), filename);
    const r = await fetch(upload.url, { method: 'POST', body: form });
    if (!r.ok) throw new Error(`storage POST failed ${r.status}`);
  } else if (upload.url) {
    const r = await fetch(upload.url, { method: 'PUT', body: buf });
    if (!r.ok) throw new Error(`storage PUT failed ${r.status}`);
  } else {
    throw new Error('Unrecognized upload credential shape; re-capture with capture-upload.js.');
  }
  // (3) notify completion if the init response asked us to
  if (init.complete_url) await client.post(init.complete_url, {});
  return asset.id;
}

// Upload a lecture video and attach it.
async function uploadAndAttachVideo(client, cid, lectureId, filePath, log = console.log) {
  log(`  uploading ${path.basename(filePath)}`);
  const assetId = await uploadFile(client, cid, filePath, 'Video');
  await waitForAsset(client, assetId, { log });
  await client.patch(`/api-2.0/users/me/taught-courses/${cid}/lectures/${lectureId}/`, { asset: assetId });
  return assetId;
}

// Upload + set the course image.
async function uploadCourseImage(client, cid, filePath, log = console.log) {
  log(`  uploading course image ${path.basename(filePath)}`);
  const assetId = await uploadFile(client, cid, filePath, 'Image');
  await client.patch(`/api-2.0/courses/${cid}/`, { image: assetId }); // [VERIFY] image field name
  return assetId;
}

module.exports = { uploadFile, uploadAndAttachVideo, uploadCourseImage, waitForAsset, CREATE_ASSET_ENDPOINT };
