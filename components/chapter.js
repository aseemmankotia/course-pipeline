/**
 * chapter.js — Tab 2: Chapter Script Editor
 * Features: script generation, cleaned copy, preview toggle, HeyGen API submit
 */

import { getSettings, getCurriculum, getChapterData, saveChapterData } from '../app.js';

// ── Public render ─────────────────────────────────────────────────────────────

export function renderChapter(container) {
  container.innerHTML = buildShell();
  mountControls(container);

  window.addEventListener('curriculum-updated', () => mountControls(container));

  window.addEventListener('generate-chapter-script', (e) => {
    const { n, cur } = e.detail;
    const sel = container.querySelector('#ch-selector');
    if (sel) sel.value = String(n);
    loadChapter(container, cur, n, true);
  });
}

function buildShell() {
  return `
    <div class="card">
      <div class="section-header">
        <h2>✏️ Chapter Script Editor</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="ch-selector" style="padding:7px 12px;border-radius:6px;border:1.5px solid var(--border);
            background:var(--surface);font-size:.875rem;color:var(--text);">
            <option value="">— select chapter —</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="ch-prev">← Prev</button>
          <button class="btn btn-secondary btn-sm" id="ch-next">Next →</button>
        </div>
      </div>
      <div id="ch-status"></div>
    </div>

    <div id="ch-editor-area"></div>
  `;
}

function mountControls(container) {
  const cur = getCurriculum();
  const sel = container.querySelector('#ch-selector');
  if (!sel) return;

  sel.innerHTML = '<option value="">— select chapter —</option>';
  if (cur) {
    cur.chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = String(ch.number);
      opt.textContent = `Ch ${ch.number}: ${ch.title}`;
      sel.appendChild(opt);
    });
  }

  sel.addEventListener('change', () => {
    const n = parseInt(sel.value);
    if (n && cur) loadChapter(container, cur, n, false);
  });

  container.querySelector('#ch-prev').addEventListener('click', () => navigate(container, cur, sel, -1));
  container.querySelector('#ch-next').addEventListener('click', () => navigate(container, cur, sel, +1));
}

function navigate(container, cur, sel, dir) {
  if (!cur) return;
  const cur_n = parseInt(sel.value) || 1;
  const next  = Math.min(Math.max(cur_n + dir, 1), cur.chapters.length);
  sel.value = String(next);
  loadChapter(container, cur, next, false);
}

// ── Load chapter into editor ──────────────────────────────────────────────────

