// scripts/udemy/client.js
// Authenticated Udemy instructor-API client for the automated publish pipeline.
//
// AUTH MODEL (see docs/udemy-auth.md):
//   The Udemy instructor API is cookie-authenticated + CSRF-protected. A Node
//   process can reuse a logged-in instructor session by sending the browser's
//   cookie string + the csrftoken header. No password is stored; 2FA stays on.
//
//   .env keys:
//     UDEMY_COOKIE   = the full Cookie header copied from a logged-in instructor
//                      tab (DevTools -> Network -> any api-2.0 request -> Request
//                      Headers -> cookie). MUST include access_token, client_id,
//                      csrftoken, dj_session_id / ud_* etc.
//     UDEMY_CSRF     = (optional) csrftoken value; auto-extracted from the cookie
//                      when omitted.
//     UDEMY_BASE     = optional, defaults to https://www.udemy.com
//
// The token expires after a few weeks -> `npm run udemy:auth:check` tells you when
// to re-capture. Everything else is pure API.

'use strict';
const fs = require('fs');
const path = require('path');

function loadEnv() {
  // Minimal .env loader (no dependency); real process.env still wins.
  // Checks, in order: current working dir, the project root (this file's parent's
  // parent = udemy-autopublish/), and one level above that.
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  const out = {};
  out.__envSearched = candidates;
  for (const envPath of candidates) {
    let text;
    try { text = fs.readFileSync(envPath, 'utf8'); } catch (_) { continue; }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in out)) out[m[1]] = v; // first file found wins
    }
    out.__envLoaded = envPath;
    break;
  }
  return out;
}

class UdemyClient {
  constructor(opts = {}) {
    const env = { ...loadEnv(), ...process.env };
    this.base = (opts.base || env.UDEMY_BASE || 'https://www.udemy.com').replace(/\/$/, '');
    this.cookie = opts.cookie || env.UDEMY_COOKIE || '';
    this.csrf = opts.csrf || env.UDEMY_CSRF ||
      ((this.cookie.match(/csrftoken=([^;]+)/) || [])[1]) || '';
    this.dryRun = !!opts.dryRun;
    if (!this.cookie) {
      const where = env.__envLoaded ? `loaded .env from: ${env.__envLoaded}` :
        `no .env found. Looked in:\n  - ${(env.__envSearched || []).join('\n  - ')}`;
      throw new Error(
        'UDEMY_COOKIE is not set.\n' + where + '\n' +
        'Create a .env in this folder with:\n  UDEMY_COOKIE="access_token=…; client_id=…; csrftoken=…"\n' +
        '(see docs/udemy-auth.md). Make sure the value is wrapped in double quotes on ONE line.'
      );
    }
    if (!this.csrf) throw new Error('Could not determine CSRF token; set UDEMY_CSRF or include csrftoken in UDEMY_COOKIE.');
  }

  headers(extra = {}) {
    return {
      'Cookie': this.cookie,
      'X-Csrftoken': this.csrf,
      'Referer': this.base + '/',
      'Origin': this.base,
      'Accept': 'application/json, text/plain, */*',
      ...extra,
    };
  }

  async request(method, url, { body, raw, query, mutating } = {}) {
    const full = url.startsWith('http') ? url : this.base + url;
    const u = new URL(full);
    if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    const isWrite = method !== 'GET';
    if (this.dryRun && isWrite && mutating !== false) {
      return { __dryRun: true, method, url: u.pathname + u.search, body };
    }
    const headers = this.headers(body && !raw ? { 'Content-Type': 'application/json' } : {});
    const res = await fetch(u.toString(), {
      method,
      headers: raw ? this.headers(raw.headers || {}) : headers,
      body: raw ? raw.body : (body != null ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    if (res.status === 403 || res.status === 401) {
      throw new Error(`AUTH FAILED (${res.status}) on ${method} ${u.pathname} — your UDEMY_COOKIE has likely expired; re-capture it (docs/udemy-auth.md). Body: ${text.slice(0, 160)}`);
    }
    if (!res.ok) {
      const err = new Error(`Udemy ${method} ${u.pathname} -> ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status; err.json = json;
      throw err;
    }
    return json ?? {};
  }

  get(url, opts) { return this.request('GET', url, opts); }
  post(url, body, opts) { return this.request('POST', url, { ...opts, body }); }
  patch(url, body, opts) { return this.request('PATCH', url, { ...opts, body }); }
  del(url, opts) { return this.request('DELETE', url, opts); }

  // Verify the session is alive; returns the instructor's display name.
  async whoami() {
    const me = await this.get('/api-2.0/users/me/', { query: { 'fields[user]': 'display_name,email' } });
    return me;
  }
}

module.exports = { UdemyClient };
