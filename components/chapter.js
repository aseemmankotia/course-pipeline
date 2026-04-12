/**
 * chapter.js — Tab 2: Chapter Script Editor
 * Features: script generation, cleaned copy, preview toggle, HeyGen API submit
 */

import { getSettings, getCurriculum, getChapterData, saveChapterData, generateFullScript, TOKENS_BY_DURATION } from '../app.js';

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
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="ch-selector" style="padding:7px 12px;border-radius:6px;border:1.5px solid var(--border);
            background:var(--surface);font-size:.875rem;color:var(--text);">
            <option value="">— select chapter —</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="ch-prev">← Prev</button>
          <button class="btn btn-secondary btn-sm" id="ch-next">Next →</button>
          <button class="btn btn-outline btn-sm" id="ch-batch-btn"
            style="border-color:var(--accent);color:var(--accent);">
            📦 Batch Export
          </button>
        </div>
      </div>
      <div id="ch-status"></div>
    </div>

    <div id="ch-batch-area"></div>
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

  container.querySelector('#ch-batch-btn').addEventListener('click', () => {
    const batchArea = container.querySelector('#ch-batch-area');
    if (batchArea.children.length) {
      batchArea.innerHTML = ''; // toggle off
    } else {
      renderBatchExport(batchArea, cur);
    }
  });
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
  if (!script) return '';

  // ── Step 1: Replace fenced code blocks with a spoken reference ───────────────
  const codeBlockPhrases = [
    "Here's the code example on screen",
    "As shown in the code on screen",
    "Take a look at this on screen",
    "Check out this example on screen",
    "Here's what that looks like on screen",
  ];
  let codeIdx = 0;
  let cleaned = script.replace(/```[\s\S]*?```/g, () =>
    codeBlockPhrases[codeIdx++ % codeBlockPhrases.length] + '.'
  );

  // ── Step 2: Line-by-line — DELETE or clean each line ─────────────────────────
  const metadataLinePatterns = [
    /^word\s+count[:：]/i,
    /^estimated\s+runtime[:：]/i,
    /^target\s+audience[:：]/i,
    /^duration[:：]/i,
    /^tone[:：]/i,
    /^chapter\s+\d+\s*$/i,
    /^\[end\s+of\s+chapter/i,
    /^\[chapter\s+\d+/i,
    /^video\s+script/i,
    /^complete\s+spoken/i,
    /^spoken\s+text/i,
  ];

  const deliveryWords = [
    'pause', 'smile', 'laugh', 'energetic', 'serious', 'slow', 'fast',
    'loud', 'soft', 'whisper', 'emphasize', 'dramatic', 'excited', 'calm',
    'urgent', 'delivery', 'tone', 'voice', 'speaking', 'beat', 'chuckle',
    'warmly', 'firmly', 'gently', 'clearly',
  ];

  let lines = cleaned.split('\n').map(line => {
    const trimmed = line.trim();

    // DELETE: any heading line (## Title → gone, not kept as "Title")
    if (/^#{1,6}\s/.test(trimmed)) return null;

    // DELETE: line that is ONLY bold or italic text (e.g. **CHAPTER INTRO**)
    if (/^\*{1,3}[^*\n]+\*{1,3}$/.test(trimmed)) return null;

    // DELETE: bold-wrapped bracket content (e.g. **[END OF CHAPTER 1]**)
    if (/^\*{1,2}\[.*\]\*{1,2}$/.test(trimmed)) return null;

    // DELETE: separator lines (---, ===, ___)
    if (/^[-=*_]{2,}$/.test(trimmed)) return null;

    // DELETE: lines containing ONLY a bracketed label ([HOOK], [END OF CHAPTER 1])
    if (/^\[[^\]]+\]$/.test(trimmed)) return null;

    // DELETE: known metadata lines
    if (metadataLinePatterns.some(p => p.test(trimmed))) return null;

    // CLEAN: strip inline markdown symbols from mixed-content lines
    let out = line;
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '$1');  // **bold** → bold
    out = out.replace(/\*([^*\n]+)\*/g,     '$1');  // *italic* → italic
    out = out.replace(/__([^_\n]+)__/g,     '$1');
    out = out.replace(/_([^_\n]+)_/g,       '$1');
    out = out.replace(/\*+/g, '');                   // stray asterisks
    out = out.replace(/\[[^\]]*\]/g, '');            // [bracketed] inline
    out = out.replace(/`([^`]+)`/g, '$1');           // `code` → code
    out = out.replace(/https?:\/\/[^\s]*/g, '');     // URLs

    // Remove parenthetical delivery directions
    deliveryWords.forEach(word => {
      out = out.replace(new RegExp(`\\([^)]*\\b${word}\\b[^)]*\\)`, 'gi'), '');
    });

    if (!out.trim()) return null;
    return out;
  });

  // Remove deleted lines
  lines = lines.filter(l => l !== null);

  // ── Step 3: Remove code-reading artifacts ─────────────────────────────────────
  lines = lines.map(line => {
    let out = line;
    out = out.replace(/type\s+(['"`])?[a-z_]+(['"`])?\s*(then|next|and)/gi, '');
    [
      'open parenthesis', 'close parenthesis', 'open bracket', 'close bracket',
      'open curly brace', 'close curly brace', 'semicolon', 'colon here',
      'dot notation', 'double colon', 'backslash', 'forward slash',
      'equals sign', 'assignment operator', 'open paren', 'close paren',
    ].forEach(sw => { out = out.replace(new RegExp(sw, 'gi'), ''); });
    out = out.replace(/line by line|each line|every line|line \d+/gi, '');
    return out;
  });

  // ── Step 4: Collapse consecutive blank lines (max 2) ──────────────────────────
  const result = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) result.push(line);
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  return result.join('\n').trim();
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
  const maxTokens    = Math.min(TOKENS_BY_DURATION[ch.duration_mins] || 4500, 6000);
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

