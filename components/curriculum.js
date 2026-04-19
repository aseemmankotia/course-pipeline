/**
 * curriculum.js — Tab 1: Course Curriculum Generator
 * Supports General Topic, Certification Exam, and Custom Syllabus modes.
 */

import { getSettings, saveCurriculum, getCurriculum, getChapterData, saveChapterData, generateFullScript, TOKENS_BY_DURATION } from '../app.js';

const DEPTH_COUNTS = {
  'Quick start (4-6 chapters)':        5,
  'Standard course (8-10 chapters)':   9,
  'Deep dive (12-15 chapters)':       13,
};

const PROMPT_PRESETS = {
  default: {
    name: 'Standard Course',
    badge: 'Default',
    description: 'Balanced mix of theory and practice. Good for general learning.',
    features: ['📊 Theory + Practice', '⏱️ 20-25 min chapters', '🎯 General audience'],
    file: null,
  },
  certification: {
    name: 'Certification Fast Track',
    badge: '🏆 Exam Prep',
    description: 'Zero fluff. Direct content. Practical labs. Exam questions. Built to pass on first attempt.',
    features: ['🎯 Exam-focused', '⚡ No fluff', '🔬 Practical labs', '📝 Exam questions'],
    file: 'prompts/certification-course-prompt.md',
  },
  'quick-start': {
    name: 'Quick Start Guide',
    badge: '⚡ Fast',
    description: 'Get something working as fast as possible. Zero theory until after first example.',
    features: ['⚡ Action-first', '⏱️ 10-15 min chapters', '🛠️ Hands-on immediately'],
    file: 'prompts/quick-start-prompt.md',
  },
  'deep-dive': {
    name: 'Deep Dive',
    badge: '🔬 Advanced',
    description: 'For experienced engineers. Focus on architecture decisions, trade-offs, edge cases.',
    features: ['🏗️ Architecture focus', '⚙️ Trade-offs', '🔬 Edge cases', '👩‍💻 Senior level'],
    file: 'prompts/deep-dive-prompt.md',
  },
};

// ── Public render ─────────────────────────────────────────────────────────────