function loadChapter(container, cur, n, autoGenerate) {
  const ch    = cur.chapters.find(c => c.number === n);
  if (!ch) return;

  const saved    = getChapterData(n);
  const editorEl = container.querySelector('#ch-editor-area');
  const s        = getSettings();
  const hasHeygen = !!(s.heygenApiKey && s.heygenAvatarId && s.heygenVoiceId);

  editorEl.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div class="chapter-num">${n}</div>
        <div>
          <div style="font-family:'Poppins',sans-serif;font-weight:700;font-size:1.1rem;color:var(--primary);">
            ${esc(ch.title)}
          </div>
          <div style="font-size:.85rem;color:var(--muted);">${esc(ch.subtitle || '')}</div>
        </div>
      </div>

      <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;">
        Covers: ${ch.concepts?.map(c => `<span class="pill" style="margin-right:4px;">${esc(c)}</span>`).join('') || '—'}
      </div>

      <!-- Row 1: generation + sizing -->
      <div class="btn-group" style="margin-bottom:8px;">
        <button class="btn btn-primary" id="gen-script-btn">
          ${saved?.script ? '🔄 Regenerate Script' : '✨ Generate Script'}
        </button>
        <button class="btn btn-secondary" id="shorten-btn" ${!saved?.script ? 'disabled' : ''}>
          ✂️ Shorter
        </button>
        <button class="btn btn-secondary" id="lengthen-btn" ${!saved?.script ? 'disabled' : ''}>
          📝 Longer
        </button>
      </div>

      <!-- Row 2: copy + preview + mark ready -->
      <div class="btn-group" style="margin-bottom:16px;">
        <button class="btn btn-outline" id="copy-script-btn" ${!saved?.script ? 'disabled' : ''}>
          📋 Copy
        </button>
        <button class="btn btn-outline" id="copy-cleaned-btn" ${!saved?.script ? 'disabled' : ''}>
          📋 Copy Cleaned Script
        </button>
        <button class="btn btn-secondary" id="preview-clean-btn" ${!saved?.script ? 'disabled' : ''}>
          👁 Preview Cleaned
        </button>
        <button class="btn btn-secondary" id="mark-ready-btn" ${!saved?.script ? 'disabled' : ''}
          style="${saved?.status === 'ready' ? 'background:var(--success);color:#fff;border-color:var(--success);' : ''}">
          ${saved?.status === 'ready' ? '✅ Ready' : '☑ Mark Ready'}
        </button>
      </div>

      <div id="script-gen-status"></div>
      <div id="preview-banner" class="preview-banner" style="display:none;">
        👁 Showing cleaned version — as HeyGen will speak it
      </div>

      <textarea class="script-editor" id="script-textarea"
        placeholder="Script will appear here after generation…">${esc(saved?.script || '')}</textarea>

      <div class="word-count-row">
        <span id="word-count">${wordCountLabel(saved?.script || '')}</span>
        <span style="color:var(--muted);">Chapter ${n} of ${cur.chapters.length}</span>
      </div>

      <!-- HeyGen section -->
      <div class="heygen-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.9rem;color:var(--secondary);">
            🎬 HeyGen Video Generation
          </div>
          ${!hasHeygen ? `
            <span style="font-size:.8rem;color:var(--muted);">
              ⚙️ Add HeyGen credentials in Settings to enable
            </span>` : ''}
        </div>

        ${hasHeygen ? `
          <div class="btn-group" style="margin-top:12px;">
            <button class="btn btn-primary" id="heygen-submit-btn" ${!saved?.script ? 'disabled' : ''}>
              🎬 Generate with HeyGen API
            </button>
          </div>` : ''}

        <div class="heygen-status-box" id="heygen-status-box">
          <div id="heygen-status-text" style="white-space:pre-line;"></div>
          <div class="heygen-video-preview" id="heygen-video-preview">
            <video controls></video>
            <div class="heygen-video-actions">
              <a class="btn btn-outline btn-sm" id="heygen-download-link" download>
                ⬇ Download MP4
              </a>
              <button class="btn btn-secondary btn-sm" id="heygen-use-render-btn">
                🎬 Use for Render
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Wire up all controls ──────────────────────────────────────────────────

  const textarea      = editorEl.querySelector('#script-textarea');
  const wordCount     = editorEl.querySelector('#word-count');
  const genBtn        = editorEl.querySelector('#gen-script-btn');
  const copyBtn       = editorEl.querySelector('#copy-script-btn');
  const copyCleanBtn  = editorEl.querySelector('#copy-cleaned-btn');
  const previewBtn    = editorEl.querySelector('#preview-clean-btn');
  const previewBanner = editorEl.querySelector('#preview-banner');
  const markBtn       = editorEl.querySelector('#mark-ready-btn');
  const shortenBtn    = editorEl.querySelector('#shorten-btn');
  const lengthenBtn   = editorEl.querySelector('#lengthen-btn');
  const heygenBtn     = editorEl.querySelector('#heygen-submit-btn');

  // Track preview state
  let isPreviewing  = false;
  let originalScript = saved?.script || '';

  textarea.addEventListener('input', () => {
    if (!isPreviewing) {
      originalScript = textarea.value;
      saveChapterData(n, { ...(getChapterData(n) || {}), script: textarea.value });
    }
    wordCount.textContent = wordCountLabel(textarea.value);
  });

  genBtn.addEventListener('click', () => {
    isPreviewing = false;
    previewBanner.style.display = 'none';
    previewBtn && (previewBtn.textContent = '👁 Preview Cleaned');
    generateScript(container, editorEl, cur, ch, false);
  });

  shortenBtn?.addEventListener('click', () => generateScript(container, editorEl, cur, ch, 'shorter'));
  lengthenBtn?.addEventListener('click', () => generateScript(container, editorEl, cur, ch, 'longer'));

  // Copy raw
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(textarea.value).then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
  });

  // Copy cleaned
  copyCleanBtn.addEventListener('click', () => {
    const raw     = originalScript || textarea.value;
    const cleaned = cleanChapterScript(raw);
    navigator.clipboard.writeText(cleaned).then(() => {
      copyCleanBtn.textContent = '✅ Copied!';
      setTimeout(() => { copyCleanBtn.textContent = '📋 Copy Cleaned Script'; }, 2000);
      const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
      const mins  = Math.round(words / 150);
      showToast(`Cleaned script copied (${words} words, ~${mins} min)`);
    });
  });

  // Preview cleaned toggle
  previewBtn.addEventListener('click', () => {
    if (!isPreviewing) {
      originalScript = textarea.value;
      const cleaned = cleanChapterScript(originalScript);
      textarea.value = cleaned;
      wordCount.textContent = wordCountLabel(cleaned) + ' · cleaned';
      previewBanner.style.display = 'flex';
      previewBtn.textContent = '👁 Show Original';
      isPreviewing = true;
    } else {
      textarea.value = originalScript;
      wordCount.textContent = wordCountLabel(originalScript);
      previewBanner.style.display = 'none';
      previewBtn.textContent = '👁 Preview Cleaned';
      isPreviewing = false;
    }
  });

  // Mark ready
  markBtn.addEventListener('click', () => {
    const current  = getChapterData(n) || {};
    const isReady  = current.status === 'ready';
    saveChapterData(n, { ...current, status: isReady ? 'not_started' : 'ready' });
    markBtn.style.cssText = isReady ? '' : 'background:var(--success);color:#fff;border-color:var(--success);';
    markBtn.textContent   = isReady ? '☑ Mark Ready' : '✅ Ready';
  });

  // HeyGen submit
  heygenBtn?.addEventListener('click', () =>
    generateHeyGenVideo(editorEl, n, cur, s, originalScript || textarea.value));

  if (autoGenerate && !saved?.script) {
    generateScript(container, editorEl, cur, ch, false);
  }

  // Restore saved HeyGen status if a video was already submitted
  const savedVideoUrl = localStorage.getItem(`course_heygen_url_${cur.id}_ch${n}`);
  if (savedVideoUrl) {
    updateHeyGenStatus(editorEl, '✅ Previously generated video:', savedVideoUrl, n);
  }
}

