#!/usr/bin/env node
/**
 * heygen-generate.js — Generate HeyGen avatar videos for a course's chapters
 * without touching the HeyGen web UI.
 *
 * Uses your own HeyGen avatar + voice (Aseem's likeness/voice as configured in
 * your HeyGen account). Requires in .env:
 *   HEYGEN_API_KEY=...        (app.heygen.com → Settings → API)
 *   HEYGEN_AVATAR_ID=...      (your instant/studio avatar id)
 *   HEYGEN_VOICE_ID=...       (your cloned voice id)
 *
 * Usage:
 *   node scripts/heygen-generate.js --slug=<generated course slug>            # all chapters
 *   node scripts/heygen-generate.js --slug=<slug> --chapter=3                 # one chapter
 *   node scripts/heygen-generate.js --slug=<slug> --dry-run                   # cost/length preview
 *
 * Downloads finished videos to the project root as heygen-chapter-NN.mp4 —
 * exactly where the renderer expects them. Safe to re-run: chapters whose
 * output file already exists are skipped.
 *
 * NOTE: HeyGen renders take several minutes per video and consume plan
 * credits. The script polls until each video completes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const ENV = { ...loadEnv(), ...process.env };

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

const API_KEY = ENV.HEYGEN_API_KEY;
const AVATAR_ID = ENV.HEYGEN_AVATAR_ID;
const VOICE_ID = ENV.HEYGEN_VOICE_ID;

if (!args.slug) { console.error('Usage: node scripts/heygen-generate.js --slug=<slug> [--chapter=N] [--dry-run]'); process.exit(1); }

const HEYGEN_DIR = path.join(ROOT, 'generated', args.slug, 'heygen');
if (!fs.existsSync(HEYGEN_DIR)) { console.error(`❌ ${HEYGEN_DIR} not found — generate the course first.`); process.exit(1); }

const narrations = fs.readdirSync(HEYGEN_DIR)
  .filter(f => /^chapter-\d+-narration\.txt$/.test(f))
  .sort();

const wanted = args.chapter ? narrations.filter(f => parseInt(f.match(/\d+/)[0]) === parseInt(args.chapter)) : narrations;

if (args['dry-run']) {
  let totalWords = 0;
  for (const f of wanted) {
    const words = fs.readFileSync(path.join(HEYGEN_DIR, f), 'utf8').split(/\s+/).length;
    totalWords += words;
    console.log(`  ${f}: ${words} words ≈ ${Math.round(words / 150)} min of avatar video`);
  }
  console.log(`\nTotal: ${totalWords} words ≈ ${Math.round(totalWords / 150)} minutes of HeyGen rendering.`);
  console.log('Check your HeyGen plan credits before running for real.');
  process.exit(0);
}

if (!API_KEY || !AVATAR_ID || !VOICE_ID) {
  console.error('❌ Missing HEYGEN_API_KEY / HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID in .env');
  console.error('   Get them from app.heygen.com → Settings → API, and your avatar/voice pages.');
  process.exit(1);
}

const BASE = 'https://api.heygen.com';

async function api(pathname, opts = {}) {
  const res = await fetch(BASE + pathname, {
    ...opts,
    headers: { 'x-api-key': API_KEY, 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HeyGen ${pathname} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function generateOne(file) {
  const n = parseInt(file.match(/\d+/)[0]);
  const outFile = path.join(ROOT, `heygen-chapter-${String(n).padStart(2, '0')}.mp4`);
  if (fs.existsSync(outFile)) { console.log(`↷ ch${n}: ${path.basename(outFile)} already exists, skipping`); return; }

  const text = fs.readFileSync(path.join(HEYGEN_DIR, file), 'utf8');
  console.log(`▶ ch${n}: submitting ${text.split(/\s+/).length} words to HeyGen…`);

  const create = await api('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify({
      video_inputs: [{
        character: { type: 'avatar', avatar_id: AVATAR_ID, avatar_style: 'normal' },
        voice: { type: 'text', input_text: text, voice_id: VOICE_ID },
      }],
      dimension: { width: 1920, height: 1080 },
      title: `chapter-${String(n).padStart(2, '0')} — ${args.slug}`,
    }),
  });
  const videoId = create.data && create.data.video_id;
  if (!videoId) throw new Error('No video_id in response: ' + JSON.stringify(create).slice(0, 300));

  // poll
  for (;;) {
    await new Promise(r => setTimeout(r, 30000));
    const st = await api(`/v1/video_status.get?video_id=${videoId}`);
    const s = st.data && st.data.status;
    process.stdout.write(`   ch${n}: ${s}        \r`);
    if (s === 'completed') {
      const url = st.data.video_url;
      console.log(`\n   ch${n}: downloading…`);
      const res = await fetch(url);
      fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
      console.log(`   ✅ ${path.basename(outFile)} (${(fs.statSync(outFile).size / 1e6).toFixed(0)} MB)`);
      return;
    }
    if (s === 'failed') throw new Error(`ch${n}: HeyGen render failed: ${JSON.stringify(st.data.error || {})}`);
  }
}

(async () => {
  for (const f of wanted) {
    try { await generateOne(f); }
    catch (e) { console.error(`\n❌ ${f}: ${e.message}\n   Re-run to retry this chapter.`); process.exitCode = 1; }
  }
  console.log('\nDone. Videos are in the project root — ready for npm run render:all');
})();
