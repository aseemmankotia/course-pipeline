/**
 * slides.js — Tab 3: Render
 * UI for chapter render status and triggering course-render.js.
 */

import { getCurriculum, getChapterData, saveChapterData } from '../app.js';

// ── Public render ─────────────────────────────────────────────────────────────

export function renderSlides(container) {
  mountRender(container);
  window.addEventListener('curriculum-updated', () => mountRender(container));
  window.addEventListener('chapter-updated',    () => mountRender(container));
}

function mountRender(container) {
  const cur = getCurriculum();

  if (!cur) {
    container.innerHTML = `
      <div class="card">
        <h2>🎬 Render</h2>
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>Generate a curriculum in the <strong>Curriculum</strong> tab first.</p>
        </div>
      </div>`;
    return;
  }

  const totalChapters  = cur.chapters.length;
  const readyChapters  = cur.chapters.filter(ch => {
    const d = getChapterData(ch.number);
    return d?.status === 'ready' || d?.status === 'rendered';
  }).length;
  const renderedCount  = cur.chapters.filter(ch => getChapterData(ch.number)?.status === 'rendered').length;

  container.innerHTML = `
    <div class="card">
      <div class="section-header">
        <h2>🎬 Render Chapters</h2>
        <button class="btn btn-primary" id="render-all-btn"
          ${readyChapters === 0 ? 'disabled' : ''}>
          🎬 Render All (${readyChapters} ready)
        </button>
      </div>

      <div class="status-bar info" style="margin-bottom:16px;">
        <span>📊</span>
        <span>${renderedCount} of ${totalChapters} chapters rendered</span>
        ${readyChapters > 0
          ? `<span>· ${readyChapters} script${readyChapters !== 1 ? 's' : ''} ready to render</span>`
          : ''}
      </div>

      <div class="render-list">
        ${cur.chapters.map(ch => renderRowHtml(ch)).join('')}
      </div>

      <div id="render-instructions" style="margin-top:20px;"></div>
    </div>

    <div class="card">
      <h3>⚙️ How Rendering Works</h3>
      <ol style="font-size:.875rem;color:var(--muted);line-height:2;padding-left:20px;">
        <li>Click <strong>Render Chapter N</strong> — this generates a <code>course-render-input.json</code></li>
        <li>In terminal: <code style="background:var(--code-bg);padding:2px 6px;border-radius:4px;">npm run render:chapter</code></li>
        <li>Puppeteer screenshots slides, FFmpeg composites with your HeyGen avatar</li>
        <li>Output: <code>chapter-01-title-slug.mp4</code> in the project root</li>
        <li>Repeat per chapter or use <code>npm run render:all</code> for batch</li>
      </ol>
      <div style="margin-top:16px;">
        <div style="font-size:.8rem;font-weight:600;color:var(--primary);margin-bottom:8px;">Slide types Claude generates:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[
            ['🏷️','concept','Theory + bullets'],
            ['💻','code','Static code snippet'],
            ['⚡','live_code','Animated Jupyter cell'],
            ['🔀','analogy','Side-by-side comparison'],
            ['🔷','diagram','Mermaid flowchart'],
            ['❓','quiz','Multiple-choice check'],
          ].map(([icon, type, tip]) =>
            `<span title="${tip}" style="display:inline-flex;align-items:center;gap:4px;
              background:var(--code-bg);border:1px solid #e5e7eb;border-radius:20px;
              padding:3px 10px;font-size:.78rem;font-weight:500;color:var(--primary);">
              ${icon} ${type}
            </span>`
          ).join('')}
        </div>
      </div>
      <div style="margin-top:12px;font-size:.8rem;color:var(--muted);">
        Requires: ffmpeg · Node.js · npm install · ANTHROPIC_API_KEY in .env
      </div>
    </div>
  `;

  container.querySelectorAll('.render-chapter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n  = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      const d  = getChapterData(n);
      triggerRender(container, cur, ch, d);
    });
  });

  container.querySelector('#render-all-btn')?.addEventListener('click', () => {
    const readyChapters = cur.chapters.filter(ch => {
      const d = getChapterData(ch.number);
      return d?.status === 'ready' || d?.status === 'rendered';
    });
    showBatchInstructions(container, cur, readyChapters);
  });
}

function renderRowHtml(ch) {
  const d      = getChapterData(ch.number);
  const status = d?.status || 'not_started';
  const canRender = status === 'ready' || status === 'rendered';

  const statusMap = {
    not_started: { icon: '⬜', label: 'No script yet', color: 'var(--muted)' },
    generating:  { icon: '🔄', label: 'Generating…',   color: '#d97706' },
    ready:       { icon: '✅', label: 'Script ready',  color: '#16a34a' },
    rendered:    { icon: '🎬', label: 'Rendered',       color: 'var(--accent)' },
    published:   { icon: '📤', label: 'Published',      color: 'var(--success)' },
  };
  const st = statusMap[status] || statusMap.not_started;

  return `
    <div class="render-row">
      <div class="chapter-num" style="width:32px;height:32px;font-size:.8rem;">${ch.number}</div>
      <div class="chapter-info">
        <div style="font-weight:600;font-size:.9rem;color:var(--primary);">${esc(ch.title)}</div>
        <div class="render-status">
          <span>${st.icon}</span>
          <span style="color:${st.color};">${st.label}</span>
        </div>
      </div>
      <span class="duration-badge">${ch.duration_mins || 15}m</span>
      <button class="btn btn-secondary btn-sm render-chapter-btn"
        data-chapter="${ch.number}"
        ${!canRender ? 'disabled' : ''}>
        🎬 Render
      </button>
    </div>
  `;
}

function triggerRender(container, cur, ch, d) {
  const input = {
    course_title:   cur.course_title,
    course_id:      cur.id,
    chapter_number: ch.number,
    chapter_title:  ch.title,
    chapter_subtitle: ch.subtitle || '',
    total_chapters: cur.chapters.length,
    script:         d?.script || '',
    duration_mins:  ch.duration_mins || 15,
    key_takeaway:   ch.key_takeaway || '',
    quiz_questions: ch.quiz_questions || [],
    concepts:       ch.concepts || [],
    heygen_local_file: `heygen-chapter-${String(ch.number).padStart(2,'0')}.mp4`,
    output_filename: `chapter-${String(ch.number).padStart(2,'0')}-${slugify(ch.title)}.mp4`,
  };

  const blob = new Blob([JSON.stringify(input, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'course-render-input.json'; a.click();
  URL.revokeObjectURL(url);

  const instrEl = container.querySelector('#render-instructions');
  instrEl.innerHTML = `
    <div class="status-bar success">
      ✓ Downloaded <strong>course-render-input.json</strong> for Chapter ${ch.number}.<br>
      Now run: <code style="background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px;">npm run render:chapter</code>
      in your terminal.
    </div>`;

  // Optimistically mark as rendered
  saveChapterData(ch.number, { ...(d || {}), status: 'rendered' });
}

function showBatchInstructions(container, cur, chapters) {
  const instrEl = container.querySelector('#render-instructions');
  instrEl.innerHTML = `
    <div class="status-bar info">
      <div>
        <strong>Batch render ${chapters.length} chapters:</strong><br>
        <code style="background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">
          npm run render:all
        </code>
        <br><span style="font-size:.8rem;color:var(--muted);margin-top:4px;display:block;">
          Ensure each chapter's <code>course-render-input.json</code> is ready.
          render:all processes sequentially, outputting chapter-01-*, chapter-02-*, etc.
        </span>
      </div>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