// ── Feature 1: Clean script ───────────────────────────────────────────────────

function cleanChapterScript(script) {
  let cleaned = script;

  // ── Step 1: Replace code blocks with spoken reference (before other passes) ──
  const codeBlockPhrases = [
    "Here's the code example on screen",
    "As shown in the code on screen",
    "Take a look at this on screen",
    "Check out this example on screen",
    "Here's what that looks like on screen",
  ];
  let codeIdx = 0;
  cleaned = cleaned.replace(/```[\s\S]*?```/g, () => {
    return codeBlockPhrases[codeIdx++ % codeBlockPhrases.length] + '.';
  });

  // ── Step 2: DELETE entire lines that are pure metadata/labels ────────────────
  const deleteLinePatterns = [
    // Script metadata headers (any # heading that contains script/spoken keywords)
    /^#+\s*(chapter\s*\d+[:\s-].*script.*)$/gim,
    /^#+\s*(video\s*script.*)$/gim,
    /^#+\s*(complete\s*spoken.*)$/gim,
    /^#+\s*(spoken\s*text.*)$/gim,
    /^#+\s*(script\s*text.*)$/gim,
    // "# Chapter 1: ..." heading lines used as metadata labels
    /^#+\s*chapter\s*\d+[:\s]/gim,
    // Bold-only section labels (the whole line is just a label in caps)
    /^\*{1,2}(CHAPTER INTRO|OPENING|HOOK|INTRO|INTRODUCTION|MAIN CONTENT|BODY|SECTION \d+|TRANSITION|CONCLUSION|OUTRO|CTA|CALL TO ACTION|SUBSCRIBE|RECAP|SUMMARY|CLOSE|END|WRAP UP|CLOSING)\*{0,2}$/gim,
    // Horizontal rules
    /^[-=*_]{2,}$/gm,
    // Lines containing only asterisks/underscores
    /^\*+\s*\*+$/gm,
    // Standalone metadata lines
    /^video\s*script.*$/gim,
    /^complete\s*spoken\s*text.*$/gim,
    /^chapter\s*\d+\s*[:|-]?\s*$/gim,
    /^duration\s*:.*$/gim,
    /^word\s*count\s*:.*$/gim,
    /^target\s*(audience)?\s*:.*$/gim,
    // Lines that are just a number and colon/period (orphaned list markers)
    /^\d+[.:]\s*$/gm,
  ];

  deleteLinePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // ── Step 3: Strip heading symbols from content lines, keep the text ──────────
  // e.g. "## What is Python?" → "What is Python?"
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // ── Step 4: Strip bold/italic markers, keep text ─────────────────────────────
  cleaned = cleaned.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,3}([^_\n]+)_{1,3}/g,   '$1');
  // Remove any remaining lone asterisks or underscores
  cleaned = cleaned.replace(/\*+/g, '');
  cleaned = cleaned.replace(/\b_+\b/g, '');

  // ── Step 5: Remove inline code backticks, keep text ──────────────────────────
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // ── Step 6: Remove brackets and curly-brace directions ───────────────────────
  cleaned = cleaned.replace(/\[([^\]]*)\]/g, '');
  cleaned = cleaned.replace(/\{([^}]*)\}/g,  '');

  // ── Step 7: Remove parenthetical stage/delivery directions ───────────────────
  cleaned = cleaned.replace(/^\s*\([^)]*\)\s*$/gm, '');
  const deliveryWords = [
    'pause', 'smile', 'laugh', 'energetic', 'serious', 'slow', 'fast',
    'loud', 'soft', 'whisper', 'emphasize', 'dramatic', 'excited', 'calm',
    'urgent', 'delivery', 'tone', 'voice', 'speaking', 'beat', 'chuckle',
    'warmly', 'firmly', 'gently', 'clearly',
  ];
  deliveryWords.forEach(word => {
    cleaned = cleaned.replace(new RegExp(`\\([^)]*${word}[^)]*\\)`, 'gi'), '');
  });

  // ── Step 8: Remove URLs ───────────────────────────────────────────────────────
  cleaned = cleaned.replace(/https?:\/\/[^\s]*/g, '');

  // ── Step 9: Remove bullet/list symbols, keep the text ────────────────────────
  cleaned = cleaned.replace(/^[\s]*[-•*]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm,  '');

  // ── Step 10: Final whitespace collapse ────────────────────────────────────────
  cleaned = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1)   // drop empty lines and single-char orphans
    .join('\n');

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// ── Feature 2: HeyGen API ─────────────────────────────────────────────────────

