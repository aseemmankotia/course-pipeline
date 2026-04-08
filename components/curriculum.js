/**
 * curriculum.js — Tab 1: Course Curriculum Generator
 */

import { getSettings, saveCurriculum, getCurriculum, getChapterData } from '../app.js';

const DEPTH_COUNTS = {
  'Quick start (4-6 chapters)':        5,
  'Standard course (8-10 chapters)':   9,
  'Deep dive (12-15 chapters)':       13,
};

// ── Public render ─────────────────────────────────────────────────────────────

export function renderCurriculum(container, onReady) {
  const s = getSettings();

  container.innerHTML = `
    <div class="card">
      <h2>📚 Course Curriculum Generator</h2>

      <div class="form-row single">
        <div class="form-group">
          <label>Course Topic</label>
          <input type="text" id="cv-topic"
            placeholder="e.g. Kubernetes for Beginners, Python Data Science, React from Scratch" />
        </div>
      </div>

      <div class="form-row triple">
        <div class="form-group">
          <label>Target Audience</label>
          <select id="cv-audience">
            <option>Complete beginner</option>
            <option>Some experience</option>
            <option>Intermediate developer</option>
          </select>
        </div>
        <div class="form-group">
          <label>Course Depth</label>
          <select id="cv-depth">
            <option>Quick start (4-6 chapters)</option>
            <option>Standard course (8-10 chapters)</option>
            <option>Deep dive (12-15 chapters)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Prerequisites (optional)</label>
          <input type="text" id="cv-prereqs" placeholder="Basic programming knowledge" />
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="cv-generate-btn">✨ Generate Curriculum</button>
        <button class="btn btn-secondary" id="cv-load-btn" title="Load last saved curriculum">📂 Load Saved</button>
      </div>

      <div id="cv-status"></div>
    </div>

    <div id="cv-results"></div>
  `;

  // Set defaults from settings
  if (s.defaultAudience) {
    const aud = container.querySelector('#cv-audience');
    [...aud.options].forEach(o => { o.selected = o.value === s.defaultAudience; });
  }
  if (s.defaultDepth) {
    const dep = container.querySelector('#cv-depth');
    [...dep.options].forEach(o => { o.selected = o.value === s.defaultDepth; });
  }

  container.querySelector('#cv-generate-btn').addEventListener('click', () =>
    generate(container, onReady));

  container.querySelector('#cv-load-btn').addEventListener('click', () => {
    const cur = getCurriculum();
    if (cur) {
      showCurriculum(container.querySelector('#cv-results'), cur, onReady);
    } else {
      container.querySelector('#cv-status').innerHTML =
        `<div class="status-bar warning">No saved curriculum found. Generate one first.</div>`;
    }
  });

  // Auto-load saved curriculum on mount
  const saved = getCurriculum();
  if (saved) showCurriculum(container.querySelector('#cv-results'), saved, onReady);
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generate(container, onReady) {
  const topic    = container.querySelector('#cv-topic').value.trim();
  const audience = container.querySelector('#cv-audience').value;
  const depth    = container.querySelector('#cv-depth').value;
  const prereqs  = container.querySelector('#cv-prereqs').value.trim();
  const statusEl = container.querySelector('#cv-status');
  const resultsEl = container.querySelector('#cv-results');
  const btn      = container.querySelector('#cv-generate-btn');

  if (!topic) {
    statusEl.innerHTML = `<div class="status-bar error">Please enter a course topic.</div>`;
    return;
  }

  const { claudeApiKey } = getSettings();
  if (!claudeApiKey) {
    statusEl.innerHTML = `<div class="status-bar error">Anthropic API key missing — add it in ⚙ Settings.</div>`;
    return;
  }

  const chapterCount = DEPTH_COUNTS[depth] || 9;
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span><span>Researching &amp; building curriculum…</span>';
  statusEl.innerHTML = `
    <div class="status-bar info">
      <span class="loader"></span>
      Searching the web and designing ${chapterCount}-chapter curriculum for <strong>${esc(topic)}</strong>…
    </div>`;
  resultsEl.innerHTML = '';

  try {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `You are an expert curriculum designer for online tech courses. Design comprehensive, well-structured courses that take learners from beginner to confident practitioner.

Today's date: ${dateStr}

Design principles:
- Each chapter builds on the previous
- Balance theory with hands-on practice (60/40 split)
- Include real-world examples and analogies
- Every chapter ends with a mini-project or exercise
- Use progressive complexity (easy wins early)
- Chapter titles should be engaging, not dry

Return ONLY valid JSON. No markdown fences, no extra text.`,
        messages: [{
          role: 'user',
          content: `Design a complete course curriculum for: ${topic}
Target audience: ${audience}
Number of chapters: ${chapterCount}
Prerequisites: ${prereqs || 'None'}

Search the web for the latest best practices and common learning paths for this topic.

Return this exact JSON structure:
{
  "course_title": "engaging course name",
  "course_subtitle": "one line description",
  "course_description": "2-3 paragraph course overview",
  "difficulty": "Beginner",
  "estimated_hours": 4,
  "prerequisites": ["item1"],
  "skills_learned": ["skill1", "skill2"],
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "subtitle": "what they will learn",
      "duration_mins": 15,
      "concepts": ["concept1", "concept2"],
      "hands_on": "description of practical exercise",
      "real_world_example": "relatable real world analogy",
      "quiz_questions": [
        {
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "correct": 0
        }
      ],
      "key_takeaway": "the one thing to remember"
    }
  ]
}`,
        }],
      }),
    }, statusEl);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Claude API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    if (!textBlocks.length) throw new Error('No response from Claude. Please try again.');

    const fullText = textBlocks.map(b => b.text).join('\n\n');
    const clean = fullText.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not find JSON in response.');

    const curriculum = JSON.parse(jsonMatch[0]);
    if (!curriculum.chapters || !curriculum.chapters.length)
      throw new Error('Curriculum has no chapters. Please try again.');

    curriculum.id        = Date.now();
    curriculum.topic     = topic;
    curriculum.audience  = audience;
    curriculum.createdAt = new Date().toISOString();

    saveCurriculum(curriculum);

    statusEl.innerHTML = `
      <div class="status-bar success">
        ✓ Curriculum generated — ${curriculum.chapters.length} chapters · saved to browser storage
      </div>`;

    showCurriculum(resultsEl, curriculum, onReady);

  } catch (err) {
    statusEl.innerHTML = `<div class="status-bar error">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Generate Curriculum';
  }
}

// ── Display curriculum ────────────────────────────────────────────────────────

function showCurriculum(container, cur, onReady) {
  const totalMins = cur.chapters.reduce((s, c) => s + (c.duration_mins || 15), 0);
  const hours = (totalMins / 60).toFixed(1);

  const skillsHtml = (cur.skills_learned || []).slice(0, 8)
    .map(s => `<span class="pill navy">${esc(s)}</span>`).join('');

  const chaptersHtml = cur.chapters.map((ch, i) => chapterCardHtml(ch, i, cur)).join('');

  container.innerHTML = `
    <div class="card">
      <div class="course-header">
        <div class="course-title">${esc(cur.course_title)}</div>
        <div class="course-subtitle">${esc(cur.course_subtitle || '')}</div>
        <div class="course-meta">
          <span class="pill accent">${esc(cur.difficulty || 'Beginner')}</span>
          <span class="pill"><span>⏱</span> ${hours}h total</span>
          <span class="pill"><span>📚</span> ${cur.chapters.length} chapters</span>
        </div>
        <div class="skills-row">${skillsHtml}</div>
      </div>

      <p style="color:var(--muted);font-size:.875rem;line-height:1.65;margin-bottom:20px;">
        ${esc(cur.course_description || '').replace(/\n\n/g, '</p><p style="color:var(--muted);font-size:.875rem;line-height:1.65;margin-bottom:20px;">')}
      </p>

      <div class="section-header">
        <h3 style="margin:0;">Course Chapters</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" id="gen-all-btn">
            ⚡ Generate All Scripts
          </button>
        </div>
      </div>

      <div class="chapters-list" id="chapters-list">
        ${chaptersHtml}
      </div>
    </div>
  `;

  // Per-chapter generate buttons
  container.querySelectorAll('.gen-script-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.chapter);
      window.dispatchEvent(new CustomEvent('generate-chapter-script', { detail: { n, cur } }));
      onReady && onReady();
    });
  });

  // Generate All
  container.querySelector('#gen-all-btn').addEventListener('click', async () => {
    for (let i = 0; i < cur.chapters.length; i++) {
      window.dispatchEvent(new CustomEvent('generate-chapter-script', {
        detail: { n: cur.chapters[i].number, cur, autoAdvance: true }
      }));
      await delay(500);
    }
    onReady && onReady();
  });

  // Listen for status updates
  window.addEventListener('chapter-updated', () => {
    refreshChapterStatuses(container, cur);
  });
}

function chapterCardHtml(ch, i, cur) {
  const data = getChapterData(ch.number);
  const status = data?.status || 'not_started';
  const icons = {
    not_started: '⬜', generating: '🔄', ready: '✅', rendered: '🎬', published: '📤',
  };

  return `
    <div class="chapter-card" id="ch-card-${ch.number}">
      <div class="chapter-num">${ch.number}</div>
      <div class="chapter-info">
        <div class="chapter-title-text">${esc(ch.title)}</div>
        <div class="chapter-subtitle-text">${esc(ch.subtitle || ch.concepts?.join(', ') || '')}</div>
      </div>
      <div class="chapter-actions">
        <span class="duration-badge">${ch.duration_mins || 15}m</span>
        <span class="status-icon" id="status-icon-${ch.number}">${icons[status]}</span>
        <button class="btn btn-outline btn-sm gen-script-btn" data-chapter="${ch.number}">
          ✏️ Script
        </button>
      </div>
    </div>
  `;
}

function refreshChapterStatuses(container, cur) {
  const icons = {
    not_started: '⬜', generating: '🔄', ready: '✅', rendered: '🎬', published: '📤',
  };
  cur.chapters.forEach(ch => {
    const el = container.querySelector(`#status-icon-${ch.number}`);
    if (!el) return;
    const data = getChapterData(ch.number);
    el.textContent = icons[data?.status || 'not_started'];
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, opts, statusEl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    const wait = [10, 30][attempt] || 30;
    for (let i = wait; i > 0; i--) {
      if (statusEl) statusEl.innerHTML =
        `<div class="status-bar error">Rate limit — retrying in <strong>${i}s</strong>…</div>`;
      await delay(1000);
    }
  }
  return fetch(url, opts);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
