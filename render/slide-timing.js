'use strict';
/**
 * slide-timing.js — align slide transitions to the ACTUAL spoken audio.
 *
 * The old pipeline timed slides by an AI-guessed `duration_seconds` scaled to
 * fill the chapter's total audio length (see distributeTimings in
 * course-render.js). Because the guess had no relationship to WHERE in the
 * narration each slide's topic is actually spoken, slides drifted out of sync
 * with the voice — worse as the chapter went on. Students reported the audio
 * "does not align with the slides."
 *
 * This module fixes that deterministically. edge-tts emits WordBoundary events
 * (an exact timestamp for every spoken word) which tts-generate.js now saves
 * next to the narration as `heygen-chapter-NN.words.json`. Each content slide
 * carries a verbatim `cue` — the first several words of the script portion it
 * covers. We locate each cue in the spoken-word stream, read off the timestamp,
 * and make the slide flip EXACTLY when the narration reaches it. No drift.
 *
 * Everything here is pure (no fs / no ffmpeg) so it can be unit-tested without a
 * render. `buildAlignedTimeline` returns null whenever it cannot align with
 * confidence, so the renderer falls back to the old proportional timing and a
 * bad alignment can never produce a worse result than before.
 */

const FIXED_TYPES = new Set(['chapter_title', 'chapter_summary', 'quiz']);

