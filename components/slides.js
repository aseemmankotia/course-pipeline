/**
 * slides.js — Tab 3: Render
 * Chapter-by-chapter render preparation and status tracking.
 */

import { getCurriculum, getChapterData } from '../app.js';

// localStorage flag: has render input been prepared for chapter N?
const PREPARED_KEY = n => `course_render_prepared_${n}`;

// ── Public ────────────────────────────────────────────────────────────────────

export function renderSlides(container) {
  mountRender(container);
  window.addEventListener('curriculum-updated', () => mountRender(container));
  window.addEventListener('chapter-updated',    () => mountRender(container));
}

// ── Main mount ────────────────────────────────────────────────────────────────

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

  const totalChapters = cur.chapters.length;
  const scriptCount   = cur.chapters.filter(ch => !!getChapterData(ch.number)?.script).length;
  const preparedCount = cur.chapters.filter(ch => !!localStorage.getItem(PREPARED_KEY(ch.number))).length;

  container.innerHTML = `
    <div class="card">
      <div class="section-header">
        <h2>🎬 Render Chapters</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" id="prepare-all-btn"
            ${scriptCount === 0 ? 'disabled' : ''}>
            📋 Prepare All (${scriptCount})
          </button>
          <button class="btn btn-primary" id="render-all-btn"
            ${preparedCount === 0 ? 'disabled' : ''}>
            🎬 Render All (${preparedCount} ready)
          </button>
        </div>
      </div>

      <div class="status-bar info" style="margin-bottom:16px;">
        <span>📊</span>
        <span>${scriptCount} of ${totalChapters} scripts ready</span>
        <span>·</span>
        <span>${preparedCount} input${preparedCount !== 1 ? 's' : ''} prepared</span>
      </div>

      <div class="render-list" id="render-list">
        ${cur.chapters.map(ch => renderRowHtml(ch, cur)).join('')}
      </div>

      <div id="render-instructions" style="margin-top:20px;"></div>
    </div>

    <div class="card">
      <h3>⚙️ How Rendering Works</h3>
      <ol style="font-size:.875rem;color:var(--muted);line-height:2;padding-left:20px;">
        <li>Generate scripts in the <strong>Chapters</strong> tab for each chapter</li>
        <li>Click <strong>📋 Prepare</strong> — downloads <code>course-render-input.json</code> with that chapter's unique data</li>
        <li>Move it to its chapter directory:<br>
          <code style="background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:.78rem;">
            mv ~/Downloads/course-render-input.json ~/course-pipeline/render/chapters/chapter-NN/
          </code>
        </li>
        <li>Run: <code style="background:var(--code-bg);padding:2px 6px;border-radius:4px;">node render/course-render.js N</code></li>
        <li>Output: <code>render/chapters/chapter-NN/chapter-NN-final.mp4</code></li>
        <li>HeyGen video: place <code>heygen-chapter-NN.mp4</code> in project root, chapter dir, or ~/Downloads</li>
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

  wireButtons(container, cur);
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function wireButtons(container, cur) {
  container.querySelectorAll('.prepare-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n  = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      prepareChapter(container, cur, ch, getChapterData(n));
    });
  });

  container.querySelectorAll('.render-chapter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n  = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      showRenderInstructions(container, ch);
    });
  });

  container.querySelector('#prepare-all-btn')?.addEventListener('click', () => {
    prepareAll(container, cur);
  });

  container.querySelector('#render-all-btn')?.addEventListener('click', () => {
    const prepared = cur.chapters.filter(ch => !!localStorage.getItem(PREPARED_KEY(ch.number)));
    showBatchInstructions(container, prepared);
  });
}

// ── Row HTML ──────────────────────────────────────────────────────────────────

function renderRowHtml(ch, cur) {
  const d         = getChapterData(ch.number);
  const hasScript = !!d?.script;
  const prepared  = !!localStorage.getItem(PREPARED_KEY(ch.number));
  const paddedNum = String(ch.number).padStart(2, '0');
  const chapterDir = `render/chapters/chapter-${paddedNum}`;

  let icon, label, color;
  if (!hasScript) {
    icon = '⬜'; label = 'No script — generate in Chapters tab'; color = 'var(--muted)';
  } else if (prepared) {
    icon = '📋'; label = 'Input prepared — move file then render'; color = '#2563eb';
  } else {
    icon = '📝'; label = 'Script ready — click Prepare'; color = '#16a34a';
  }

  return `
    <div class="render-row" style="flex-wrap:wrap;gap:6px;align-items:flex-start;
        padding:12px 0;border-bottom:1px solid var(--border);">
      <div class="chapter-num" style="width:32px;height:32px;font-size:.8rem;flex-shrink:0;">${ch.number}</div>
      <div class="chapter-info" style="flex:1;min-width:160px;">
        <div style="font-weight:600;font-size:.9rem;color:var(--primary);margin-bottom:4px;">
          ${esc(ch.title)}
        </div>
        <div class="render-status" style="margin-bottom:2px;">
          <span>${icon}</span>
          <span style="color:${color};font-size:.82rem;">${label}</span>
        </div>
        ${prepared ? `
          <div style="font-size:.72rem;color:var(--muted);margin-top:3px;line-height:1.7;">
            📁 <code style="font-size:.71rem;">mv ~/Downloads/course-render-input.json ~/course-pipeline/${chapterDir}/</code><br>
            💻 <code style="font-size:.71rem;">node render/course-render.js ${ch.number}</code>
          </div>` : ''}
      </div>
      <span class="duration-badge" style="flex-shrink:0;">${ch.duration_mins || 15}m</span>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn btn-secondary btn-sm prepare-btn"
          data-chapter="${ch.number}"
          ${!hasScript ? 'disabled' : ''}>
          ${prepared ? '🔄 Re-prepare' : '📋 Prepare'}
        </button>
        <button class="btn btn-secondary btn-sm render-chapter-btn"
          data-chapter="${ch.number}"
          ${!prepared ? 'disabled' : ''}>
          🎬 Render ${ch.number}
        </button>
      </div>
    </div>
  `;
}

// ── Build render input ────────────────────────────────────────────────────────

function buildRenderInput(ch, cur, d) {
  const paddedNum = String(ch.number).padStart(2, '0');
  return {
    course_title:     cur.course_title,
    course_id:        cur.id || cur.course_id || 'course',
    chapter_number:   ch.number,
    chapter_title:    ch.title,
    chapter_subtitle: ch.subtitle || '',
    total_chapters:   cur.chapters.length,
    script:           d?.script || '',
    duration_mins:    ch.duration_mins || 15,
    key_takeaway:     ch.key_takeaway || '',
    quiz_questions:   ch.quiz_questions || [],
    concepts:         ch.concepts || [],
    heygen_local_file: `heygen-chapter-${paddedNum}.mp4`,
    output_filename:  `chapter-${paddedNum}-final.mp4`,
  };
}

// ── Prepare single chapter ────────────────────────────────────────────────────

function prepareChapter(container, cur, ch, d) {
  const paddedNum  = String(ch.number).padStart(2, '0');
  const chapterDir = `render/chapters/chapter-${paddedNum}`;

  downloadJson(buildRenderInput(ch, cur, d), 'course-render-input.json');
  localStorage.setItem(PREPARED_KEY(ch.number), '1');

  refreshList(container, cur);

  container.querySelector('#render-instructions').innerHTML = `
    <div class="status-bar success">
      <strong>📋 Chapter ${ch.number} prepared: ${esc(ch.title)}</strong><br>
      Render input downloaded with this chapter's script and content. Now:<br><br>
      <code style="background:rgba(0,0,0,.08);padding:4px 8px;border-radius:4px;display:block;margin:3px 0;font-size:.8rem;">
        mv ~/Downloads/course-render-input.json ~/course-pipeline/${chapterDir}/
      </code>
      <code style="background:rgba(0,0,0,.08);padding:4px 8px;border-radius:4px;display:block;margin:3px 0;font-size:.8rem;">
        node render/course-render.js ${ch.number}
      </code>
      <span style="font-size:.78rem;color:var(--muted);">
        Output: <code>${chapterDir}/chapter-${paddedNum}-final.mp4</code>
      </span>
    </div>`;
}

// ── Prepare all chapters ──────────────────────────────────────────────────────

async function prepareAll(container, cur) {
  const scriptsReady = cur.chapters.filter(ch => !!getChapterData(ch.number)?.script);
  if (!scriptsReady.length) return;

  for (const ch of scriptsReady) {
    const paddedNum = String(ch.number).padStart(2, '0');
    downloadJson(
      buildRenderInput(ch, cur, getChapterData(ch.number)),
      `course-render-input-ch${paddedNum}.json`
    );
    localStorage.setItem(PREPARED_KEY(ch.number), '1');
    await new Promise(r => setTimeout(r, 600));
  }

  refreshList(container, cur);

  container.querySelector('#render-instructions').innerHTML = `
    <div class="status-bar success">
      <strong>📋 ${scriptsReady.length} render input(s) downloaded!</strong><br>
      Each file contains that chapter's unique script. Move each to its chapter directory:<br><br>
      ${scriptsReady.map(ch => {
        const p = String(ch.number).padStart(2, '0');
        return `<code style="background:rgba(0,0,0,.08);padding:2px 6px;border-radius:4px;
            display:block;margin:2px 0;font-size:.76rem;">
          mv ~/Downloads/course-render-input-ch${p}.json
          ~/course-pipeline/render/chapters/chapter-${p}/course-render-input.json
        </code>`;
      }).join('')}
      <br>Then render all at once:<br>
      <code style="background:rgba(0,0,0,.08);padding:4px 8px;border-radius:4px;
          display:block;margin:3px 0;font-size:.8rem;">
        npm run render:all
      </code>
    </div>`;
}

// ── Instruction panels ────────────────────────────────────────────────────────

function showRenderInstructions(container, ch) {
  const paddedNum  = String(ch.number).padStart(2, '0');
  const chapterDir = `render/chapters/chapter-${paddedNum}`;
  container.querySelector('#render-instructions').innerHTML = `
    <div class="status-bar info">
      <strong>🎬 Render Chapter ${ch.number}: ${esc(ch.title)}</strong><br>
      Ensure <code>course-render-input.json</code> is in <code>${chapterDir}/</code>, then:<br><br>
      <code style="background:rgba(0,0,0,.08);padding:4px 8px;border-radius:4px;display:block;margin:3px 0;font-size:.8rem;">
        node render/course-render.js ${ch.number}
      </code>
      <span style="font-size:.78rem;color:var(--muted);">
        Output: <code>${chapterDir}/chapter-${paddedNum}-final.mp4</code>
      </span>
    </div>`;
}

function showBatchInstructions(container, chapters) {
  container.querySelector('#render-instructions').innerHTML = `
    <div class="status-bar info">
      <strong>🎬 Batch render ${chapters.length} chapter(s):</strong><br>
      Ensure each <code>course-render-input.json</code> is in its chapter directory
      (<code>render/chapters/chapter-NN/</code>), then:<br><br>
      <code style="background:rgba(0,0,0,.08);padding:4px 8px;border-radius:4px;display:block;margin:3px 0;font-size:.8rem;">
        npm run render:all
      </code>
      <span style="font-size:.78rem;color:var(--muted);">
        Output: <code>render/chapters/chapter-NN/chapter-NN-final.mp4</code> per chapter
      </span>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function refreshList(container, cur) {
  const listEl = container.querySelector('#render-list');
  if (!listEl) return;
  listEl.innerHTML = cur.chapters.map(ch => renderRowHtml(ch, cur)).join('');
  wireButtons(container, cur);
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
