#!/usr/bin/env node
/**
 * elevenlabs.js — ElevenLabs TTS helper for course-render.js
 *
 * Generates narration audio from a chapter script.
 * Splits long scripts into chunks, concatenates with FFmpeg.
 */

'use strict';

const fetch = require('node-fetch');
const fs    = require('fs');
const { execSync, spawn } = require('child_process');

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

// ── FFmpeg runner ─────────────────────────────────────────────────────────────

function findBinary(name) {
  for (const bin of [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`, name]) {
    try { execSync(`"${bin}" -version 2>&1`, { stdio: 'ignore' }); return bin; } catch {}
  }
  throw new Error(`"${name}" not found. Install: brew install ffmpeg`);
}

function runFFmpeg(args) {
  const ffmpeg = findBinary('ffmpeg');
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const errLines = [];
    proc.stderr.on('data', d => errLines.push(d.toString()));
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`FFmpeg exited ${code}:\n${errLines.slice(-5).join('')}`));
      } else {
        resolve();
      }
    });
  });
}

// ── Text chunker ──────────────────────────────────────────────────────────────

/**
 * Split long scripts into chunks under maxLen chars.
 * Splits at sentence boundaries to keep natural speech flow.
 */
function splitIntoChunks(text, maxLen = 4500) {
  const cleaned = text
    .replace(/[#*\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLen) return [cleaned];

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Single chunk audio ────────────────────────────────────────────────────────

async function generateChunk(text, voiceId, apiKey, modelId) {
  const response = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId || 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `ElevenLabs error (${response.status}): ` +
      (err.detail?.message || JSON.stringify(err))
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

// ── Full script audio ─────────────────────────────────────────────────────────

/**
 * Generate audio for a full chapter script.
 * Automatically splits long scripts into chunks and concatenates them.
 *
 * @param {string} script      - The cleaned chapter script text
 * @param {string} voiceId     - ElevenLabs voice ID
 * @param {string} apiKey      - ElevenLabs API key
 * @param {string} outputPath  - Where to write the final .mp3
 * @param {string} [modelId]   - ElevenLabs model (default: eleven_monolingual_v1)
 * @returns {Promise<string>}  - resolves to outputPath
 */
async function generateAudio(script, voiceId, apiKey, outputPath, modelId) {
  console.log('🎙️  Generating audio with ElevenLabs…');

  const chunks = splitIntoChunks(script);
  console.log(`   Split into ${chunks.length} chunk(s)`);

  if (chunks.length === 1) {
    const audio = await generateChunk(chunks[0], voiceId, apiKey, modelId);
    fs.writeFileSync(outputPath, audio);
    console.log(`   ✓ Audio saved: ${outputPath}`);
    return outputPath;
  }

  // Multiple chunks — save each then concatenate with FFmpeg
  const chunkPaths = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`   Chunk ${i + 1}/${chunks.length}…`);
    const chunkPath = outputPath.replace('.mp3', `-chunk-${i}.mp3`);
    const audio = await generateChunk(chunks[i], voiceId, apiKey, modelId);
    fs.writeFileSync(chunkPath, audio);
    chunkPaths.push(chunkPath);

    // Small delay to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Concatenate with FFmpeg
  console.log('   Concatenating audio chunks…');
  const listFile = outputPath.replace('.mp3', '-list.txt');
  fs.writeFileSync(listFile, chunkPaths.map(p => `file '${p}'`).join('\n'));

  await runFFmpeg([
    '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath,
  ]);

  // Cleanup
  chunkPaths.forEach(p => fs.unlinkSync(p));
  fs.unlinkSync(listFile);

  console.log(`   ✓ Audio saved: ${outputPath}`);
  return outputPath;
}

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Get audio duration in seconds using ffprobe.
 */
function getAudioDuration(audioPath) {
  const ffprobe = findBinary('ffprobe');
  const result = execSync(
    `"${ffprobe}" -v error -show_entries format=duration ` +
    `-of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    { encoding: 'utf8' }
  );
  return parseFloat(result.trim());
}

module.exports = { generateAudio, getAudioDuration, splitIntoChunks };