// Collapse a token to a comparison key: lowercase, strip everything but
// [a-z0-9]. "Bedrock," -> "bedrock", "don't" -> "dont", "GPU-based" -> "gpubased".
function keyOf(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Split an arbitrary string into comparison-key tokens (drops empties).
function tokenize(s) {
  return String(s == null ? '' : s).split(/\s+/).map(keyOf).filter(Boolean);
}

/**
 * Normalize a saved word-timings file into [{ k, t }] where k is the comparison
 * key and t is the word's start time in SECONDS. Accepts the two shapes edge-tts
 * / SubMaker produce:
 *   { text|word, offset (100ns ticks) | offset_seconds | t (seconds), ... }
 */
function parseWordTimings(raw) {
  const arr = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.words) ? raw.words : null);
  if (!arr) return [];
  const out = [];
  for (const w of arr) {
    if (w == null) continue;
    const text = w.text != null ? w.text : (w.word != null ? w.word : '');
    let t = null;
    if (typeof w.t === 'number') t = w.t;
    else if (typeof w.offset_seconds === 'number') t = w.offset_seconds;
    else if (typeof w.start === 'number') t = w.start;
    else if (typeof w.offset === 'number') t = w.offset > 100000 ? w.offset / 1e7 : w.offset; // ticks → s
    if (t == null || !isFinite(t)) continue;
    const k = keyOf(text);
    if (!k) continue;
    out.push({ k, t });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Find the spoken start time (seconds) of each content slide's cue.
 * Returns an array parallel to `cues` of { t, matched } — t is the timestamp
 * (or null if not found), matched is true when a real cue match anchored it.
 * Search is monotonic (each cue is located at/after the previous match) so a
 * phrase that recurs later in the chapter can't pull a slide backwards.
 */
function locateCues(cues, words) {
  const res = [];
  let cursor = 0;
  for (const cue of cues) {
    const toks = tokenize(cue).slice(0, 8);
    let found = -1;
    if (toks.length) {
      // Prefer a 2-token consecutive match (strongly localizing); fall back to a
      // single-token match if the pair never appears.
      for (let p = cursor; p < words.length; p++) {
        if (words[p].k !== toks[0]) continue;
        if (toks.length === 1 || (p + 1 < words.length && words[p + 1].k === toks[1])) { found = p; break; }
      }
      if (found === -1) {
        for (let p = cursor; p < words.length; p++) {
          if (words[p].k === toks[0]) { found = p; break; }
        }
      }
    }
    if (found === -1) { res.push({ t: null, matched: false }); }
    else { res.push({ t: words[found].t, matched: true }); cursor = found + 1; }
  }
  return res;
}

// Fill null starts by linear interpolation between known neighbours; clamp the
// whole sequence into [lo, hi] and force it strictly increasing with a minimum
// gap, nudging only what's necessary so exact matches are preserved where possible.
function normalizeStarts(rawStarts, lo, hi, minGap) {
  const n = rawStarts.length;
  const s = rawStarts.slice();

  // Interpolate gaps of nulls between two known anchors.
  let i = 0;
  while (i < n) {
    if (s[i] != null) { i++; continue; }
    let j = i; while (j < n && s[j] == null) j++;
    const left = i > 0 ? s[i - 1] : lo;
    const right = j < n ? s[j] : hi;
    const span = j - i + 1;
    for (let k = i; k < j; k++) s[k] = left + ((right - left) * (k - i + 1)) / span;
    i = j;
  }
  for (let k = 0; k < n; k++) if (s[k] == null || !isFinite(s[k])) s[k] = lo;

  // Not enough room for min gaps → equal split (degenerate: too many slides).
  if (hi - lo < n * minGap) {
    for (let k = 0; k < n; k++) s[k] = lo + ((hi - lo) * k) / Math.max(n, 1);
    return s;
  }
  // Forward pass: clamp to lo and enforce ascending min gap.
  s[0] = Math.max(lo, Math.min(s[0], hi - n * minGap));
  for (let k = 1; k < n; k++) s[k] = Math.max(s[k], s[k - 1] + minGap);
  // Backward pass: pull anything that overshot hi back inside.
  if (s[n - 1] > hi - minGap) {
    s[n - 1] = hi - minGap;
    for (let k = n - 2; k >= 0; k--) s[k] = Math.min(s[k], s[k + 1] - minGap);
  }
  for (let k = 0; k < n; k++) s[k] = Math.max(s[k], lo);
  return s;
}

/**
 * Build a per-slide duration timeline aligned to the spoken audio.
 *
 * @param {Array}  allSections  the full ordered slide list (title, content…, summary, quiz)
 * @param {Array}  wordTimingsRaw  parsed contents of heygen-chapter-NN.words.json
 * @param {number} totalDuration   audio length in seconds (from ffprobe)
 * @param {Object} [opts]
 * @returns {null | { durations:number[], matched:number, contentCount:number }}
 *          durations parallel to allSections (sums to ~totalDuration); or null
 *          if alignment isn't confident enough (caller should fall back).
 */
function buildAlignedTimeline(allSections, wordTimingsRaw, totalDuration, opts = {}) {
  const TITLE_MIN = opts.titleMin != null ? opts.titleMin : 3;
  const SUMMARY_DUR = opts.summaryDur != null ? opts.summaryDur : 8;
  const QUIZ_DUR = opts.quizDur != null ? opts.quizDur : 8;
  const MIN_SLIDE = opts.minSlide != null ? opts.minSlide : 2;

  const words = parseWordTimings(wordTimingsRaw);
  if (!words.length || !(totalDuration > 0)) return null;

  const contentIdx = [];
  allSections.forEach((s, i) => { if (!FIXED_TYPES.has(s.type)) contentIdx.push(i); });
  const n = contentIdx.length;
  if (n === 0) return null;

  const cues = contentIdx.map(i => allSections[i].cue || '');
  if (cues.filter(c => tokenize(c).length).length < Math.max(3, Math.ceil(0.6 * n))) return null;

  const located = locateCues(cues, words);
  const matched = located.filter(l => l.matched).length;
  if (matched < Math.max(3, Math.ceil(0.6 * n))) return null; // not confident → fall back

  const hasSummary = allSections.some(s => s.type === 'chapter_summary');
  const hasQuiz = allSections.some(s => s.type === 'quiz');
  const tailReserve = (hasSummary ? SUMMARY_DUR : 0) + (hasQuiz ? QUIZ_DUR : 0);

  const lo = Math.min(TITLE_MIN, totalDuration * 0.05);
  const hi = Math.max(lo + n * MIN_SLIDE, totalDuration - tailReserve);
  if (hi <= lo) return null;

  const starts = normalizeStarts(located.map(l => l.t), lo, hi, MIN_SLIDE);

  // Content slide i runs from its start to the next start (last → hi).
  const durations = new Array(allSections.length).fill(0);
  const titleIdx = allSections.findIndex(s => s.type === 'chapter_title');
  if (titleIdx !== -1) durations[titleIdx] = Math.max(starts[0], 0.5); // title fills [0, first content]

  for (let k = 0; k < n; k++) {
    const end = k < n - 1 ? starts[k + 1] : hi;
    durations[contentIdx[k]] = Math.max(end - starts[k], MIN_SLIDE);
  }
  allSections.forEach((s, i) => {
    if (s.type === 'chapter_summary') durations[i] = SUMMARY_DUR;
    if (s.type === 'quiz') durations[i] = QUIZ_DUR;
  });

  // Reconcile to total so slideshow length == audio length (protects -shortest).
  const sum = durations.reduce((a, b) => a + b, 0);
  const drift = totalDuration - sum;
  if (Math.abs(drift) > 0.05 && titleIdx !== -1) {
    durations[titleIdx] = Math.max(0.5, durations[titleIdx] + drift);
  }
  if (durations.some(d => !isFinite(d) || d <= 0)) return null;

  return { durations, matched, contentCount: n };
}

module.exports = { buildAlignedTimeline, parseWordTimings, locateCues, tokenize, keyOf, normalizeStarts };