STRICT LENGTH RULE:
- Maximum video length: 30 minutes
- Maximum word count: 4,500 words
- Target word count: 3,000–4,000 words (20–25 mins)
- If content exceeds this, prioritize depth over breadth
- Cover fewer concepts thoroughly rather than many superficially
- Quality over quantity always

CRITICAL RULES FOR CODE IN SCRIPTS:
1. NEVER read code line by line
   BAD: "First we type import pandas as p d, then on the next line..."
   GOOD: "We start by importing the two libraries we need."
2. NEVER spell out variable names character by character
   BAD: "We create a variable called d, f which stores..."
   GOOD: "We store our data in a variable called df — short for DataFrame"
3. NEVER read out syntax symbols
   BAD: "We type df dot head open parenthesis five close parenthesis"
   GOOD: "We call the head function to peek at the first five rows"
4. DO describe what the code DOES, not what it SAYS
   Focus on: purpose, result, why this approach
5. DO use natural language for code concepts:
   - "We import the library" not "we type import"
   - "We create a function" not "def function_name colon"
   - "We loop through each item" not "for item in list colon"
   - "We store the result" not "we assign to variable"
6. DO reference the screen naturally:
   - "As you can see on screen..." / "Notice how the output shows..."
   - "The slide shows the full code — you can pause here to copy it."
7. For complex code blocks: explain the CONCEPT first (30 sec),
   then say "Here is the code on screen" (1 sec),
   then explain what the OUTPUT means (30 sec).
   Never walk through the code word by word.
8. Use analogies instead of syntax:
   - "Think of it like a spreadsheet" not "a DataFrame is a 2D labeled data structure"
   - "Like a recipe with steps" not "a function with parameters"

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
    const script = await generateFullScript(userMsg, claudeApiKey, maxTokens);

    textarea.value = script;
    wordCount.textContent = wordCountLabel(script);
    saveChapterData(ch.number, { script, status: 'ready', generatedAt: Date.now() });

    const { words, estimatedMins, isValid } = validateScriptLength(script);
    const lengthColor  = words <= 3500 ? '#16a34a' : words <= 4500 ? '#d97706' : '#dc2626';
    const lengthIcon   = words <= 3500 ? '✅' : words <= 4500 ? '⚠️' : '❌';
    const lengthNote   = words > 4500
      ? ` — Script exceeds 30 mins. Use <strong>Make Shorter</strong> to trim.` : '';
    scriptStatus.innerHTML = `
      <div class="status-bar" style="background:${words <= 3500 ? '#f0fdf4' : words <= 4500 ? '#fffbeb' : '#fef2f2'};
        border-color:${lengthColor};color:${lengthColor};">
        ${lengthIcon} Script ready — ${words.toLocaleString()} words · ~${estimatedMins} min${lengthNote}
      </div>`;

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