export function renderCurriculum(container, onReady) {
  const s = getSettings();

  container.innerHTML = `
    <div class="card">
      <h2>📚 Course Curriculum Generator</h2>

      <!-- ── Course Type selector ─────────────────────────────────────────── -->
      <div class="form-group" style="margin-bottom:20px;">
        <label style="margin-bottom:10px;display:block;">Course Type</label>
        <div class="course-type-pills">
          <button class="course-type-pill active" data-type="general">📚 General Topic</button>
          <button class="course-type-pill" data-type="certification">🏆 Certification Exam</button>
          <button class="course-type-pill" data-type="custom_syllabus">📋 Custom Syllabus</button>
        </div>
      </div>

      <!-- ── General mode topic input ─────────────────────────────────────── -->
      <div id="cv-general-panel">
        <div class="form-row single">
          <div class="form-group">
            <label>Course Topic</label>
            <input type="text" id="cv-topic"
              placeholder="e.g. Kubernetes for Beginners, Python Data Science, React from Scratch" />
          </div>
        </div>
      </div>

      <!-- ── Certification mode ────────────────────────────────────────────── -->
      <div id="cv-cert-panel" style="display:none;">
        <div class="form-row single">
          <div class="form-group">
            <label>Certification Name</label>
            <input type="text" id="cv-cert-name"
              placeholder="e.g. Azure AI-900, AWS Solutions Architect, Google Cloud Professional, CompTIA Security+" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>Exam Topics / Domains</label>
            <textarea id="cv-exam-topics" rows="8"
              placeholder="Paste the official exam topics here.

Example for Azure AI-900:
- Describe AI workloads and considerations (15-20%)
- Describe fundamental principles of ML on Azure (20-25%)
- Describe features of computer vision on Azure (15-20%)
- Describe features of NLP on Azure (15-20%)
- Describe features of generative AI on Azure (15-20%)

Or click Auto-fetch to search for them automatically."></textarea>
            <div style="margin-top:8px;">
              <button class="btn btn-secondary btn-sm" id="cv-fetch-topics-btn">🔍 Auto-fetch exam topics from web</button>
              <span id="cv-fetch-status" style="font-size:.82rem;color:var(--muted);margin-left:10px;"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Custom syllabus mode ──────────────────────────────────────────── -->
      <div id="cv-syllabus-panel" style="display:none;">
        <div class="form-row single">
          <div class="form-group">
            <label>Course Title</label>
            <input type="text" id="cv-syllabus-title"
              placeholder="e.g. Complete Python Bootcamp" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>Course Syllabus / Topics to Cover</label>
            <textarea id="cv-custom-syllabus" rows="10"
              placeholder="Enter all topics that MUST be covered. One topic per line or as a structured list.

Example:
1. Introduction to Python
   - Variables and data types
   - Control flow (if/else, loops)
2. Functions
   - Defining functions
   - Parameters and return values
   - Lambda functions
3. Data Structures
   - Lists, tuples, dictionaries
   - List comprehensions"></textarea>
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>Coverage Priority</label>
            <select id="cv-coverage-priority">
              <option value="must_cover_all">Must cover ALL topics (exam prep)</option>
              <option value="best_effort">Best effort coverage (general learning)</option>
              <option value="weighted">Weight by importance percentage</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── Common fields ─────────────────────────────────────────────────── -->
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

      <!-- ── Prompt / Teaching Style selector ───────────────────────────────── -->
      <div class="form-group" style="margin-bottom:20px;">
        <label style="margin-bottom:10px;display:block;">Course Prompt / Teaching Style</label>
        <div class="prompt-presets" id="cv-prompt-presets">
          <button class="preset-pill active" data-prompt="default">📚 Standard</button>
          <button class="preset-pill" data-prompt="certification">🏆 Certification Fast Track</button>
          <button class="preset-pill" data-prompt="quick-start">⚡ Quick Start</button>
          <button class="preset-pill" data-prompt="deep-dive">🔬 Deep Dive</button>
        </div>

        <div class="prompt-description" id="promptDescription">
          <div class="prompt-meta">
            <span class="prompt-name">Standard Course</span>
            <span class="prompt-badge">Default</span>
          </div>
          <p class="prompt-desc">Balanced mix of theory and practice. Good for general learning.</p>
          <div class="prompt-features">
            <span>📊 Theory + Practice</span>
            <span>⏱️ 20-25 min chapters</span>
            <span>🎯 General audience</span>
          </div>
        </div>

        <div class="custom-prompt-section">
          <label class="upload-label" style="font-size:.82rem;color:var(--muted);margin-bottom:6px;display:block;">
            Or upload custom prompt file (.md):
          </label>
          <div class="file-drop-zone" id="promptDropZone">
            <input type="file" id="promptFileInput" accept=".md,.txt" style="display:none">
            <div class="drop-content" onclick="document.getElementById('promptFileInput').click()">
              <span class="drop-icon">📄</span>
              <span class="drop-text">Drop prompt file here or click to browse</span>
              <span class="drop-hint">Supports .md and .txt files</span>
            </div>
          </div>
          <div id="loadedPromptInfo" style="display:none;">
            <div class="loaded-prompt-card">
              <span class="loaded-icon">✅</span>
              <div class="loaded-details">
                <div class="loaded-name" id="loadedPromptName"></div>
                <div class="loaded-desc" id="loadedPromptDesc"></div>
              </div>
              <button id="clearCustomPromptBtn" class="clear-btn">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="cv-generate-btn">✨ Generate Curriculum</button>
        <button class="btn btn-secondary" id="cv-load-btn" title="Load last saved curriculum">📂 Load Saved</button>
      </div>

      <div id="cv-status"></div>
    </div>

    <div id="cv-results"></div>

    <style>
      .course-type-pills {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .course-type-pill {
        padding: 7px 16px;
        border-radius: 20px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--muted);
        font-size: .88rem;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: all .15s;
      }
      .course-type-pill.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
      }
      .course-type-pill:hover:not(.active) {
        border-color: var(--primary);
        color: var(--primary);
      }
      .coverage-matrix {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        margin-bottom: 20px;
      }
      .coverage-matrix-hdr {
        background: var(--primary);
        color: #fff;
        padding: 12px 16px;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        font-size: .95rem;
      }
      .coverage-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
      }
      .coverage-row:last-child { border-bottom: none; }
      .coverage-domain {
        flex: 1;
        font-size: .875rem;
        color: var(--text);
        min-width: 0;
      }
      .coverage-bar-wrap {
        width: 120px;
        flex-shrink: 0;
      }
      .coverage-bar-bg {
        background: var(--surface2);
        border-radius: 3px;
        height: 8px;
        overflow: hidden;
      }
      .coverage-bar-fill {
        height: 8px;
        border-radius: 3px;
        transition: width .4s;
      }
      .coverage-chapters {
        font-size: .78rem;
        color: var(--muted);
        white-space: nowrap;
      }
      .coverage-icon { font-size: 1.1rem; flex-shrink: 0; }
      .coverage-footer {
        background: var(--surface2);
        padding: 10px 16px;
        font-size: .875rem;
        font-weight: 600;
        color: var(--primary);
        border-top: 1px solid var(--border);
      }
      .exam-domain-tag {
        display: inline-block;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1d4ed8;
        border-radius: 3px;
        padding: 1px 6px;
        font-size: .72rem;
        margin: 1px 2px;
      }
      .prompt-presets { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
      .preset-pill {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--muted);
        font-size: .82rem;
        cursor: pointer;
        transition: all .15s;
        font-family: 'DM Sans', sans-serif;
      }
      .preset-pill:hover:not(.active) { border-color: var(--accent); color: var(--accent); }
      .preset-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
      .prompt-description {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 12px;
      }
      .prompt-meta { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
      .prompt-name { font-weight:600; font-size:.88rem; color:var(--primary); }
      .prompt-badge {
        font-size: .72rem; padding: 2px 8px; border-radius: 10px;
        background: #fde8ec; color: var(--accent); font-weight: 600;
      }
      .prompt-desc { font-size:.82rem; color:var(--muted); margin-bottom:8px; }
      .prompt-features { display:flex; gap:12px; flex-wrap:wrap; }
      .prompt-features span { font-size:.78rem; color:var(--muted); }
      .file-drop-zone {
        border: 2px dashed var(--border);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all .15s;
        margin-top: 8px;
      }
      .file-drop-zone:hover, .file-drop-zone.drag-over {
        border-color: var(--accent);
        background: #fde8ec20;
      }
      .drop-icon { font-size:20px; display:block; margin-bottom:4px; }
      .drop-text { font-size:.82rem; color:var(--text); display:block; }
      .drop-hint { font-size:.75rem; color:var(--muted); display:block; }
      .loaded-prompt-card {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: 8px;
        padding: 10px 14px;
        margin-top: 8px;
      }
      .loaded-name { font-weight:600; font-size:.85rem; color:#166534; }
      .loaded-desc { font-size:.75rem; color:#16a34a; }
      .clear-btn {
        margin-left: auto; background: none; border: none;
        color: var(--muted); cursor: pointer; font-size: 16px; padding: 0 4px;
      }
      .clear-btn:hover { color: var(--accent); }
      .active-prompt-banner {
        background: #fde8ec;
        border: 1px solid #f5c0cb;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: .8rem;
        color: var(--accent);
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .active-prompt-banner a { color: var(--accent); font-weight: 600; }
    </style>
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

  // Wire course type pills
  let activeCourseType = 'general';
  container.querySelectorAll('.course-type-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.course-type-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCourseType = pill.dataset.type;
      container.querySelector('#cv-general-panel').style.display  = activeCourseType === 'general'          ? '' : 'none';
      container.querySelector('#cv-cert-panel').style.display     = activeCourseType === 'certification'    ? '' : 'none';
      container.querySelector('#cv-syllabus-panel').style.display = activeCourseType === 'custom_syllabus'  ? '' : 'none';
    });
  });

  // Auto-fetch exam topics
  container.querySelector('#cv-fetch-topics-btn').addEventListener('click', () =>
    fetchExamTopics(container));

  // ── Prompt preset pills ──────────────────────────────────────────────────────
  const savedPreset = localStorage.getItem('course_active_preset') || 'default';
  updatePresetUI(container, savedPreset);

  container.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      const key = pill.dataset.prompt;
      localStorage.setItem('course_active_preset', key);
      localStorage.removeItem('course_custom_prompt');
      localStorage.removeItem('course_custom_prompt_name');
      localStorage.removeItem('course_custom_prompt_desc');
      container.querySelector('#loadedPromptInfo').style.display = 'none';
      container.querySelector('#promptFileInput').value = '';

      if (key !== 'default' && PROMPT_PRESETS[key]?.file) {
        try {
          const resp = await fetch(PROMPT_PRESETS[key].file);
          if (resp.ok) {
            localStorage.setItem('course_active_preset_text', await resp.text());
          } else {
            localStorage.removeItem('course_active_preset_text');
          }
        } catch { localStorage.removeItem('course_active_preset_text'); }
      } else {
        localStorage.removeItem('course_active_preset_text');
      }

      updatePresetUI(container, key);
    });
  });

  // Restore custom prompt display if one was previously loaded
  const customName = localStorage.getItem('course_custom_prompt_name');
  const customDesc = localStorage.getItem('course_custom_prompt_desc');
  if (localStorage.getItem('course_custom_prompt') && customName) {
    container.querySelector('#loadedPromptInfo').style.display = 'block';
    container.querySelector('#loadedPromptName').textContent = customName;
    container.querySelector('#loadedPromptDesc').textContent = customDesc || '';
    container.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
  }

  // File upload handler
  container.querySelector('#promptFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const nameMatch = text.match(/name:\s*"([^"]+)"/);
    const descMatch = text.match(/description:\s*"([^"]+)"/);
    const promptName = nameMatch ? nameMatch[1] : file.name;
    const promptDesc = descMatch ? descMatch[1] : 'Custom prompt file loaded';

    localStorage.setItem('course_custom_prompt', text);
    localStorage.setItem('course_custom_prompt_name', promptName);
    localStorage.setItem('course_custom_prompt_desc', promptDesc);
    localStorage.setItem('course_active_preset', 'custom');
    localStorage.removeItem('course_active_preset_text');

    container.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
    container.querySelector('#loadedPromptInfo').style.display = 'block';
    container.querySelector('#loadedPromptName').textContent = promptName;
    container.querySelector('#loadedPromptDesc').textContent = promptDesc;
    cvShowToast(container, `✅ Prompt loaded: ${promptName}`);
  });

  // Drag and drop
  const dropZone = container.querySelector('#promptDropZone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = container.querySelector('#promptFileInput');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });

  // Clear custom prompt
  container.querySelector('#clearCustomPromptBtn').addEventListener('click', () => {
    localStorage.removeItem('course_custom_prompt');
    localStorage.removeItem('course_custom_prompt_name');
    localStorage.removeItem('course_custom_prompt_desc');
    localStorage.removeItem('course_active_preset_text');
    localStorage.setItem('course_active_preset', 'default');
    container.querySelector('#loadedPromptInfo').style.display = 'none';
    container.querySelector('#promptFileInput').value = '';
    updatePresetUI(container, 'default');
    cvShowToast(container, 'Custom prompt cleared');
  });

  container.querySelector('#cv-generate-btn').addEventListener('click', () =>
    generate(container, () => activeCourseType, onReady));

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

// ── Auto-fetch exam topics ────────────────────────────────────────────────────

async function fetchExamTopics(container) {
  const certName = container.querySelector('#cv-cert-name').value.trim();
  const fetchStatus = container.querySelector('#cv-fetch-status');
  const btn = container.querySelector('#cv-fetch-topics-btn');

  if (!certName) {
    fetchStatus.textContent = '⚠ Enter certification name first.';
    return;
  }

  const { claudeApiKey, geminiApiKey } = getSettings();
  if (!claudeApiKey && !geminiApiKey) {
    fetchStatus.textContent = '⚠ API key missing — add it in ⚙ Settings.';
    return;
  }

  btn.disabled = true;
  fetchStatus.textContent = '🔍 Searching…';

  try {
    const result = await window.callAI({
      prompt: `Find the official exam topics/domains for: ${certName}
Search the official certification page and return all exam objectives.`,
      systemPrompt: `Search for the official exam objectives/topics for the specified certification.
Return ONLY the official exam domains and topics as a clean structured list.
Format as:
Domain 1: [Name] (X-Y%)
• Topic 1
• Topic 2
Domain 2: [Name] (X-Y%)
• Topic 1
etc.
No other text.`,
      maxTokens:         2000,
      requiresWebSearch: true,
      action:            'exam_topics_fetch',
    });
    container.querySelector('#cv-exam-topics').value = result.text.trim();
    fetchStatus.textContent = '✅ Fetched!';
    setTimeout(() => { fetchStatus.textContent = ''; }, 3000);
  } catch (e) {
    fetchStatus.textContent = `❌ ${e.message}`;
  } finally {
    btn.disabled = false;
  }
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generate(container, getCourseType, onReady) {
  const courseType   = getCourseType();
  const audience     = container.querySelector('#cv-audience').value;
  const depth        = container.querySelector('#cv-depth').value;
  const prereqs      = container.querySelector('#cv-prereqs').value.trim();
  const statusEl     = container.querySelector('#cv-status');
  const resultsEl    = container.querySelector('#cv-results');
  const btn          = container.querySelector('#cv-generate-btn');

  // Gather mode-specific fields
  let topic = '';
  let examTopics = '';
  let customSyllabus = '';
  let coveragePriority = 'must_cover_all';

  if (courseType === 'general') {
    topic = container.querySelector('#cv-topic').value.trim();
    if (!topic) {
      statusEl.innerHTML = `<div class="status-bar error">Please enter a course topic.</div>`;
      return;
    }
  } else if (courseType === 'certification') {
    topic = container.querySelector('#cv-cert-name').value.trim();
    examTopics = container.querySelector('#cv-exam-topics').value.trim();
    if (!topic) {
      statusEl.innerHTML = `<div class="status-bar error">Please enter a certification name.</div>`;
      return;
    }
    if (!examTopics) {
      statusEl.innerHTML = `<div class="status-bar error">Please paste or fetch exam topics.</div>`;
      return;
    }
  } else {
    topic = container.querySelector('#cv-syllabus-title').value.trim() || 'Custom Course';
    customSyllabus = container.querySelector('#cv-custom-syllabus').value.trim();
    coveragePriority = container.querySelector('#cv-coverage-priority').value;
    if (!customSyllabus) {
      statusEl.innerHTML = `<div class="status-bar error">Please enter your course syllabus.</div>`;
      return;
    }
  }

  const { claudeApiKey, geminiApiKey } = getSettings();
  if (!claudeApiKey && !geminiApiKey) {
    statusEl.innerHTML = `<div class="status-bar error">API key missing — add Anthropic or Gemini key in ⚙ Settings.</div>`;
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
      Building ${chapterCount}-chapter curriculum for <strong>${esc(topic)}</strong>…
    </div>`;
  resultsEl.innerHTML = '';

  const prompt = buildCurriculumPrompt(courseType, topic, audience, prereqs, chapterCount, examTopics, customSyllabus, coveragePriority);

  const activePromptText = getActiveSystemPrompt();
  const defaultSystemPrompt = `You are an expert curriculum designer for online tech courses. Design comprehensive, well-structured courses.

Today's date: ${dateStr}

Design principles:
- Each chapter builds on the previous
- Balance theory with hands-on practice (60/40 split)
- Include real-world examples and analogies
- Every chapter ends with a mini-project or exercise
- Use progressive complexity (easy wins early)
- Chapter titles should be engaging, not dry

Return ONLY valid JSON. No markdown fences, no extra text.`;

  const systemPrompt = activePromptText
    ? activePromptText + '\n\n---\n\n' + defaultSystemPrompt
    : defaultSystemPrompt;

  try {
    const result = await window.callAI({
      prompt:            prompt,
      systemPrompt,
      maxTokens:         8000,
      requiresWebSearch: true,
      action:            'curriculum_generation',
    });

    const fullText = result.text;
    const clean = fullText.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not find JSON in response.');

    const curriculum = JSON.parse(jsonMatch[0]);
    if (!curriculum.chapters || !curriculum.chapters.length)
      throw new Error('Curriculum has no chapters. Please try again.');

    curriculum.id          = Date.now();
    curriculum.topic       = topic;
    curriculum.audience    = audience;
    curriculum.createdAt   = new Date().toISOString();
    curriculum.course_type = courseType;
    if (courseType === 'certification') curriculum.exam_name = topic;

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

// ── Build prompt by course type ────────────────────────────────────────────────

function buildCurriculumPrompt(courseType, topic, audience, prereqs, chapterCount, examTopics, customSyllabus, coveragePriority) {
  let coverageInstructions = '';

  if (courseType === 'certification') {
    coverageInstructions = `CERTIFICATION EXAM PREPARATION MODE:
This course MUST prepare students to pass: ${topic}

Official exam topics that MUST be covered:
${examTopics}

CRITICAL REQUIREMENTS:
1. Every single exam domain/topic listed above MUST be covered in at least one chapter
2. Weight chapter depth proportionally to exam domain % (higher % = more chapters or deeper coverage)
3. Include practice questions in each chapter that mirror actual exam question style
4. Chapter titles should reference exam domains where relevant
5. Include exam tips and common misconceptions
6. Final chapter MUST be exam preparation/practice test strategy

Generate exactly ${chapterCount} chapters that together provide complete coverage of ALL exam topics above.
For each chapter include which exam domains it covers in the exam_domains_covered field.
Also return a coverage_map in the root JSON showing which exam topics each chapter covers.`;

  } else if (courseType === 'custom_syllabus') {
    const priority = coveragePriority === 'must_cover_all'
      ? 'Every topic in the syllabus MUST appear in at least one chapter. Do not skip any topic.'
      : coveragePriority === 'weighted'
      ? 'Weight chapters by importance. Topics listed first or at higher levels get more depth.'
      : 'Cover as many topics as possible in a logical order.';

    coverageInstructions = `CUSTOM SYLLABUS MODE:
This course MUST cover the following topics:
${customSyllabus}

CRITICAL REQUIREMENTS:
1. ${priority}
2. Maintain the logical order of the syllabus
3. Group related topics into the same chapter
4. Generate exactly ${chapterCount} chapters

For each chapter include a topics_covered field listing which syllabus items it addresses.`;

  } else {
    coverageInstructions = `Generate a well-structured course on: ${topic}
Cover the most important concepts for ${audience}.
Use web search to find the latest best practices and common learning paths for this topic.
Generate exactly ${chapterCount} chapters.`;
  }

  return `${coverageInstructions}

Target audience: ${audience}
Prerequisites: ${prereqs || 'None'}

Return this exact JSON structure (no markdown fences):
{
  "course_title": "engaging course name",
  "course_subtitle": "one line description",
  "course_description": "2-3 paragraph course overview",
  "difficulty": "Beginner",
  "estimated_hours": 4,
  "prerequisites": ["item1"],
  "skills_learned": ["skill1", "skill2"],
  ${courseType === 'certification' ? `"exam_name": "${topic}",
  "coverage_map": {
    "Domain 1: AI Workloads (15-20%)": [1, 2],
    "Domain 2: ML on Azure (20-25%)": [3, 4]
  },` : ''}
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "subtitle": "what they will learn",
      "duration_mins": 15,
      "concepts": ["concept1", "concept2"],
      "hands_on": "description of practical exercise",
      "real_world_example": "relatable real world analogy",
      ${courseType === 'certification' ? `"exam_domains_covered": ["Domain 1: AI Workloads (15-20%)"],
      "exam_tips": ["tip 1", "tip 2"],` : ''}
      ${courseType === 'custom_syllabus' ? `"topics_covered": ["syllabus item 1", "syllabus item 2"],` : ''}
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
}`;
}

// ── Display curriculum ────────────────────────────────────────────────────────

function showCurriculum(container, cur, onReady) {
  const totalMins = cur.chapters.reduce((s, c) => s + (c.duration_mins || 15), 0);
  const hours = (totalMins / 60).toFixed(1);

  const skillsHtml = (cur.skills_learned || []).slice(0, 8)
    .map(s => `<span class="pill navy">${esc(s)}</span>`).join('');

  const chaptersHtml = cur.chapters.map((ch, i) => chapterCardHtml(ch, i, cur)).join('');

  const coverageHtml = buildCoverageMatrixHtml(cur);

  container.innerHTML = `
    <div class="card">
      <div class="course-header">
        <div class="course-title">${esc(cur.course_title)}</div>
        <div class="course-subtitle">${esc(cur.course_subtitle || '')}</div>
        <div class="course-meta">
          <span class="pill accent">${esc(cur.difficulty || 'Beginner')}</span>
          ${cur.course_type === 'certification' ? `<span class="pill" style="background:#fffbeb;color:#92400e;border-color:#fcd34d;">🏆 ${esc(cur.exam_name || 'Certification')}</span>` : ''}
          ${cur.course_type === 'custom_syllabus' ? `<span class="pill" style="background:#f0fdf4;color:#166534;border-color:#bbf7d0;">📋 Custom Syllabus</span>` : ''}
          <span class="pill"><span>⏱</span> ${hours}h total</span>
          <span class="pill"><span>📚</span> ${cur.chapters.length} chapters</span>
        </div>
        <div class="skills-row">${skillsHtml}</div>
      </div>

      <p style="color:var(--muted);font-size:.875rem;line-height:1.65;margin-bottom:20px;">
        ${esc(cur.course_description || '').replace(/\n\n/g, '</p><p style="color:var(--muted);font-size:.875rem;line-height:1.65;margin-bottom:20px;">')}
      </p>

      ${coverageHtml}

      <div class="section-header">
        <h3 style="margin:0;">Course Chapters</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" id="gen-all-btn">
            ⚡ Generate All Scripts
          </button>
        </div>
      </div>

      <div id="batch-gen-progress" style="display:none;margin-bottom:14px;
        background:var(--code-bg);border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
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
    const genAllBtn  = container.querySelector('#gen-all-btn');
    const progressEl = container.querySelector('#batch-gen-progress');
    const { claudeApiKey, geminiApiKey } = getSettings();

    if (!claudeApiKey && !geminiApiKey) {
      progressEl.style.display = 'block';
      progressEl.innerHTML = `<div class="status-bar error">API key missing — add Anthropic or Gemini key in ⚙ Settings.</div>`;
      return;
    }

    genAllBtn.disabled = true;
    genAllBtn.innerHTML = '<span class="loader"></span> Generating…';
    progressEl.style.display = 'block';

    for (let i = 0; i < cur.chapters.length; i++) {
      const ch        = cur.chapters[i];
      const maxTokens = TOKENS_BY_DURATION[ch.duration_mins] || 4500;

      progressEl.innerHTML = batchProgressHtml(i, cur.chapters.length, `Generating Chapter ${ch.number}: ${ch.title}…`);
      updateStatusIcon(container, ch.number, '🔄');
      saveChapterData(ch.number, { ...(getChapterData(ch.number) || {}), status: 'generating' });

      try {
        const script = await generateFullScript(buildBatchPrompt(ch, cur), claudeApiKey, maxTokens);
        const words  = script.trim().split(/\s+/).filter(Boolean).length;
        const mins   = Math.round(words / 150);

        saveChapterData(ch.number, { script, status: 'ready', generatedAt: Date.now() });
        refreshChapterStatuses(container, cur);
        progressEl.innerHTML = batchProgressHtml(i + 1, cur.chapters.length,
          `✅ Chapter ${ch.number} done — ${words.toLocaleString()} words · ~${mins} min`);

      } catch (e) {
        saveChapterData(ch.number, { ...(getChapterData(ch.number) || {}), status: 'not_started' });
        updateStatusIcon(container, ch.number, '❌');
        progressEl.innerHTML = batchProgressHtml(i, cur.chapters.length,
          `❌ Chapter ${ch.number} failed: ${esc(e.message)}`);
      }

      if (i < cur.chapters.length - 1) {
        for (let s = 5; s > 0; s--) {
          progressEl.innerHTML = batchProgressHtml(i + 1, cur.chapters.length,
            `⏳ Waiting ${s}s before Chapter ${ch.number + 1}…`);
          await delay(1000);
        }
      }
    }

    progressEl.innerHTML = batchProgressHtml(cur.chapters.length, cur.chapters.length,
      `🎉 All ${cur.chapters.length} scripts generated!`);
    genAllBtn.disabled = false;
    genAllBtn.innerHTML = '⚡ Generate All Scripts';
    onReady && onReady();
  });

  // Listen for status updates
  window.addEventListener('chapter-updated', () => {
    refreshChapterStatuses(container, cur);
  });
}

// ── Coverage Matrix ───────────────────────────────────────────────────────────

function buildCoverageMatrixHtml(cur) {
  const coverageMap = cur.coverage_map;
  if (!coverageMap || !Object.keys(coverageMap).length) return '';

  const isCert = cur.course_type === 'certification';
  const title  = isCert ? '📊 Exam Coverage Matrix' : '📊 Syllabus Coverage';

  const domains = Object.keys(coverageMap);
  const totalDomains = domains.length;
  const coveredDomains = domains.filter(d => (coverageMap[d] || []).length > 0).length;
  const overallPct = Math.round((coveredDomains / totalDomains) * 100);

  const rowsHtml = domains.map(domain => {
    const chapters = coverageMap[domain] || [];
    const covered  = chapters.length > 0;
    const pct      = covered ? 100 : 0;
    const fillColor = covered ? '#16a34a' : '#dc2626';
    const chStr    = chapters.length ? `Ch ${chapters.join(', ')}` : 'Not covered';

    return `
      <div class="coverage-row">
        <div class="coverage-icon">${covered ? '✅' : '❌'}</div>
        <div class="coverage-domain">${esc(domain)}</div>
        <div class="coverage-bar-wrap">
          <div class="coverage-bar-bg">
            <div class="coverage-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
          </div>
        </div>
        <div class="coverage-chapters" style="color:${covered ? 'var(--muted)' : '#dc2626'};">${esc(chStr)}</div>
      </div>`;
  }).join('');

  const overallIcon  = overallPct === 100 ? '✅' : overallPct >= 80 ? '⚠️' : '❌';
  const overallColor = overallPct === 100 ? '#16a34a' : overallPct >= 80 ? '#d97706' : '#dc2626';

  return `
    <div class="coverage-matrix" style="margin-bottom:20px;">
      <div class="coverage-matrix-hdr">${title}</div>
      ${rowsHtml}
      <div class="coverage-footer" style="color:${overallColor};">
        ${overallIcon} Overall Coverage: ${overallPct}% — ${coveredDomains} of ${totalDomains} domains covered
      </div>
    </div>`;
}

// ── Chapter card ──────────────────────────────────────────────────────────────

function chapterCardHtml(ch, i, cur) {
  const data   = getChapterData(ch.number);
  const status = data?.status || 'not_started';
  const icons  = {
    not_started: '⬜', generating: '🔄', ready: '✅', rendered: '🎬', published: '📤',
  };

  let wordStr = '';
  if ((status === 'ready' || status === 'rendered' || status === 'published') && data?.script) {
    const words = data.script.trim().split(/\s+/).filter(Boolean).length;
    const mins  = Math.round(words / 150);
    wordStr = `${words.toLocaleString()} words · ~${mins} min`;
  }

  // Exam domains or syllabus topics indicator
  let domainsHtml = '';
  if (cur.course_type === 'certification' && ch.exam_domains_covered?.length) {
    const tags = ch.exam_domains_covered.map(d => `<span class="exam-domain-tag">${esc(d)}</span>`).join('');
    domainsHtml = `<div style="margin-top:4px;font-size:.75rem;color:var(--muted);">📋 Covers: ${tags}</div>`;
  } else if (cur.course_type === 'custom_syllabus' && ch.topics_covered?.length) {
    const preview = ch.topics_covered.slice(0, 3).map(t => `<span class="exam-domain-tag">${esc(t)}</span>`).join('');
    const more = ch.topics_covered.length > 3 ? `<span style="font-size:.72rem;color:var(--muted);">+${ch.topics_covered.length - 3} more</span>` : '';
    domainsHtml = `<div style="margin-top:4px;font-size:.75rem;color:var(--muted);">📋 Topics: ${preview}${more}</div>`;
  }

  return `
    <div class="chapter-card" id="ch-card-${ch.number}">
      <div class="chapter-num">${ch.number}</div>
      <div class="chapter-info">
        <div class="chapter-title-text">${esc(ch.title)}</div>
        <div class="chapter-subtitle-text">${esc(ch.subtitle || ch.concepts?.join(', ') || '')}</div>
        ${domainsHtml}
        <div id="word-label-${ch.number}" style="font-size:.75rem;color:#16a34a;margin-top:2px;
          ${wordStr ? '' : 'display:none;'}">${esc(wordStr)}</div>
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
    const iconEl = container.querySelector(`#status-icon-${ch.number}`);
    const wordEl = container.querySelector(`#word-label-${ch.number}`);
    if (!iconEl) return;
    const data   = getChapterData(ch.number);
    const status = data?.status || 'not_started';
    iconEl.textContent = icons[status];
    if (wordEl) {
      if (['ready','rendered','published'].includes(status) && data?.script) {
        const words = data.script.trim().split(/\s+/).filter(Boolean).length;
        const mins  = Math.round(words / 150);
        wordEl.textContent = `${words.toLocaleString()} words · ~${mins} min`;
        wordEl.style.display = 'block';
      } else {
        wordEl.style.display = 'none';
      }
    }
  });
}

