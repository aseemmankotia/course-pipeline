/**
 * chapter.js — Tab 2: Chapter Script Generator
 */

import { getSettings, getCurriculum, getChapterData, saveChapterData } from '../app.js';

// ── Public render ─────────────────────────────────────────────────────────────

export function renderChapter(container) {
  container.innerHTML = buildShell();
  mountControls(container);

  // Re-mount when curriculum changes (generated in Tab 1)
  window.addEventListener('curriculum-updated', () => mountControls(container));

  // Auto-select chapter when coming from Tab 1 "Script" button
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

  // Populate selector
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
  const ch       = cur.chapters.find(c => c.number === n);
  if (!ch) return;

  const saved    = getChapterData(n);
  const editorEl = container.querySelector('#ch-editor-area');
  const statusEl = container.querySelector('#ch-status');

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

      <div class="btn-group" style="margin-bottom:16px;">
        <button class="btn btn-primary" id="gen-script-btn">
          ${saved?.script ? '🔄 Regenerate Script' : '✨ Generate Script'}
        </button>
        <button class="btn btn-secondary" id="shorten-btn" ${!saved?.script ? 'disabled' : ''}>
          ✂️ Shorter
        </button>
        <button class="btn btn-secondary" id="lengthen-btn" ${!saved?.script ? 'disabled' : ''}>
          📝 Longer
        </button>
        <button class="btn btn-outline" id="copy-script-btn" ${!saved?.script ? 'disabled' : ''}>
          📋 Copy
        </button>
        <button class="btn btn-secondary" id="mark-ready-btn" ${!saved?.script ? 'disabled' : ''}
          style="${saved?.status === 'ready' ? 'background:var(--success);color:#fff;border-color:var(--success);' : ''}">
          ${saved?.status === 'ready' ? '✅ Ready' : '☑ Mark Ready'}
        </button>
      </div>

      <div id="script-gen-status"></div>

      <textarea class="script-editor" id="script-textarea" placeholder="Script will appear here after generation…"
        >${esc(saved?.script || '')}</textarea>

      <div class="word-count-row">
        <span id="word-count">${wordCountLabel(saved?.script || '')}</span>
        <span style="color:var(--muted);">Chapter ${n} of ${cur.chapters.length}</span>
      </div>
    </div>
  `;

  const textarea   = editorEl.querySelector('#script-textarea');
  const wordCount  = editorEl.querySelector('#word-count');
  const genBtn     = editorEl.querySelector('#gen-script-btn');
  const copyBtn    = editorEl.querySelector('#copy-script-btn');
  const markBtn    = editorEl.querySelector('#mark-ready-btn');
  const shortenBtn = editorEl.querySelector('#shorten-btn');
  const lengthenBtn = editorEl.querySelector('#lengthen-btn');
  const scriptStatus = editorEl.querySelector('#script-gen-status');

  textarea.addEventListener('input', () => {
    wordCount.textContent = wordCountLabel(textarea.value);
    saveChapterData(n, { ...(getChapterData(n) || {}), script: textarea.value });
  });

  genBtn.addEventListener('click', () => generateScript(container, editorEl, cur, ch, false));
  shortenBtn.addEventListener('click', () => generateScript(container, editorEl, cur, ch, 'shorter'));
  lengthenBtn.addEventListener('click', () => generateScript(container, editorEl, cur, ch, 'longer'));

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(textarea.value).then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
  });

  markBtn.addEventListener('click', () => {
    const current = getChapterData(n) || {};
    const isReady = current.status === 'ready';
    saveChapterData(n, { ...current, status: isReady ? 'not_started' : 'ready' });
    markBtn.style.cssText = isReady
      ? '' : 'background:var(--success);color:#fff;border-color:var(--success);';
    markBtn.textContent = isReady ? '☑ Mark Ready' : '✅ Ready';
  });

  if (autoGenerate && !saved?.script) {
    generateScript(container, editorEl, cur, ch, false);
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

  const prevChapter = cur.chapters.find(c => c.number === ch.number - 1);

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
    const wc = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    if (wc > 0) wordCount.textContent = wordCountLabel(textarea.value);
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

    // Enable action buttons
    ['shorten-btn','lengthen-btn','copy-script-btn','mark-ready-btn'].forEach(id => {
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

function wordCountLabel(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins  = Math.round(words / 150);
  return `${words.toLocaleString()} words · ~${mins} min`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
