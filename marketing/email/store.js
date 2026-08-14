/**
 * Subscriber datastore for the TechNuggets Academy marketing pipeline.
 *
 * Consent-first by design: every subscriber carries an explicit consent record
 * (method + timestamp + source) and a unique unsubscribe token. Nothing is ever
 * sent to a subscriber whose status is not "active". This is a plain-JSON store
 * so it lives in the repo and is trivially inspectable/portable; swap loadDB/saveDB
 * for a hosted KV/DB adapter if you outgrow a single file.
 *
 * CAN-SPAM / GDPR notes are enforced downstream (send-campaign.js only mails
 * active subscribers, injects the per-token unsubscribe link + physical address).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.SUBSCRIBERS_DB || path.join(__dirname, 'subscribers.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { updated: null, subscribers: [] };
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { throw new Error(`Corrupt subscribers DB at ${DB_PATH}: ${e.message}`); }
}

function saveDB(db) {
  db.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n');
  return db;
}

const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(e));
const newToken = () => crypto.randomBytes(24).toString('hex');

/**
 * Add or update a subscriber. Idempotent on email.
 * consentMethod: 'website_form' | 'owned_list_import' | 'manual' | 'double_optin'
 * Returns { subscriber, created }.
 */
function addSubscriber(db, { email, name = '', source = 'unknown', whatsapp = '', consentMethod = 'manual', ip = '', channels } = {}) {
  const em = normEmail(email);
  if (!validEmail(em)) throw new Error(`Invalid email: ${email}`);
  let sub = db.subscribers.find((s) => s.email === em);
  const now = new Date().toISOString();
  const created = !sub;
  if (!sub) {
    sub = {
      email: em,
      name,
      source,
      channels: channels || { email: true, whatsapp: !!whatsapp },
      whatsapp_number: whatsapp || '',
      consent: { given: true, method: consentMethod, timestamp: now, source, ip },
      status: 'active',
      token: newToken(),
      subscribed_at: now,
      unsubscribed_at: null,
    };
    db.subscribers.push(sub);
  } else {
    // Re-subscribe / update. Re-consent refreshes the record.
    if (name) sub.name = name;
    if (whatsapp) { sub.whatsapp_number = whatsapp; sub.channels.whatsapp = true; }
    if (channels) sub.channels = { ...sub.channels, ...channels };
    if (sub.status !== 'active') { sub.status = 'active'; sub.unsubscribed_at = null; sub.subscribed_at = now; }
    sub.consent = { given: true, method: consentMethod, timestamp: now, source: source || sub.source, ip };
    if (!sub.token) sub.token = newToken();
  }
  return { subscriber: sub, created };
}

function findByToken(db, token) { return db.subscribers.find((s) => s.token === token); }
function findByEmail(db, email) { return db.subscribers.find((s) => s.email === normEmail(email)); }

/** Unsubscribe by token or email. Returns the subscriber or null. Keeps the record (suppression list). */
function unsubscribe(db, { token, email } = {}) {
  const sub = token ? findByToken(db, token) : findByEmail(db, email);
  if (!sub) return null;
  sub.status = 'unsubscribed';
  sub.unsubscribed_at = new Date().toISOString();
  return sub;
}

const activeEmail = (db) => db.subscribers.filter((s) => s.status === 'active' && s.channels && s.channels.email);
const activeWhatsapp = (db) => db.subscribers.filter((s) => s.status === 'active' && s.channels && s.channels.whatsapp && s.whatsapp_number);

function stats(db) {
  const s = db.subscribers;
  return {
    total: s.length,
    active: s.filter((x) => x.status === 'active').length,
    unsubscribed: s.filter((x) => x.status === 'unsubscribed').length,
    email_active: activeEmail(db).length,
    whatsapp_active: activeWhatsapp(db).length,
    bySource: s.reduce((m, x) => ((m[x.source] = (m[x.source] || 0) + 1), m), {}),
  };
}

module.exports = {
  DB_PATH, loadDB, saveDB, addSubscriber, unsubscribe,
  findByToken, findByEmail, activeEmail, activeWhatsapp, stats,
  normEmail, validEmail, newToken,
};