function validateScriptLength(script) {
  const words        = script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMins = Math.round(words / 150);
  if (words > 4500) console.warn(`Script too long (${words} words). Should be max 4,500.`);
  else console.log(`Script: ${words} words, ~${estimatedMins} mins`);
  return { words, estimatedMins, isValid: words <= 4500 };
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

// ── Batch HeyGen Export ───────────────────────────────────────────────────────

const BATCH_KEY = n => `course_batch_submitted_ch${n}`;
const BATCH_TS_KEY = 'course_batch_all_submitted_at';

function renderBatchExport(container, cur) {
  if (!cur) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>Generate a curriculum first.</p>
        </div>
      </div>`;
    return;
  }

  const chapters      = cur.chapters;
  const totalCount    = chapters.length;
  const submittedNums = chapters.map(ch => ch.number).filter(n => localStorage.getItem(BATCH_KEY(n)));
  const submittedCount = submittedNums.length;
  const allDone       = submittedCount === totalCount;
  const batchSubmittedAt = localStorage.getItem(BATCH_TS_KEY);

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h2 style="margin-bottom:4px;">📦 Batch HeyGen Export</h2>
          <div style="font-size:.875rem;color:var(--muted);">Submit all chapters to HeyGen web UI quickly</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://app.heygen.com" target="_blank" rel="noopener"
            class="btn btn-primary btn-sm">
            🎬 Open HeyGen ↗
          </a>
          <button class="btn btn-secondary btn-sm" id="batch-reset-btn">
            ↩ Reset All
          </button>
        </div>
      </div>

      <!-- Progress -->
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;font-size:.85rem;font-weight:600;margin-bottom:6px;">
          <span id="batch-progress-label" style="color:${allDone ? '#16a34a' : 'var(--primary)'};">
            ${allDone ? '🎉 All' : submittedCount} of ${totalCount} submitted to HeyGen
          </span>
          <span style="color:var(--muted);">${Math.round((submittedCount / totalCount) * 100)}%</span>
        </div>
        <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;">
          <div id="batch-progress-bar"
            style="height:100%;background:${allDone ? '#16a34a' : 'var(--accent)'};border-radius:3px;
                   width:${Math.round((submittedCount / totalCount) * 100)}%;transition:width .3s;">
          </div>
        </div>
      </div>

      ${allDone ? buildAllDoneBanner(batchSubmittedAt) : ''}

      <!-- Instructions -->
      <details style="margin-bottom:16px;" ${allDone ? '' : 'open'}>
        <summary style="cursor:pointer;font-weight:600;font-size:.875rem;color:var(--secondary);
          padding:8px 0;user-select:none;">
          How to batch submit
        </summary>
        <ol style="margin-top:10px;padding-left:20px;font-size:.85rem;color:var(--muted);line-height:2.2;">
          <li>Click <strong>Copy Script</strong> for Chapter 1</li>
          <li>In HeyGen: New Video → Paste script → Select avatar → Click Generate</li>
          <li>Come back here → Click <strong>Mark Submitted</strong></li>
          <li>Repeat for each chapter</li>
          <li>All ${totalCount} will render in parallel in HeyGen (~15 mins total)</li>
        </ol>
      </details>

      <!-- Chapter rows -->
      <div style="display:flex;flex-direction:column;gap:8px;" id="batch-chapter-list">
        ${chapters.map(ch => buildBatchRow(ch)).join('')}
      </div>
    </div>

    <!-- Download tracking (shown after all submitted) -->
    ${allDone ? buildDownloadSection(chapters) : ''}
  `;

  // ── Wire reset ──
  container.querySelector('#batch-reset-btn').addEventListener('click', () => {
    if (!confirm(`Reset all submission status for ${totalCount} chapters?`)) return;
    chapters.forEach(ch => localStorage.removeItem(BATCH_KEY(ch.number)));
    localStorage.removeItem(BATCH_TS_KEY);
    renderBatchExport(container, cur);
  });

  // ── Wire per-chapter buttons ──
  chapters.forEach(ch => {
    const data = getChapterData(ch.number);
    const script = data?.script || '';

    // Copy Script button
    const copyBtn = container.querySelector(`#batch-copy-${ch.number}`);
    copyBtn?.addEventListener('click', () => {
      const cleaned = cleanChapterScript(script);
      if (!cleaned) { showToast(`Chapter ${ch.number} has no script yet.`); return; }
      navigator.clipboard.writeText(cleaned).then(() => {
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = '#f0fdf4';
        copyBtn.style.borderColor = '#86efac';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Script';
          copyBtn.style.background = '';
          copyBtn.style.borderColor = '';
        }, 2500);
        showToast(`Ch ${ch.number} copied — ${cleaned.trim().split(/\s+/).length} words`);
      });
    });

    // Mark Submitted button
    const markBtn = container.querySelector(`#batch-mark-${ch.number}`);
    markBtn?.addEventListener('click', () => {
      const isSubmitted = !!localStorage.getItem(BATCH_KEY(ch.number));
      if (isSubmitted) {
        localStorage.removeItem(BATCH_KEY(ch.number));
      } else {
        localStorage.setItem(BATCH_KEY(ch.number), Date.now());
        showToast(`Chapter ${ch.number} marked as submitted`);
      }
      // Check if all submitted now
      const nowSubmitted = chapters.filter(c => localStorage.getItem(BATCH_KEY(c.number))).length;
      if (nowSubmitted === totalCount && !localStorage.getItem(BATCH_TS_KEY)) {
        localStorage.setItem(BATCH_TS_KEY, Date.now());
      }
      renderBatchExport(container, cur);
    });
  });

  // ── Wire file inputs (download tracking) ──
  if (allDone) {
    chapters.forEach(ch => {
      const drop  = container.querySelector(`#batch-drop-${ch.number}`);
      const input = container.querySelector(`#batch-file-${ch.number}`);
      const selectBtn = container.querySelector(`#batch-select-${ch.number}`);

      selectBtn?.addEventListener('click', () => input?.click());

      const handleFile = (file) => {
        if (!file) return;
        const expectedName = `heygen-chapter-${String(ch.number).padStart(2, '0')}.mp4`;
        const statusEl = container.querySelector(`#batch-file-status-${ch.number}`);
        if (statusEl) {
          statusEl.innerHTML = `
            <div class="status-bar success" style="margin-top:8px;">
              ✅ <strong>${esc(file.name)}</strong> selected
              (save as <code>${expectedName}</code> in project root)
            </div>`;
        }
        saveChapterData(ch.number, { ...(getChapterData(ch.number) || {}), status: 'rendered' });
        checkAllVideosReady(container, chapters);
      };

      input?.addEventListener('change', () => handleFile(input.files[0]));

      drop?.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; });
      drop?.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
      drop?.addEventListener('drop', e => {
        e.preventDefault();
        drop.style.borderColor = '';
        handleFile(e.dataTransfer.files[0]);
      });
    });
  }
}

