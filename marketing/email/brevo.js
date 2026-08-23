/**
 * Brevo (formerly Sendinblue) API helper — zero-dependency, used by:
 *   • marketing/email/subscribe-worker/  (the Cloudflare Worker embeds its own copy,
 *     but keeps the same request shape as upsertContact below)
 *   • scripts/send-campaign.js       (EMAIL_PROVIDER=brevo → bulk campaign send)
 *   • scripts/announce-course.js     (per-launch new-course announcement)
 *   • scripts/brevo-setup.js         (verify key, ensure the newsletter list, check sender)
 *
 * Brevo-native design: the CONTACT LIST lives in Brevo, and marketing is sent as a
 * Brevo *email campaign*, so unsubscribe handling, the physical-address footer, and
 * suppression are all managed by Brevo (CAN-SPAM / GDPR compliant) instead of a
 * self-hosted server. Auth is a single `api-key` header.
 *
 * Docs: https://developer.brevo.com/reference
 */
'use strict';

const BASE = 'https://api.brevo.com/v3';

// Node 18+ has global fetch; fall back to node-fetch (already a dep for the resend path).
function getFetch() {
  if (typeof fetch === 'function') return fetch;
  return require('node-fetch');
}

function apiKey(explicit) {
  const k = explicit || process.env.BREVO_API_KEY || '';
  if (!k) throw new Error('BREVO_API_KEY is missing — add it to .env (Brevo → SMTP & API → API Keys, starts with "xkeysib-").');
  return k;
}

async function req(method, endpoint, { key, body } = {}) {
  const f = getFetch();
  const r = await f(`${BASE}${endpoint}`, {
    method,
    headers: {
      'api-key': apiKey(key),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = (data && (data.message || data.code)) || text || `HTTP ${r.status}`;
    const err = new Error(`Brevo ${method} ${endpoint} → ${r.status}: ${msg}`);
    err.status = r.status; err.data = data;
    throw err;
  }
  return data;
}

/** Account sanity check (also validates the key). */
const getAccount = (key) => req('GET', '/account', { key });

/** All senders (to confirm EMAIL_FROM is verified before a campaign). */
const getSenders = (key) => req('GET', '/senders', { key });

/** All contact lists. */
const getLists = (key) => req('GET', '/contacts/lists?limit=50&offset=0', { key });

/** Create a contact list; returns { id }. */
const createList = (name, { key, folderId = 1 } = {}) =>
  req('POST', '/contacts/lists', { key, body: { name, folderId } });

/**
 * Ensure a list named `name` exists; returns its numeric id. Idempotent.
 */
async function ensureList(name, opts = {}) {
  const lists = await getLists(opts.key);
  const found = (lists && lists.lists || []).find((l) => l.name === name);
  if (found) return found.id;
  const created = await createList(name, opts);
  return created.id;
}

/**
 * Add or update a contact (single opt-in). Idempotent on email.
 * attributes: e.g. { FIRSTNAME: 'Aseem', SOURCE: 'website' }
 */
function upsertContact({ email, attributes = {}, listIds = [], key } = {}) {
  if (!email) throw new Error('upsertContact: email required');
  return req('POST', '/contacts', {
    key,
    body: { email: String(email).trim().toLowerCase(), attributes, listIds, updateEnabled: true },
  });
}

/** Count contacts in a list (for dry-run reporting). */
async function listContactCount(listId, key) {
  const l = await req('GET', `/contacts/lists/${listId}`, { key });
  return (l && l.totalSubscribers) || 0;
}

/**
 * Create an email campaign targeting a list. Brevo auto-manages the unsubscribe
 * link ({{ unsubscribe }}) and the mandatory address footer from account settings.
 * Returns { id }.
 */
function createCampaign({ name, subject, htmlContent, listIds, sender, previewText, key } = {}) {
  const body = {
    name,
    subject,
    sender,                    // { name, email } — email must be a verified Brevo sender
    htmlContent,
    recipients: { listIds },
    inlineImageActivation: false,
  };
  if (previewText) body.previewText = previewText;
  return req('POST', '/emailCampaigns', { key, body });
}

/** Send a created campaign immediately. */
const sendCampaignNow = (id, key) => req('POST', `/emailCampaigns/${id}/sendNow`, { key });

/**
 * List email campaigns. `status` optionally filters: draft|sent|archive|queued|
 * suspended|in_process|scheduled. Returns { campaigns: [...], count }.
 */
const listCampaigns = ({ status, key, limit = 100, offset = 0 } = {}) =>
  req('GET', `/emailCampaigns?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`, { key });

/**
 * Delete a campaign. Brevo only allows deleting NON-sent campaigns (draft,
 * scheduled, queued, suspended, archive). Attempting to delete a sent campaign
 * returns a 400 — callers should filter to deletable statuses first.
 */
const deleteCampaign = (id, key) => req('DELETE', `/emailCampaigns/${id}`, { key });

/**
 * Convenience: create + send in one call. Returns { id }.
 */
async function createAndSendCampaign(opts) {
  const { id } = await createCampaign(opts);
  await sendCampaignNow(id, opts.key);
  return { id };
}

module.exports = {
  BASE, apiKey, req,
  getAccount, getSenders, getLists, createList, ensureList,
  upsertContact, listContactCount,
  createCampaign, sendCampaignNow, createAndSendCampaign,
  listCampaigns, deleteCampaign,
};
