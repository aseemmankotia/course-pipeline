#!/usr/bin/env node
/**
 * Tiny self-hosted subscribe/unsubscribe service for TechNuggets Academy.
 * Zero dependencies (Node built-in http). Run it anywhere that persists the JSON
 * DB — the Mac, a small VPS, or a container. The static GitHub Pages site posts
 * its subscribe form here, and campaign unsubscribe links point here too.
 *
 *   node marketing/email/server.js            # listens on PORT (default 8787)
 *
 * Endpoints:
 *   POST /subscribe      {email, name?, whatsapp?}        -> {ok:true}     (consent: website_form)
 *   GET  /unsubscribe?token=…                             -> HTML confirmation (user click)
 *   POST /unsubscribe?token=…                             -> 200           (RFC 8058 one-click from mail clients)
 *   GET  /health
 *
 * Env: PORT, ALLOWED_ORIGIN (CORS; default '*'), BRAND_URL (link on the confirmation page).
 * Put it behind HTTPS (a reverse proxy / tunnel) before going live.
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const store = require('./store.js');

const PORT = parseInt(process.env.PORT || '8787', 10);
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const BRAND_URL = process.env.BRAND_URL || 'https://aseemmankotia.github.io';

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};
const json = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const page = (res, code, title, body) => {
  res.writeHead(code, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${title}</title>
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:12vh auto;padding:0 20px;text-align:center;color:#0f172a">
    <h1 style="font-size:22px">${title}</h1><p style="color:#475569;font-size:16px">${body}</p>
    <p><a href="${BRAND_URL}" style="color:#0284c7">Back to TechNuggets Academy →</a></p></div>`);
};

function readBody(req) {
  return new Promise((resolve) => {
    let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => {
      if (!d) return resolve({});
      try { return resolve(JSON.parse(d)); } catch {
        const p = {}; new URLSearchParams(d).forEach((v, k) => (p[k] = v)); resolve(p);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  if (u.pathname === '/health') return json(res, 200, { ok: true });

  // POST /subscribe
  if (u.pathname === '/subscribe' && req.method === 'POST') {
    const b = await readBody(req);
    if (!store.validEmail(b.email)) return json(res, 400, { ok: false, error: 'invalid email' });
    const db = store.loadDB();
    const { created } = store.addSubscriber(db, {
      email: b.email, name: b.name || '', whatsapp: b.whatsapp || '',
      source: 'website_form', consentMethod: 'website_form',
      ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(),
    });
    store.saveDB(db);
    return json(res, 200, { ok: true, created });
  }

  // GET/POST /unsubscribe?token=… (POST = RFC 8058 one-click)
  if (u.pathname === '/unsubscribe') {
    const token = u.searchParams.get('token');
    const db = store.loadDB();
    const sub = store.unsubscribe(db, { token });
    if (sub) store.saveDB(db);
    if (req.method === 'POST') { cors(res); res.writeHead(sub ? 200 : 404); return res.end(); }
    return sub
      ? page(res, 200, 'You’re unsubscribed', `${sub.email} won’t receive any more marketing emails from us. Sorry to see you go.`)
      : page(res, 404, 'Link not recognized', 'That unsubscribe link is invalid or already used. If you keep getting emails, reply to one and we’ll remove you.');
  }

  json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, () => console.log(`Subscribe/unsubscribe service on :${PORT} (CORS origin ${ORIGIN})`));
