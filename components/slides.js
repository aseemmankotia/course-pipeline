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
        <li>Click <strong>📋 Prepare</strong> — downloads <code>course-render-input.json</code> with that chapter's script and content</li>
        <li>Move it to its chapter directory:<br>
          <code style="background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:.78rem;">
            mv ~/Downloads/course-render-input.json ~/course-pipeline/render/chapters/chapter-NN/
          </code>
        </li>
        <li>Run: <code style="background:var(--code-bg);padding:2px 6px;border-radius:4px;">node render/course-render.js N</code></li>
        <li>The renderer automatically: locates your HeyGen avatar video → gets duration → composites slides + HeyGen PIP</li>
        <li>Output: <code>render/chapters/chapter-NN/chapter-NN-final.mp4</code></li>
      </ol>
      <div style="margin-top:14px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-sm);">
        <div style="font-size:.8rem;font-weight:600;color:#166534;margin-bottom:6px;">Setup checklist:</div>
        <div style="font-size:.8rem;color:#15803d;line-height:1.9;">
          ✅ <code>ANTHROPIC_API_KEY</code> in <code>.env</code> — for curriculum &amp; script generation<br>
          ✅ HeyGen avatar video exported as <code>heygen-chapter-NN.mp4</code> (place in chapter dir or <code>~/Downloads</code>)<br>
          ✅ <code>cta-overlay.png</code> in project root — subscribe CTA overlay (optional)<br>
          ✅ <code>ffmpeg</code> installed — <code>brew install ffmpeg</code>
        </div>
      </div>
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

  // Wire PIP controls for each chapter that has a script
  cur.chapters.forEach(ch => {
    if (getChapterData(ch.number)?.script) {
      initPIPControls(container, ch.number);
    }
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
      ${hasScript ? `
      <div class="pip-config" style="width:100%;margin-top:10px;padding:12px;
          background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:8px;">
          Avatar PIP Mode
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          ${[
            ['full',        '📹', 'Full video',    'Avatar shown throughout'],
            ['intro_only',  '👋', 'Intro only',    'Avatar for first X seconds'],
            ['intro_outro', '🎬', 'Intro + Outro', 'Avatar at start and end'],
            ['none',        '🖥️', 'No avatar',     'Slides only (audio from HeyGen)'],
          ].map(([val, icon, title, desc]) => {
            const saved = localStorage.getItem(`pip_mode_ch${ch.number}`) || 'full';
            return `
            <label style="cursor:pointer;">
              <input type="radio" name="pip_mode_${ch.number}" value="${val}"
                ${saved === val ? 'checked' : ''} style="display:none;">
              <span style="display:flex;align-items:center;gap:8px;padding:8px 10px;
                  border:1.5px solid ${saved === val ? '#e94560' : '#e5e7eb'};
                  border-radius:6px;background:${saved === val ? '#fde8ec20' : 'white'};
                  transition:all 0.15s;" class="pip-opt-label">
                <span style="font-size:18px;">${icon}</span>
                <span>
                  <strong style="display:block;font-size:13px;color:#1a1a2e;">${title}</strong>
                  <small style="font-size:11px;color:#6b7280;">${desc}</small>
                </span>
              </span>
            </label>`;
          }).join('')}
        </div>
        <div id="pip_duration_${ch.number}" style="display:${
          ['intro_only','intro_outro'].includes(localStorage.getItem(`pip_mode_ch${ch.number}`) || 'full')
            ? 'block' : 'none'
        };padding-top:10px;border-top:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px;color:#374151;">
            <label style="width:120px;flex-shrink:0;">Intro duration:</label>
            <input type="range" id="intro_dur_${ch.number}" min="15" max="120"
              value="${localStorage.getItem(`pip_intro_duration_ch${ch.number}`) || 45}" step="5"
              style="flex:1;">
            <span id="intro_dur_label_${ch.number}" style="width:36px;text-align:right;font-weight:600;color:#e94560;">
              ${localStorage.getItem(`pip_intro_duration_ch${ch.number}`) || 45}s
            </span>
          </div>
          <div id="outro_dur_row_${ch.number}" style="display:${
            (localStorage.getItem(`pip_mode_ch${ch.number}`) || 'full') === 'intro_outro' ? 'flex' : 'none'
          };align-items:center;gap:10px;margin-bottom:8px;font-size:13px;color:#374151;">
            <label style="width:120px;flex-shrink:0;">Outro duration:</label>
            <input type="range" id="outro_dur_${ch.number}" min="15" max="60"
              value="${localStorage.getItem(`pip_outro_duration_ch${ch.number}`) || 30}" step="5"
              style="flex:1;">
            <span id="outro_dur_label_${ch.number}" style="width:36px;text-align:right;font-weight:600;color:#e94560;">
              ${localStorage.getItem(`pip_outro_duration_ch${ch.number}`) || 30}s
            </span>
          </div>
        </div>
        <div id="pip_timeline_${ch.number}" style="margin-top:10px;">
          ${renderPIPTimeline(
            localStorage.getItem(`pip_mode_ch${ch.number}`) || 'full',
            ch.duration_mins || 15,
            parseInt(localStorage.getItem(`pip_intro_duration_ch${ch.number}`) || 45, 10),
            parseInt(localStorage.getItem(`pip_outro_duration_ch${ch.number}`) || 30, 10)
          )}
        </div>
      </div>` : ''}
    </div>
  `;
}

// ── Build render input ────────────────────────────────────────────────────────

function buildRenderInput(ch, cur, d) {
  const n          = ch.number;
  const paddedNum  = String(n).padStart(2, '0');

  const pipMode      = document.querySelector(`input[name="pip_mode_${n}"]:checked`)?.value
                    || localStorage.getItem(`pip_mode_ch${n}`) || 'full';
  const introDuration = parseInt(
    document.getElementById(`intro_dur_${n}`)?.value
    || localStorage.getItem(`pip_intro_duration_ch${n}`) || '45', 10);
  const outroDuration = parseInt(
    document.getElementById(`outro_dur_${n}`)?.value
    || localStorage.getItem(`pip_outro_duration_ch${n}`) || '30', 10);

  return {
    course_title:        cur.course_title,
    course_id:           cur.id || cur.course_id || 'course',
    chapter_number:      n,
    chapter_title:       ch.title,
    chapter_subtitle:    ch.subtitle || '',
    total_chapters:      cur.chapters.length,
    script:              d?.script || '',
    duration_mins:       ch.duration_mins || 15,
    key_takeaway:        ch.key_takeaway || '',
    quiz_questions:      ch.quiz_questions || [],
    concepts:            ch.concepts || [],
    pip_mode:            pipMode,
    pip_duration_intro:  introDuration,
    pip_duration_outro:  outroDuration,
    heygen_local_file:   `heygen-chapter-${paddedNum}.mp4`,
    output_filename:     `chapter-${paddedNum}-final.mp4`,
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

// ── PIP controls ──────────────────────────────────────────────────────────────

function renderPIPTimeline(mode, totalMins, introDur, outroDur) {
  const totalSecs    = totalMins * 60;
  const introPct     = Math.min(100, (introDur / totalSecs) * 100).toFixed(1);
  const outroStart   = totalSecs - outroDur;
  const outroStartPct = Math.max(0, (outroStart / totalSecs) * 100).toFixed(1);
  const outroPct     = Math.min(100, (outroDur / totalSecs) * 100).toFixed(1);

  let segments = '';
  if (mode === 'full') {
    segments = `<div style="position:absolute;left:0;width:100%;height:100%;background:#e94560;opacity:.55;border-radius:2px;"></div>`;
  } else if (mode === 'intro_only') {
    segments = `<div style="position:absolute;left:0;width:${introPct}%;height:100%;background:#e94560;opacity:.55;border-radius:2px;"></div>`;
  } else if (mode === 'outro_only') {
    segments = `<div style="position:absolute;left:${outroStartPct}%;width:${outroPct}%;height:100%;background:#e94560;opacity:.55;border-radius:2px;"></div>`;
  } else if (mode === 'intro_outro') {
    segments = `
      <div style="position:absolute;left:0;width:${introPct}%;height:100%;background:#e94560;opacity:.55;border-radius:2px;"></div>
      <div style="position:absolute;left:${outroStartPct}%;width:${outroPct}%;height:100%;background:#e94560;opacity:.55;border-radius:2px;"></div>`;
  }

  return `
    <div style="margin-top:6px;">
      <div style="height:16px;background:#f3f4f6;border-radius:4px;position:relative;overflow:hidden;margin-bottom:4px;">
        ${segments}
        <span style="position:absolute;left:4px;top:50%;transform:translateY(-50%);font-size:10px;color:#6b7280;">0:00</span>
        <span style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:10px;color:#6b7280;">${totalMins}:00</span>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:#6b7280;">
        <span style="color:#e94560;">█ Avatar PIP</span>
        <span>░ Slides only</span>
      </div>
    </div>`;
}

function initPIPControls(container, n) {
  const radios          = container.querySelectorAll(`input[name="pip_mode_${n}"]`);
  const durationPanel   = container.querySelector(`#pip_duration_${n}`);
  const outroRow        = container.querySelector(`#outro_dur_row_${n}`);
  const timelineEl      = container.querySelector(`#pip_timeline_${n}`);
  const introSlider     = container.querySelector(`#intro_dur_${n}`);
  const outroSlider     = container.querySelector(`#outro_dur_${n}`);
  const introLabel      = container.querySelector(`#intro_dur_label_${n}`);
  const outroLabel      = container.querySelector(`#outro_dur_label_${n}`);

  const ch = { number: n, duration_mins: parseInt(container.querySelector(`[data-chapter="${n}"]`)?.closest('.render-row')?.querySelector('.duration-badge')?.textContent) || 15 };

  function updateTimeline() {
    if (!timelineEl) return;
    const mode     = container.querySelector(`input[name="pip_mode_${n}"]:checked`)?.value || 'full';
    const introDur = parseInt(introSlider?.value || 45, 10);
    const outroDur = parseInt(outroSlider?.value || 30, 10);
    timelineEl.innerHTML = renderPIPTimeline(mode, ch.duration_mins, introDur, outroDur);
  }

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = radio.value;
      localStorage.setItem(`pip_mode_ch${n}`, mode);

      // Update pill styles
      container.querySelectorAll(`input[name="pip_mode_${n}"]`).forEach(r => {
        const lbl = r.nextElementSibling;
        if (!lbl) return;
        lbl.style.borderColor = r.checked ? '#e94560' : '#e5e7eb';
        lbl.style.background  = r.checked ? '#fde8ec20' : 'white';
      });

      if (durationPanel) durationPanel.style.display = (mode === 'intro_only' || mode === 'intro_outro') ? 'block' : 'none';
      if (outroRow)       outroRow.style.display       = mode === 'intro_outro' ? 'flex' : 'none';
      updateTimeline();
    });
  });

  if (introSlider) {
    introSlider.addEventListener('input', () => {
      if (introLabel) introLabel.textContent = introSlider.value + 's';
      localStorage.setItem(`pip_intro_duration_ch${n}`, introSlider.value);
      updateTimeline();
    });
  }
  if (outroSlider) {
    outroSlider.addEventListener('input', () => {
      if (outroLabel) outroLabel.textContent = outroSlider.value + 's';
      localStorage.setItem(`pip_outro_duration_ch${n}`, outroSlider.value);
      updateTimeline();
    });
  }
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
