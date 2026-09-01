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

// Resolve the Python interpreter for this project: prefer $PIPELINE_PYTHON, then
// the project venv (.venv), else bare 'python3'. Keeps narration/cards on the
// pinned interpreter even from cron / scheduled tasks / parallel workers that
// never activated the venv (a bare 'python3' can pick up an unrelated conda base).
const PYTHON = (() => {
  if (process.env.PIPELINE_PYTHON) return process.env.PIPELINE_PYTHON;
  const venv = process.platform === 'win32'
    ? path.join(ROOT, '.venv', 'Scripts', 'python.exe')
    : path.join(ROOT, '.venv', 'bin', 'python3');
  try { if (fs.existsSync(venv)) return venv; } catch (e) {}
  return 'python3';
})();
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
// Stall/timeout guards for the free edge-tts endpoint (overridable via .env):
//   EDGE_STALL_S — abort a chapter if no audio arrives for this long (a throttle
//                  stall). EDGE_CAP_S — hard per-chapter cap. Either raises a
//                  retryable error so the retry/backoff loop re-attempts.
const EDGE_STALL_S = parseInt(ENV.EDGE_STALL_S || '45', 10);
const EDGE_CAP_S = parseInt(ENV.EDGE_CAP_S || '300', 10);
const EDGE_CHUNK_CHARS = parseInt(ENV.EDGE_CHUNK_CHARS || '2400', 10); // max chars per edge-tts request (chunking makes long chapters reliable)

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
function ttsEdge(textFile, outMp3, outJson) {
  // Synthesize with edge-tts, CHUNKED at sentence boundaries, with PER-CHUNK retry
  // + checkpointing: each chunk is its own request; a chunk that stalls is retried
  // on its own without discarding the chunks already done, and only if a chunk
  // can't complete after CHUNK_TRIES does the chapter fail (→ the caller's retry).
  // The MP3 frames are concatenated and WordBoundary events merged into ONE timing
  // stream (each chunk's offsets shifted by the running audio length) so the
  // audio-aligned slide sidecar stays correct. Chunk size via EDGE_CHUNK_CHARS.
  const py = `
import asyncio, sys, json, re, edge_tts
STALL = ${EDGE_STALL_S}
MAXLEN = ${EDGE_CHUNK_CHARS}
CHUNK_TIMEOUT = min(${EDGE_CAP_S}, 90)   # hard cap on ONE chunk's synthesis
CHUNK_TRIES = 3                          # per-chunk retries before the chapter fails
def norm(s):
    return re.sub(r'\\s+', ' ', s).strip()
def split_text(text):
    sents = re.split(r'(?<=[.!?])\\s+', text.strip())
    chunks = []
    buf = ''
    for s in sents:
        s = norm(s)
        if not s:
            continue
        while len(s) > MAXLEN:
            cut = s.rfind(' ', 0, MAXLEN)
            if cut <= 0:
                cut = MAXLEN
            piece = s[:cut].strip()
            if buf:
                chunks.append(buf); buf = ''
            if piece:
                chunks.append(piece)
            s = s[cut:].strip()
        if not s:
            continue
        if buf and len(buf) + 1 + len(s) > MAXLEN:
            chunks.append(buf); buf = s
        else:
            buf = (buf + ' ' + s) if buf else s
    if buf:
        chunks.append(buf)
    return chunks or ['']
async def synth_chunk(text, audio, cwords):
    try:
        tts = edge_tts.Communicate(text, voice='${VOICE}', rate='+4%', boundary='WordBoundary', connect_timeout=15, receive_timeout=STALL)
    except TypeError:
        tts = edge_tts.Communicate(text, voice='${VOICE}', rate='+4%')
    last_end = 0
    async for chunk in tts.stream():
        t = chunk.get('type')
        if t == 'audio':
            audio.extend(chunk['data'])
        elif t in ('WordBoundary', 'SentenceBoundary'):
            off = chunk.get('offset', 0); dur = chunk.get('duration', 0)
            cwords.append({'text': chunk.get('text', ''), 'offset': off, 'duration': dur})
            if off + dur > last_end:
                last_end = off + dur
    return last_end
async def synth():
    text = open(sys.argv[1], encoding='utf-8').read()
    out_mp3 = sys.argv[2]
    out_json = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    chunks = split_text(text)
    words = []; base = 0
    with open(out_mp3, 'wb') as f:
        for i, c in enumerate(chunks):
            for attempt in range(1, CHUNK_TRIES + 1):
                audio = bytearray(); cwords = []
                try:
                    end = await asyncio.wait_for(synth_chunk(c, audio, cwords), timeout=CHUNK_TIMEOUT)
                    if not audio:
                        raise RuntimeError('no audio returned')
                    f.write(audio)
                    for w in cwords:
                        w['offset'] += base; words.append(w)
                    base += end + 1000000   # +0.1s gap (100ns ticks) between chunks
                    sys.stderr.write('    chunk %d/%d ok — %d words so far\\n' % (i + 1, len(chunks), len(words)))
                    break
                except Exception as e:
                    if attempt >= CHUNK_TRIES:
                        raise RuntimeError('chunk %d/%d failed after %d tries: %s' % (i + 1, len(chunks), CHUNK_TRIES, type(e).__name__))
                    sys.stderr.write('    chunk %d/%d stalled (try %d/%d) — retrying\\n' % (i + 1, len(chunks), attempt, CHUNK_TRIES))
                    await asyncio.sleep(3 * attempt)
    if out_json:
        json.dump(words, open(out_json, 'w', encoding='utf-8'))
    sys.stderr.write('    word-timings captured: %d\\n' % len(words))
asyncio.run(synth())
`;
  const r = spawnSync(PYTHON, ['-c', py, textFile, outMp3, outJson || ''],
    { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf8', timeout: Math.max(EDGE_CAP_S + 30, 900) * 1000, killSignal: 'SIGKILL' });
  if (r.error && r.error.code === 'ETIMEDOUT') throw new Error(`edge-tts process wedged — killed`);
  if (r.signal) throw new Error(`edge-tts killed (${r.signal}) — likely a stall/timeout`);
  if (r.status !== 0) {
    if ((r.stderr || '').includes('No module named')) {
      throw new Error("edge-tts not installed. Run:  pip install edge-tts");
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
    // Per-word timing sidecar that drives audio-aligned slide timing in the
    // renderer. Only the edge engine produces it (ElevenLabs gives no word
    // boundaries), so only edge requires it before a chapter counts as "done".
    const wordsJson = path.join(ROOT, `heygen-chapter-${nn}.words.json`);
    const owned = ensureOwned(outMp4, args.slug) === 'ours';
    const sidecarOK = ENGINE !== 'edge' || (fs.existsSync(wordsJson) && fs.statSync(wordsJson).size > 2);
    if (owned && sidecarOK) { console.log(`↷ ch${n}: heygen-chapter-${nn}.mp4 (ours), skipping`); continue; }
    if (owned && !sidecarOK) console.log(`↻ ch${n}: audio exists but no word-timings sidecar — regenerating for audio-aligned slides`);

    const textFile = path.join(HEYGEN_DIR, f);
    const words = fs.readFileSync(textFile, 'utf8').split(/\s+/).length;
    console.log(`▶ ch${n}: ${words} words → speech…`);
    const mp3 = path.join(TEMP, `ch-${nn}.mp3`);

    // Retry with backoff. Microsoft's free edge-tts endpoint THROTTLES sustained
    // use (a full remediation pass is 100+ chapters back-to-back), returning
    // connection errors that used to abort the whole course. Retrying with a
    // pause lets the throttle window reset. The empty-sidecar guard also forces a
    // retry if edge-tts streamed audio but zero word boundaries.
    const MAX_TRIES = 4;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        if (ENGINE === 'elevenlabs') await ttsElevenLabs(textFile, mp3);
        else ttsEdge(textFile, mp3, wordsJson);
        if (ENGINE === 'edge' && (!fs.existsSync(wordsJson) || fs.statSync(wordsJson).size <= 2)) {
          throw new Error('edge-tts produced an empty word-timings sidecar (no WordBoundary events)');
        }
        lastErr = null; break;
      } catch (e) {
        lastErr = e;
        if (attempt < MAX_TRIES) {
          const backoff = [0, 8, 25, 60][attempt] || 60;
          console.log(`   ⚠ ch${n} attempt ${attempt}/${MAX_TRIES} failed: ${String(e.message).split('\n')[0].slice(0, 140)}`);
          console.log(`     retrying in ${backoff}s (likely edge-tts throttling)…`);
          await sleep(backoff * 1000);
        }
      }
    }
    if (lastErr) throw new Error(`ch${n}: TTS failed after ${MAX_TRIES} attempts — ${lastErr.message}`);

    wrapAudio(mp3, outMp4);
    await sleep(500); // small courtesy gap between chapters to ease throttling
    manifest[path.basename(outMp4)] = { slug: args.slug, size: fs.statSync(outMp4).size, created: new Date().toISOString() };
    saveManifest();
    const mins = (fs.statSync(outMp4).size / 1e6).toFixed(1);
    console.log(`   ✅ heygen-chapter-${nn}.mp4 (${mins} MB)`);
  }
  console.log('\nDone. Render with pip_mode "none" (set automatically for TTS courses) → npm run render:all');
})();