function buildBatchRow(ch) {
  const data      = getChapterData(ch.number);
  const script    = data?.script || '';
  const isSubmitted = !!localStorage.getItem(BATCH_KEY(ch.number));
  const hasScript = script.length > 10;
  const words     = hasScript ? script.trim().split(/\s+/).filter(Boolean).length : 0;
  const mins      = Math.round(words / 150);
  const padded    = String(ch.number).padStart(2, '0');

  return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
      border:1.5px solid ${isSubmitted ? '#bbf7d0' : 'var(--border)'};
      background:${isSubmitted ? '#f0fdf4' : 'var(--bg)'};
      border-radius:8px;transition:all .15s;" id="batch-row-${ch.number}">
      <div style="width:30px;height:30px;border-radius:50%;
        background:${isSubmitted ? '#16a34a' : 'var(--accent)'};
        color:#fff;display:flex;align-items:center;justify-content:center;
        font-family:'Poppins',sans-serif;font-weight:700;font-size:.8rem;flex-shrink:0;">
        ${isSubmitted ? '✓' : ch.number}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:.9rem;color:var(--primary);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${esc(ch.title)}
        </div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:1px;">
          ${hasScript
            ? `${words.toLocaleString()} words · ~${mins} min · Save as: <code>heygen-chapter-${padded}.mp4</code>`
            : '<span style="color:#dc2626;">No script yet — generate in editor first</span>'}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button id="batch-copy-${ch.number}"
          class="btn btn-outline btn-sm" ${!hasScript ? 'disabled' : ''}
          style="font-size:.78rem;padding:4px 10px;">
          📋 Copy Script
        </button>
        <button id="batch-mark-${ch.number}"
          class="btn btn-sm"
          style="font-size:.78rem;padding:4px 10px;
            background:${isSubmitted ? '#16a34a' : 'transparent'};
            color:${isSubmitted ? '#fff' : 'var(--accent)'};
            border:1.5px solid ${isSubmitted ? '#16a34a' : 'var(--accent)'};">
          ${isSubmitted ? '✅ Submitted' : '☐ Mark Submitted'}
        </button>
      </div>
    </div>
  `;
}

function buildAllDoneBanner(batchSubmittedAt) {
  const minsRemaining = batchSubmittedAt
    ? Math.max(0, 15 - Math.round((Date.now() - parseInt(batchSubmittedAt)) / 60000))
    : 15;
  const isReady = minsRemaining === 0;

  return `
    <div style="background:${isReady ? '#f0fdf4' : '#fffbeb'};
      border:1.5px solid ${isReady ? '#86efac' : '#fde68a'};
      border-radius:8px;padding:14px 18px;margin-bottom:16px;">
      <div style="font-weight:700;font-size:.95rem;color:${isReady ? '#166534' : '#92400e'};">
        ${isReady
          ? '🎉 All chapters submitted and likely ready in HeyGen!'
          : '🎉 All chapters submitted! HeyGen is rendering them in parallel.'}
      </div>
      ${!isReady ? `
        <div style="font-size:.85rem;color:#92400e;margin-top:4px;">
          Come back in ~${minsRemaining} minute${minsRemaining !== 1 ? 's' : ''} to download.
        </div>` : ''}
    </div>
  `;
}

function buildDownloadSection(chapters) {
  const rows = chapters.map(ch => {
    const padded = String(ch.number).padStart(2, '0');
    const d      = getChapterData(ch.number);
    const isReady = d?.status === 'rendered' || d?.status === 'published';

    return `
      <div style="border:1.5px solid ${isReady ? '#bbf7d0' : 'var(--border)'};
        border-radius:8px;padding:14px 16px;background:${isReady ? '#f0fdf4' : 'var(--bg)'};">
        <div style="display:flex;align-items:center;justify-content:space-between;
          flex-wrap:wrap;gap:8px;margin-bottom:${isReady ? '0' : '10px'};">
          <div>
            <div style="font-weight:600;font-size:.9rem;color:var(--primary);">
              ${isReady ? '✅' : '⬇'} Chapter ${ch.number}: ${esc(ch.title)}
            </div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:2px;">
              Save download as: <code style="background:var(--code-bg);padding:1px 5px;border-radius:3px;">
                heygen-chapter-${padded}.mp4</code>
            </div>
          </div>
          <a href="https://app.heygen.com" target="_blank" rel="noopener"
            class="btn btn-secondary btn-sm" style="font-size:.78rem;">
            Open HeyGen ↗
          </a>
        </div>
        ${!isReady ? `
        <div id="batch-drop-${ch.number}"
          style="border:2px dashed var(--border);border-radius:6px;padding:14px;
            text-align:center;cursor:pointer;font-size:.825rem;color:var(--muted);
            transition:border-color .15s;">
          Drop <strong>heygen-chapter-${padded}.mp4</strong> here
          <br>
          <button id="batch-select-${ch.number}"
            class="btn btn-secondary btn-sm" style="margin-top:8px;font-size:.78rem;">
            📁 Select file
          </button>
          <input type="file" id="batch-file-${ch.number}" accept="video/mp4"
            style="display:none;">
        </div>
        <div id="batch-file-status-${ch.number}"></div>
        ` : ''}
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <h2 style="margin:0;">⬇ Download Rendered Videos</h2>
        <button id="batch-render-all-btn" class="btn btn-primary" disabled>
          🎬 Render All Chapters
        </button>
      </div>
      <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px;">
        Download each video from HeyGen and drop it below.
        When all are ready, click Render All.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${rows}
      </div>
    </div>
  `;
}

function checkAllVideosReady(container, chapters) {
  const allReady = chapters.every(ch => {
    const d = getChapterData(ch.number);
    return d?.status === 'rendered' || d?.status === 'published';
  });
  const renderBtn = container.querySelector('#batch-render-all-btn');
  if (renderBtn && allReady) {
    renderBtn.disabled = false;
    renderBtn.addEventListener('click', () => {
      showToast('Run: npm run render:all in your terminal');
    });
  }
}
