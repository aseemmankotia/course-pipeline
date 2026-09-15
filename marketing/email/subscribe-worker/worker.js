/**
 * TechNuggets Academy — subscribe proxy (Cloudflare Worker)
 *
 * The website is static (GitHub Pages), so the subscribe form can't hold the Brevo
 * API key. This tiny Worker is the ONLY thing that does: the form POSTs {email,name}
 * here, and the Worker calls Brevo's Contacts API with the key kept as a Worker
 * secret. Single opt-in: the contact is added straight to the newsletter list.
 *
 * Deploy: see README.md in this folder (wrangler). Bind:
 *   secret  BREVO_API_KEY     (wrangler secret put BREVO_API_KEY)
 *   var     BREVO_LIST_ID     (numeric Brevo list id — from `node scripts/brevo-setup.js`)
 *   var     ALLOWED_ORIGINS   (comma-separated, e.g. "https://technuggets.academy,https://www.technuggets.academy")
 *
 * Routes: POST /subscribe   → { ok: true }        (adds/updates the contact)
 *         GET  /health      → { ok: true, configured: <bool> }
 * CORS is locked to ALLOWED_ORIGINS. A hidden honeypot field ("company") silently
 * drops bots. No PII is logged.
 *
 * OBSERVABILITY (added 2026-09-14): on any Brevo failure the Worker now logs the
 * real upstream status + Brevo error code to the console (see `wrangler tail`) and
 * echoes a NON-sensitive { brevo_status, brevo_code } back to the caller, so a
 * broken key / list / plan is diagnosable instead of a silent "brevo_error".
 */

const BREVO = 'https://api.brevo.com/v3/contacts';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://technuggets.academy')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const allow = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...(extra || {}) },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, configured: Boolean(env.BREVO_API_KEY && env.BREVO_LIST_ID) }, 200, cors);
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400, cors); }

    // Honeypot: real users never fill "company". Pretend success, add nothing.
    if (data && typeof data.company === 'string' && data.company.trim() !== '') {
      return json({ ok: true }, 200, cors);
    }

    const email = String((data && data.email) || '').trim().toLowerCase();
    const name = String((data && data.name) || '').trim().slice(0, 80);
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid_email' }, 400, cors);

    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
      console.warn('subscribe: not_configured', {
        hasKey: Boolean(env.BREVO_API_KEY), hasList: Boolean(env.BREVO_LIST_ID),
      });
      return json({ ok: false, error: 'not_configured' }, 500, cors);
    }

    const attributes = { SOURCE: 'website' };
    if (name) attributes.FIRSTNAME = name.split(' ')[0];

    let r;
    try {
      r = await fetch(BREVO, {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          attributes,
          listIds: [Number(env.BREVO_LIST_ID)],
          updateEnabled: true, // idempotent: re-subscribe just updates
        }),
      });
    } catch (e) {
      console.warn('subscribe: upstream_unreachable', String(e && e.message || e));
      return json({ ok: false, error: 'upstream_unreachable' }, 502, cors);
    }

    // 201 = created, 204 = updated (updateEnabled). Both are success.
    if (r.status === 201 || r.status === 204 || r.ok) return json({ ok: true }, 200, cors);

    // Read Brevo's error payload ONCE for both duplicate-handling and diagnostics.
    let code = '', message = '';
    try {
      const body = await r.json();
      code = (body && body.code) || '';
      message = (body && body.message) || '';
    } catch { /* non-JSON body */ }

    // Brevo returns "duplicate_parameter" only when updateEnabled is false — we set it
    // true, but treat a duplicate as success just in case.
    if (code === 'duplicate_parameter') return json({ ok: true }, 200, cors);

    // Anything else is a real failure. Log the true cause for `wrangler tail`, and
    // echo a NON-sensitive summary so it is diagnosable from the client too.
    // (message may name the reason, e.g. "Key not found" / "plan limit"; it never
    // contains the API key.)
    console.warn('subscribe: brevo_error', { status: r.status, code, message: String(message).slice(0, 200) });
    return json({ ok: false, error: 'brevo_error', brevo_status: r.status, brevo_code: code }, 502, cors);
  },
};