// ── Batch generation helpers ──────────────────────────────────────────────────

function buildBatchPrompt(ch, cur) {
  const wordTarget  = (ch.duration_mins || 15) * 150;
  const prevChapter = cur.chapters.find(c => c.number === ch.number - 1);
  const isCert      = cur.course_type === 'certification';

  let examSection = '';
  if (isCert) {
    examSection = `
Exam domains covered: ${(ch.exam_domains_covered || []).join(', ')}
Exam tips to include: ${(ch.exam_tips || []).join('; ')}

EXAM PREPARATION REQUIREMENTS:
- After each key concept include a brief exam tip: "Exam Tip: [specific advice about this topic in the exam]"
- Mention common exam traps to avoid for this domain
- End chapter with a Quick Exam Review section covering the most testable points
- Include 2-3 practice questions in exam format with explanations`;
  }

  return `Write a complete video script for Chapter ${ch.number} of "${cur.course_title}".

Chapter: ${ch.title}
Subtitle: ${ch.subtitle || ''}
Concepts to cover: ${(ch.concepts || []).join(', ')}
Hands-on exercise: ${ch.hands_on || ''}
Real world example: ${ch.real_world_example || ''}
Key takeaway: ${ch.key_takeaway || ''}
Duration target: ${ch.duration_mins || 15} minutes (~${wordTarget} words)
${prevChapter ? `Previous chapter: "${prevChapter.title}"` : ''}
${examSection}

Script structure:
1. CHAPTER INTRO (60 seconds): welcome, what we'll learn and why it matters
2. CONCEPT EXPLANATION (30%): real-world analogy first, then technical definition
3. DEMONSTRATION (40%): step-by-step hands-on, explain WHY not just HOW
4. REAL WORLD APPLICATION (15%): where used in production, real tools/companies
5. CHAPTER WRAP UP (15%): recap 3 key things, preview next chapter, CTA

IMPORTANT: No markdown symbols, no brackets, write as spoken aloud, use ... for pauses, always say "you".`;
}