async function generateHeyGenVideo(editorEl, chapterNum, cur, s, rawScript) {
  const { heygenApiKey, heygenAvatarId, heygenVoiceId } = s;
  if (!heygenApiKey || !heygenAvatarId || !heygenVoiceId) {
    updateHeyGenStatus(editorEl, '❌ HeyGen credentials missing — check Settings.');
    return;
  }

  const cleaned = cleanChapterScript(rawScript);
  if (!cleaned) {
    updateHeyGenStatus(editorEl, '❌ No script content to submit.');
    return;
  }

  const chunks = splitIntoChunks(cleaned, 4500);
  updateHeyGenStatus(editorEl, `Submitting ${chunks.length} video clip${chunks.length !== 1 ? 's' : ''} to HeyGen…`);

  const videoInputs = chunks.map(chunk => ({
    character: { type: 'avatar', avatar_id: heygenAvatarId, avatar_style: 'normal' },
    voice:     { type: 'text',   input_text: chunk, voice_id: heygenVoiceId },
  }));

  const btn = editorEl.querySelector('#heygen-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loader"></span><span>Submitting…</span>'; }

  try {
    const resp = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: { 'X-Api-Key': heygenApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: videoInputs,
        dimension: { width: 1280, height: 720 },
        caption: false,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || `HeyGen error ${resp.status}`);

    const videoId = data.data?.video_id;
    if (!videoId) throw new Error('No video_id returned from HeyGen.');

    localStorage.setItem(`course_heygen_${cur.id}_ch${chapterNum}`, videoId);

    updateHeyGenStatus(editorEl,
      `✅ Submitted! Video ID: ${videoId}\n⏳ Rendering… (checking every 10 seconds)`);

    pollHeyGenStatus(editorEl, videoId, chapterNum, cur, heygenApiKey);

  } catch (err) {
    updateHeyGenStatus(editorEl, `❌ Error: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🎬 Generate with HeyGen API'; }
  }
}

async function pollHeyGenStatus(editorEl, videoId, chapterNum, cur, apiKey) {
  const maxAttempts = 60;
  let attempts = 0;

  const poll = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      updateHeyGenStatus(editorEl, '⏱ Polling timed out. Check your HeyGen dashboard.');
      return;
    }

    try {
      const resp = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        { headers: { 'X-Api-Key': apiKey } }
      );
      const data = await resp.json();
      const status   = data.data?.status;
      const videoUrl = data.data?.video_url;

      if (status === 'completed' && videoUrl) {
        localStorage.setItem(`course_heygen_url_${cur.id}_ch${chapterNum}`, videoUrl);
        updateHeyGenStatus(editorEl, `✅ Video ready!`, videoUrl, chapterNum);
      } else if (status === 'failed') {
        updateHeyGenStatus(editorEl, `❌ HeyGen render failed. Try again.`);
      } else {
        updateHeyGenStatus(editorEl,
          `⏳ Status: ${status || 'processing'}… (attempt ${attempts}/60)`);
        setTimeout(poll, 10_000);
      }
    } catch {
      setTimeout(poll, 10_000);
    }
  };

  setTimeout(poll, 10_000);
}

function updateHeyGenStatus(editorEl, message, videoUrl, chapterNum) {
  const box     = editorEl.querySelector('#heygen-status-box');
  const textEl  = editorEl.querySelector('#heygen-status-text');
  const preview = editorEl.querySelector('#heygen-video-preview');
  if (!box || !textEl) return;

  box.classList.add('visible');
  textEl.textContent = message;

  if (videoUrl && preview) {
    preview.classList.add('visible');
    const video    = preview.querySelector('video');
    const dlLink   = preview.querySelector('#heygen-download-link');
    const useBtn   = preview.querySelector('#heygen-use-render-btn');

    if (video)   video.src  = videoUrl;
    if (dlLink) {
      dlLink.href     = videoUrl;
      dlLink.download = `heygen-chapter-${String(chapterNum).padStart(2, '0')}.mp4`;
    }
    if (useBtn) {
      useBtn.addEventListener('click', () => {
        showToast('Video URL saved. Go to Render tab to generate slides.');
      });
    }
  }
}

// ── Script generation ─────────────────────────────────────────────────────────

async function generateScript(container, editorEl, cur, ch, mode) {
  const { claudeApiKey } = getSettings();
  if (!claudeApiKey) {
    editorEl.querySelector('#script-gen-status').innerHTML =
      `<div class="status-bar error">API key missing — add it in ⚙ Settings.</div>`;
    return;
  }

  const textarea     = editorEl.querySelector('#script-textarea');
  const genBtn       = editorEl.querySelector('#gen-script-btn');
  const wordCount    = editorEl.querySelector('#word-count');
  const scriptStatus = editorEl.querySelector('#script-gen-status');
  const wordTarget   = (ch.duration_mins || 15) * 150;
  const prevChapter  = cur.chapters.find(c => c.number === ch.number - 1);

  let userMsg;
  if (mode === 'shorter') {
    userMsg = `The following script is too long. Shorten it by about 25% while keeping all key concepts and the same structure. Keep the voice and tone identical.\n\n${textarea.value}`;
  } else if (mode === 'longer') {
    userMsg = `The following script is too short. Expand it by about 30%, adding more examples, analogies, and deeper explanation. Keep the same structure and voice.\n\n${textarea.value}`;
  } else {
    userMsg = `Write a complete video script for Chapter ${ch.number} of "${cur.course_title}".

Chapter: ${ch.title}
Subtitle: ${ch.subtitle || ''}
Concepts to cover: ${(ch.concepts || []).join(', ')}
Hands-on exercise: ${ch.hands_on || ''}
Real world example: ${ch.real_world_example || ''}
Key takeaway: ${ch.key_takeaway || ''}
Duration target: ${ch.duration_mins || 15} minutes (~${wordTarget} words)
${prevChapter ? `Previous chapter: "${prevChapter.title}"` : ''}

Script structure:
1. CHAPTER INTRO (60 seconds):
   - Welcome to Chapter ${ch.number}${ch.number > 1 ? ' / quick recap of Chapter ' + (ch.number - 1) : ''}
   - What we will learn today and WHY it matters
   - Encourage: this is where it clicks for most people

2. CONCEPT EXPLANATION (30% of script):
   - Start with the real-world analogy
   - Then introduce the technical definition
   - Break into digestible sub-concepts
   - Check understanding with a natural pause

3. DEMONSTRATION (40% of script):
   - Walk through the hands-on exercise step by step
   - Explain WHY not just HOW
   - Handle common mistakes and gotchas

4. REAL WORLD APPLICATION (15% of script):
   - Where this is used in production
   - Name real companies or tools

5. CHAPTER WRAP UP (15% of script):
   - Recap 3 key things learned
   - Preview next chapter with a hook
   - Call to action

IMPORTANT:
- No markdown symbols in spoken text
- No brackets or stage directions
- Write exactly as it should be spoken aloud
- Use natural pauses with ...
- Always address the viewer as you`;
  }

  genBtn.disabled = true;
  genBtn.innerHTML = '<span class="loader"></span><span>Generating…</span>';
  scriptStatus.innerHTML = `<div class="status-bar info"><span class="loader"></span> Writing script for Chapter ${ch.number}…</div>`;
  saveChapterData(ch.number, { ...(getChapterData(ch.number) || {}), status: 'generating' });

  const timer = setInterval(() => {
    wordCount.textContent = wordCountLabel(textarea.value);
  }, 2000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 6000,
        system: `You are an expert tech educator creating video scripts for online courses. Your teaching style is:
- Clear and encouraging, never condescending
- Uses simple analogies before technical terms
- Builds confidence with small wins
- Speaks directly to the viewer using you
- Celebrates progress
- Makes complex things feel achievable

Voice: conversational, enthusiastic, patient. Occasional light humor.
Never use markdown formatting or bracketed stage directions in the spoken text.`,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }

    const data   = await res.json();
    const script = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n\n');

    textarea.value = script;
    wordCount.textContent = wordCountLabel(script);
    saveChapterData(ch.number, { script, status: 'ready', generatedAt: Date.now() });

    scriptStatus.innerHTML = `<div class="status-bar success">✓ Script ready — ${script.trim().split(/\s+/).length} words</div>`;

    ['shorten-btn','lengthen-btn','copy-script-btn','copy-cleaned-btn',
     'preview-clean-btn','mark-ready-btn','heygen-submit-btn'].forEach(id => {
      const el = editorEl.querySelector(`#${id}`);
      if (el) el.disabled = false;
    });

  } catch (err) {
    scriptStatus.innerHTML = `<div class="status-bar error">${esc(err.message)}</div>`;
    saveChapterData(ch.number, { ...(getChapterData(ch.number) || {}), status: 'not_started' });
  } finally {
    clearInterval(timer);
    genBtn.disabled = false;
    genBtn.innerHTML = '🔄 Regenerate Script';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitIntoChunks(text, maxLen = 4500) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

function wordCountLabel(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins  = Math.round(words / 150);
  return `${words.toLocaleString()} words · ~${mins} min`;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
