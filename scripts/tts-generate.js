#!/usr/bin/env node
/**
 * tts-generate.js — FREE narration videos: TTS voice + slides, no HeyGen.
 *
 * Converts each chapter's narration text into an audio track and wraps it as
 * heygen-chapter-NN.mp4 (dark still + voice). The renderer picks these up
 * exactly like HeyGen files; with pip_mode "none" it uses ONLY the audio and
 * fills the screen with the animated slides — so the result is a slide video
 * narrated end to end.
 *
 * Engines:
 *   edge        (default) Microsoft Edge neural voices — free, natural.
 *               Requires once: pip3 install edge-tts
 *               Voice via TTS_VOICE in .env (default en-US-AndrewMultilingualNeural)
 *   elevenlabs  Your cloned voice via ElevenLabs API (~1/10 the cost of HeyGen).
 *               Requires ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID in .env
 *
 * Usage:
 *   node scripts/tts-generate.js --slug=<slug>                 # all chapters, edge
 *   node scripts/tts-generate.js --slug=<slug> --chapter=3
 *   node scripts/tts-generate.js --slug=<slug> --engine=elevenlabs
 *
 * Skips chapters whose heygen-chapter-NN.mp4 already exists in the root.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
if (!args.slug && !args['text-file']) {
  console.error('Usage: node scripts/tts-generate.js --slug=<slug> [--chapter=N] [--engine=edge|elevenlabs]');
  console.error('       node scripts/tts-generate.js --text-file=<txt> --out=<mp4>   (one-off, e.g. promo)');
  process.exit(1);
}

const ENGINE = args.engine || ENV.TTS_ENGINE || 'edge';
const VOICE = ENV.TTS_VOICE || 'en-US-AndrewMultilingualNeural';

const HEYGEN_DIR = args.slug ? path.join(ROOT, 'generated', args.slug, 'heygen') : null;
if (HEYGEN_DIR && !fs.existsSync(HEYGEN_DIR)) { console.error(`❌ ${HEYGEN_DIR} not found — generate the course first.`); process.exit(1); }

const TEMP = path.join(ROOT, 'render', 'tts-temp');
fs.mkdirSync(TEMP, { recursive: true });

// Ownership manifest: records which narration files THIS tool created and for
// which course. Any heygen-chapter-NN.mp4 in the root that we don't own (e.g.
// legacy HeyGen avatar videos from an earlier course) is quarantined to
// legacy-media/ instead of being silently reused as the wrong voice track.
const MANIFEST = path.join(TEMP, 'manifest.json');
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
function saveManifest() { fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); }
function ensureOwned(outMp4, slug) {
  const name = path.basename(outMp4);
  if (!fs.existsSync(outMp4)) return 'absent';
  const rec = manifest[name];
  if (rec && rec.slug === slug && fs.statSync(outMp4).size === rec.size) return 'ours';
  // not ours (legacy HeyGen video or another course's narration) → quarantine
  const legacyDir = path.join(ROOT, 'legacy-media');
  fs.mkdirSync(legacyDir, { recursive: true });
  let dest = path.join(legacyDir, name);
  let i = 1;
  while (fs.existsSync(dest)) dest = path.join(legacyDir, `${path.parse(name).name}-${i++}${path.parse(name).ext}`);
  fs.renameSync(outMp4, dest);
  console.log(`   ⚠️ quarantined stale ${name} → legacy-media/ (belonged to a different course)`);
  return 'quarantined';
}

function findBinary(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  if (r.status === 0) return r.stdout.split(/\r?\n/)[0].trim();
  for (const p of [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`]) if (fs.existsSync(p)) return p;
  throw new Error(`${name} not found on PATH`);
}
const ffmpeg = findBinary('ffmpeg');

// ---------- engines ----------
function ttsEdge(textFile, outMp3) {
  // Use the edge-tts python module (pip3 install edge-tts)
  const py = `
import asyncio, sys, edge_tts
async def main():
    text = open(sys.argv[1], encoding='utf-8').read()
    tts = edge_tts.Communicate(text, voice='${VOICE}', rate='+4%')
    await tts.save(sys.argv[2])
asyncio.run(main())
`;
  const r = spawnSync('python3', ['-c', py, textFile, outMp3], { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) {
    if ((r.stderr || '').includes('No module named')) {
      throw new Error("edge-tts not installed. Run:  pip3 install edge-tts");
    }
    throw new Error('edge-tts failed: ' + (r.stderr || '').slice(-400));
  }
}

async function ttsElevenLabs(textFile, outMp3) {
  const KEY = ENV.ELEVENLABS_API_KEY, VID = ENV.ELEVENLABS_VOICE_ID;
  if (!KEY || !VID) throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID missing in .env');
  const text = fs.readFileSync(textFile, 'utf8');
  // chunk at sentence boundaries ≤ 4500 chars
  const chunks = [];
  let buf = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if ((buf + ' ' + sentence).length > 4500) { chunks.push(buf); buf = sentence; }
    else buf = buf ? buf + ' ' + sentence : sentence;
  }
  if (buf) chunks.push(buf);

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VID}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text: chunks[i], model_id: 'eleven_multilingual_v2' }),
    });
    if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const part = path.join(TEMP, `el-part-${i}.mp3`);
    fs.writeFileSync(part, Buffer.from(await res.arrayBuffer()));
    parts.push(part);
    console.log(`   chunk ${i + 1}/${chunks.length} done`);
  }
  const concatFile = path.join(TEMP, 'el-concat.txt');
  fs.writeFileSync(concatFile, parts.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const r = spawnSync(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outMp3], { stdio: 'pipe' });
  if (r.status !== 0) throw new Error('ffmpeg concat failed');
}

// ---------- audio → renderer-compatible mp4 ----------
function wrapAudio(mp3, outMp4) {
  const ffprobe = findBinary('ffprobe');
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' });
  const dur = parseFloat(probe.stdout);
  if (!dur || isNaN(dur)) throw new Error('could not probe audio duration');
  const r = spawnSync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'color=c=0x1a1a2e:s=1280x720:r=2',
    '-i', mp3,
    '-t', dur.toFixed(3),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    outMp4,
  ], { stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg wrap failed: ' + (r.stderr || '').slice(-300));
}

(async () => {
  // one-off mode: --text-file=<txt> --out=<mp4>
  if (args['text-file']) {
    const textFile = path.resolve(ROOT, args['text-file']);
    const outMp4 = path.resolve(ROOT, args.out || 'narration.mp4');
    const mp3 = path.join(TEMP, 'oneoff.mp3');
    console.log(`🎙  TTS one-off (${ENGINE}): ${path.basename(textFile)} → ${path.basename(outMp4)}`);
    if (ENGINE === 'elevenlabs') await ttsElevenLabs(textFile, mp3);
    else ttsEdge(textFile, mp3);
    wrapAudio(mp3, outMp4);
    console.log('✅ done');
    return;
  }

  const narrations = fs.readdirSync(HEYGEN_DIR)
    .filter(f => /^chapter-\d+-narration\.txt$/.test(f))
    .sort();
  const wanted = args.chapter
    ? narrations.filter(f => parseInt(f.match(/\d+/)[0]) === parseInt(args.chapter))
    : narrations;

  console.log(`🎙  TTS narration — engine: ${ENGINE}${ENGINE === 'edge' ? ` (voice: ${VOICE})` : ''} — ${wanted.length} chapter(s)\n`);

  for (const f of wanted) {
    const n = parseInt(f.match(/\d+/)[0]);
    const nn = String(n).padStart(2, '0');
    const outMp4 = path.join(ROOT, `heygen-chapter-${nn}.mp4`);
    if (ensureOwned(outMp4, args.slug) === 'ours') { console.log(`↷ ch${n}: heygen-chapter-${nn}.mp4 (ours), skipping`); continue; }

    const textFile = path.join(HEYGEN_DIR, f);
    const words = fs.readFileSync(textFile, 'utf8').split(/\s+/).length;
    console.log(`▶ ch${n}: ${words} words → speech…`);
    const mp3 = path.join(TEMP, `ch-${nn}.mp3`);

    if (ENGINE === 'elevenlabs') await ttsElevenLabs(textFile, mp3);
    else ttsEdge(textFile, mp3);

    wrapAudio(mp3, outMp4);
    manifest[path.basename(outMp4)] = { slug: args.slug, size: fs.statSync(outMp4).size, created: new Date().toISOString() };
    saveManifest();
    const mins = (fs.statSync(outMp4).size / 1e6).toFixed(1);
    console.log(`   ✅ heygen-chapter-${nn}.mp4 (${mins} MB)`);
  }
  console.log('\nDone. Render with pip_mode "none" (set automatically for TTS courses) → npm run render:all');
})();