function batchProgressHtml(current, total, message) {
  const pct = Math.round((current / total) * 100);
  return `
    <div style="font-size:.875rem;color:var(--primary);margin-bottom:8px;">${esc(message)}</div>
    <div style="background:#e5e7eb;border-radius:4px;height:6px;overflow:hidden;">
      <div style="background:var(--accent);height:100%;width:${pct}%;transition:width .4s;border-radius:4px;"></div>
    </div>
    <div style="font-size:.78rem;color:var(--muted);margin-top:5px;">${current} of ${total} chapters</div>
  `;
}

function updateStatusIcon(container, n, icon) {
  const el = container.querySelector(`#status-icon-${n}`);
  if (el) el.textContent = icon;
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

// ── Prompt helpers ────────────────────────────────────────────────────────────

function getActiveSystemPrompt() {
  const custom = localStorage.getItem('course_custom_prompt');
  if (custom) return custom;
  return localStorage.getItem('course_active_preset_text') || '';
}

function updatePresetUI(container, activeKey) {
  const preset = PROMPT_PRESETS[activeKey] || PROMPT_PRESETS.default;

  container.querySelectorAll('.preset-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.prompt === activeKey);
  });

  const descEl = container.querySelector('#promptDescription');
  if (descEl) {
    descEl.innerHTML = `
      <div class="prompt-meta">
        <span class="prompt-name">${preset.name}</span>
        <span class="prompt-badge">${preset.badge}</span>
      </div>
      <p class="prompt-desc">${preset.description}</p>
      <div class="prompt-features">
        ${(preset.features || []).map(f => `<span>${f}</span>`).join('')}
      </div>
    `;
  }
}

function cvShowToast(container, message) {
  const statusEl = container.querySelector('#cv-status');
  if (!statusEl) return;
  const prev = statusEl.innerHTML;
  statusEl.innerHTML = `<div class="status-bar info">${esc(message)}</div>`;
  setTimeout(() => { statusEl.innerHTML = prev; }, 2500);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
