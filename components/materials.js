/**
 * materials.js — Tab 6: 📚 Course Materials
 * Practice tests, per-chapter: questions, flashcards, code, cheat sheets.
 * Generates markdown, allows preview, ZIP download, and GitHub push.
 */

import { getSettings, getCurriculum } from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function eh(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function pad(n)    { return String(n).padStart(2,'0'); }
function lget(key) { return localStorage.getItem(key) || ''; }
function lset(key,v){ localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v)); }
function lgetJSON(key){ try{ return JSON.parse(lget(key)); }catch{ return null; } }

const MKEYS = {
  questions:  (id,n) => `course_materials_${id}_ch${n}_questions`,
  flashcards: (id,n) => `course_materials_${id}_ch${n}_flashcards`,
  code:       (id,n) => `course_materials_${id}_ch${n}_code`,
  cheatsheet: (id,n) => `course_materials_${id}_ch${n}_cheatsheet`,
};

const PTKEYS = {
  test:     (id, n) => `course_practice_test_${id}_${n}`,
  attempts: (id, n) => `course_practice_test_attempts_${id}_${n}`,
};

const STATUS = { none:'⬜', generating:'🔄', ready:'✅' };

async function callClaude(apiKey, { system, user, maxTokens = 2500 }) {
  if (typeof window.callAI === 'function') {
    const result = await window.callAI({
      prompt:       user,
      systemPrompt: system,
      maxTokens,
      action:       'materials_gen',
    });
    return result.text;
  }
  // Fallback: direct Anthropic call (ai-client.js not loaded)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e?.error?.message || res.statusText);
  }
  const d = await res.json();
  return (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
}

function parseJSON(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]+?)```/) || text.match(/(\[[\s\S]+\]|\{[\s\S]+\})/);
  if (!m) throw new Error('No JSON found in response.');
  return JSON.parse(m[1]);
}

function getApiKey() {
  const s = getSettings();
  if (!s.claudeApiKey && !s.geminiApiKey) throw new Error('API key not set — add Anthropic or Gemini key in ⚙ Settings.');
  return s.claudeApiKey || '';
}

// ── Public render ─────────────────────────────────────────────────────────────

export function renderMaterials(container) {
  mount(container);
  window.addEventListener('curriculum-updated', () => mount(container));
}

function mount(container) {
  const cur = getCurriculum();

  if (!cur) {
    container.innerHTML = `
      <div class="card">
        <h2>📚 Course Materials</h2>
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <p>Generate a curriculum first, then come back here to create supplementary materials.</p>
        </div>
      </div>`;
    return;
  }

  const s        = getSettings();
  const lang     = s.courseLanguage || 'Python';
  const isCert   = cur.course_type === 'certification';
  const certName = cur.exam_name || '';
  const pt1      = lgetJSON(PTKEYS.test(cur.id, 1));
  const pt2      = lgetJSON(PTKEYS.test(cur.id, 2));

  const gridRows = cur.chapters.map(ch => {
    const qDone = !!lget(MKEYS.questions(cur.id, ch.number));
    const fDone = !!lget(MKEYS.flashcards(cur.id, ch.number));
    const cDone = !!lget(MKEYS.code(cur.id, ch.number));
    const sDone = !!lget(MKEYS.cheatsheet(cur.id, ch.number));
    return `
      <tr class="mat-row" data-chapter="${ch.number}">
        <td class="mat-ch-name">
          <span class="mat-ch-num">${ch.number}</span>
          <span class="mat-ch-title">${esc(ch.title)}</span>
        </td>
        <td class="mat-cell" id="mat-q-${ch.number}">${qDone ? STATUS.ready : STATUS.none}</td>
        <td class="mat-cell" id="mat-f-${ch.number}">${fDone ? STATUS.ready : STATUS.none}</td>
        <td class="mat-cell" id="mat-c-${ch.number}">${cDone ? STATUS.ready : STATUS.none}</td>
        <td class="mat-cell" id="mat-s-${ch.number}">${sDone ? STATUS.ready : STATUS.none}</td>
        <td class="mat-actions">
          <button class="btn btn-outline btn-sm mat-gen-btn" data-chapter="${ch.number}">⚡ Generate</button>
          <button class="btn btn-outline btn-sm mat-preview-btn" data-chapter="${ch.number}">👁 Preview</button>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    ${renderPTPanel(cur, certName, pt1, pt2)}

    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
          <h2 style="margin-bottom:4px;">📚 Chapter Materials</h2>
          <p style="color:var(--muted);font-size:.9rem;margin:0;">Supplementary materials for GitHub · <strong>${esc(lang)}</strong> code examples</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="mat-gen-all-btn">🚀 Generate All Materials</button>
          <button class="btn btn-secondary" id="mat-zip-btn">⬇️ Download ZIP</button>
          <button class="btn btn-secondary" id="mat-github-btn">📤 Push to GitHub</button>
        </div>
      </div>

      <div id="mat-status" style="margin-bottom:12px;"></div>
      <div id="mat-repo-link" style="display:none;margin-bottom:12px;"></div>

      <div class="mat-grid-wrap">
        <table class="mat-grid">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;">Chapter</th>
              <th class="mat-col-hdr" title="Practice Questions">❓ Questions</th>
              <th class="mat-col-hdr" title="Flashcards">🃏 Flashcards</th>
              <th class="mat-col-hdr" title="Code Examples">💻 Code</th>
              <th class="mat-col-hdr" title="Cheat Sheet">📄 Cheat Sheet</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${gridRows}</tbody>
        </table>
      </div>

      <div id="mat-preview-panel" style="display:none;margin-top:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <h3 id="mat-preview-title" style="margin:0;font-size:1rem;font-family:'Poppins',sans-serif;"></h3>
          <div style="display:flex;gap:6px;margin-left:auto;">
            <button class="btn btn-outline btn-sm" id="mat-preview-copy">📋 Copy</button>
            <button class="btn btn-outline btn-sm" id="mat-preview-download">⬇ Download</button>
            <button class="btn btn-outline btn-sm" id="mat-preview-close">✕ Close</button>
          </div>
        </div>
        <textarea id="mat-preview-content" style="width:100%;min-height:400px;resize:vertical;
          border:1px solid var(--border);border-radius:var(--radius);padding:14px;
          font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.6;
          background:var(--surface);color:var(--text);" readonly></textarea>
      </div>

      <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-weight:600;font-size:.9rem;">📄 README.md (auto-generated)</span>
          <button class="btn btn-outline btn-sm" id="mat-readme-preview-btn">Preview</button>
        </div>
        <p style="font-size:.85rem;color:var(--muted);margin:0;">
          A professional README is included in the ZIP with course overview, how-to-use guide, and chapter video links.
        </p>
      </div>
    </div>

    <!-- Archive section -->
    <div class="card" id="archive-section">
      <h3 style="margin-bottom:6px;">📦 Archive Complete Course</h3>
      <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px;">
        Create a dated ZIP archive of all videos, scripts, materials, and configs.
      </p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;padding:12px;
          background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);">
          <span style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;
            display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">1</span>
          <span style="font-size:.88rem;flex:1;">Export course data (scripts + materials)</span>
          <button class="btn btn-secondary btn-sm" id="mat-export-btn">📤 Export</button>
        </div>
        <div style="display:flex;align-items:center;gap:14px;padding:12px;
          background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);">
          <span style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;
            display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">2</span>
          <span style="font-size:.88rem;flex:1;">Run archive script in terminal</span>
          <code style="font-size:.8rem;background:var(--surface);border:1px solid var(--border);
            padding:4px 10px;border-radius:4px;">node archive.js</code>
        </div>
        <div style="display:flex;align-items:center;gap:14px;padding:12px;
          background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);">
          <span style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;
            display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">3</span>
          <span style="font-size:.88rem;flex:1;">Find ZIP in exports/ folder</span>
          <code style="font-size:.8rem;background:var(--surface);border:1px solid var(--border);
            padding:4px 10px;border-radius:4px;">open ~/course-pipeline/exports/</code>
        </div>
      </div>
      <div id="mat-archive-status" style="margin-top:10px;font-size:.82rem;color:var(--muted);"></div>
    </div>

    <!-- Practice Test Full-screen Modal -->
    <div id="pt-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;overflow-y:auto;padding:20px;">
      <div id="pt-modal-inner" style="margin:0 auto;max-width:880px;background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.4);"></div>
    </div>

    <style>
      .mat-grid-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
      .mat-grid { width:100%; border-collapse:collapse; font-size:.88rem; }
      .mat-grid th { background:var(--surface2); font-weight:600; font-size:.78rem;
        text-transform:uppercase; letter-spacing:.04em; color:var(--muted); border-bottom:1px solid var(--border); }
      .mat-grid td { padding:8px 12px; border-bottom:1px solid var(--border); }
      .mat-grid tr:last-child td { border-bottom:none; }
      .mat-col-hdr { text-align:center; padding:8px 12px; min-width:88px; }
      .mat-cell { text-align:center; font-size:1rem; }
      .mat-ch-name { display:flex; align-items:center; gap:8px; max-width:260px; }
      .mat-ch-num { background:var(--primary); color:#fff; font-family:'Poppins',sans-serif;
        font-size:.72rem; font-weight:700; border-radius:4px; padding:2px 7px; flex-shrink:0; }
      .mat-ch-title { font-size:.85rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .mat-actions { display:flex; gap:6px; justify-content:flex-end; white-space:nowrap; }
      .mat-gen-btn, .mat-preview-btn { font-size:.78rem !important; }
      /* Practice Test Card */
      .pt-test-card { flex:1; min-width:220px; border:1.5px solid var(--border); border-radius:10px; padding:16px; background:var(--surface2); }
      .pt-test-card.has-test { border-color:#16a34a; }
      /* Practice Test Modal */
      .pt-q-block { padding:20px 24px; border-bottom:1px solid var(--border); }
      .pt-q-block:last-child { border-bottom:none; }
      .pt-option { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; margin:6px 0;
        border:1.5px solid var(--border); border-radius:8px; cursor:pointer; transition:all .15s; }
      .pt-option:hover { border-color:var(--accent); background:#fde8ec10; }
      .pt-option.selected { border-color:var(--accent); background:#fde8ec20; }
      .pt-option.correct-answer { border-color:#16a34a !important; background:#f0fdf4 !important; }
      .pt-option.wrong-answer { border-color:#dc2626 !important; background:#fef2f2 !important; }
      .pt-explanation { margin-top:12px; padding:12px; background:var(--surface2); border-radius:8px; font-size:.85rem; line-height:1.6; display:none; }
    </style>
  `;

  // ── Wire practice test buttons ───────────────────────────────────────────────
  container.querySelector('#pt-gen-both-btn')?.addEventListener('click', () => genBothPracticeTests(container, cur, certName));
  container.querySelector('#pt-gen-1-btn')?.addEventListener('click', () => genOnePracticeTest(container, cur, certName, 1));
  container.querySelector('#pt-gen-2-btn')?.addEventListener('click', () => genOnePracticeTest(container, cur, certName, 2));
  for (let t = 1; t <= 2; t++) {
    container.querySelector(`#pt-preview-${t}`)?.addEventListener('click', () => {
      const test = lgetJSON(PTKEYS.test(cur.id, t));
      if (test) showPTModal(container, cur, test);
    });
    container.querySelector(`#pt-download-${t}`)?.addEventListener('click', () => downloadPracticeTest(cur, t));
    container.querySelector(`#pt-push-${t}`)?.addEventListener('click', () => pushPracticeTest(container, cur, t));
  }
  container.querySelector('#pt-modal')?.addEventListener('click', e => {
    if (e.target.id === 'pt-modal') e.target.style.display = 'none';
  });

  // ── Wire chapter material buttons ────────────────────────────────────────────
  container.querySelector('#mat-gen-all-btn').addEventListener('click', () => genAll(container, cur, lang, isCert, certName));
  container.querySelector('#mat-zip-btn').addEventListener('click', () => downloadZip(container, cur));
  container.querySelector('#mat-github-btn').addEventListener('click', () => pushToGitHub(container, cur));
  container.querySelector('#mat-export-btn')?.addEventListener('click', () => {
    // Trigger the same export as Settings tab — dispatch to app.js helper via custom event
    // The app-level exportCourseData is not importable here, so we emit a custom event.
    window.dispatchEvent(new CustomEvent('course-export-requested'));
    const archiveStatus = container.querySelector('#mat-archive-status');
    if (archiveStatus) archiveStatus.textContent = 'Opening Settings tab for export…';
  });
  window.addEventListener('course-export-done', (e) => {
    const archiveStatus = container.querySelector('#mat-archive-status');
    if (archiveStatus) archiveStatus.textContent = e.detail?.msg || '✅ Exported! Run: node archive.js';
  }, { once: false });
  container.querySelector('#mat-readme-preview-btn').addEventListener('click', () => showPreview(container, 'README.md', generateReadme(cur), 'README.md'));
  container.querySelector('#mat-preview-close').addEventListener('click', () => {
    container.querySelector('#mat-preview-panel').style.display = 'none';
  });
  const savedRepoUrl = lget(`course_github_url_${cur.id}`);
  if (savedRepoUrl) showRepoLink(container, savedRepoUrl);

  container.querySelectorAll('.mat-gen-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const n  = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      if (ch) await genChapterAll(container, cur, ch, lang, isCert, certName);
    });
  });
  container.querySelectorAll('.mat-preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n  = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      if (ch) showChapterPreview(container, cur, ch);
    });
  });
}

// ── Practice Test Panel HTML ──────────────────────────────────────────────────

function renderPTPanel(cur, certName, pt1, pt2) {
  function testCard(t, test) {
    const attempts    = lgetJSON(PTKEYS.attempts(cur.id, t)) || [];
    const attemptsHtml = attempts.map((a, i) => {
      const icon = a.passed ? '✅' : '❌';
      const d    = new Date(a.date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      return `<div style="font-size:.72rem;color:${a.passed?'#16a34a':'#dc2626'};">
        ${icon} Attempt ${i+1}: ${a.percentage}% (${a.score}/${a.total}) — ${d}
      </div>`;
    }).join('');

    if (!test) {
      return `
        <div class="pt-test-card" id="pt-card-${t}">
          <div style="font-weight:700;font-size:1rem;margin-bottom:8px;color:var(--primary);">Practice Test ${t}</div>
          <div style="font-size:.83rem;color:var(--muted);line-height:1.9;margin-bottom:12px;">
            📝 55 Questions<br>⏱️ 90 minutes<br>🎯 Passing: 700/1000 (70%)
          </div>
          <div style="padding:10px;background:white;border-radius:6px;border:1px dashed var(--border);
              text-align:center;color:var(--muted);font-size:.82rem;margin-bottom:12px;">
            ⬜ Not generated yet
          </div>
          <button class="btn btn-primary btn-sm" id="pt-gen-${t}-btn" style="width:100%;">✨ Generate Test ${t}</button>
        </div>`;
    }

    const questions     = test.questions || [];
    const domainEntries = Object.entries(test.domain_breakdown || {});
    const totalQ        = test.total_questions || questions.length || 55;
    const easy          = questions.filter(q => q.difficulty === 'easy').length;
    const medium        = questions.filter(q => q.difficulty === 'medium').length;
    const hard          = questions.filter(q => q.difficulty === 'hard').length;

    return `
      <div class="pt-test-card has-test" id="pt-card-${t}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="font-weight:700;font-size:1rem;color:var(--primary);">Practice Test ${t}</span>
          <span style="color:#16a34a;">✅</span>
        </div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:10px;">
          ${totalQ} Questions · ${test.time_limit_minutes||90} min · Passing: ${test.passing_score||700}/1000
        </div>

        <div style="font-size:.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Domain Breakdown</div>
        ${domainEntries.map(([domain, count]) => {
          const pct = Math.round((count / totalQ) * 100);
          const short = domain.length > 22 ? domain.slice(0,20) + '…' : domain;
          return `<div style="margin-bottom:5px;">
            <div style="display:flex;justify-content:space-between;font-size:.71rem;margin-bottom:2px;">
              <span title="${esc(domain)}" style="color:var(--text);">${esc(short)}</span>
              <span style="color:var(--muted);">${count}q</span>
            </div>
            <div style="height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:var(--accent);opacity:.75;border-radius:3px;"></div>
            </div>
          </div>`;
        }).join('')}

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin:10px 0;">
          ${[['Easy','#16a34a',easy],['Medium','#d97706',medium],['Hard','#dc2626',hard]].map(([lbl,col,cnt]) =>
            `<div style="text-align:center;padding:6px 2px;background:${col}18;border-radius:6px;">
              <div style="font-size:.95rem;font-weight:700;color:${col};">${cnt}</div>
              <div style="font-size:.67rem;color:var(--muted);">${lbl}</div>
            </div>`
          ).join('')}
        </div>

        ${attemptsHtml ? `<div style="margin-bottom:8px;">${attemptsHtml}</div>` : ''}

        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="pt-preview-${t}" style="flex:1;">📋 Take Test</button>
          <button class="btn btn-secondary btn-sm" id="pt-download-${t}" title="Download markdown">⬇</button>
          <button class="btn btn-secondary btn-sm" id="pt-push-${t}" title="Push to GitHub">📤</button>
          <button class="btn btn-outline btn-sm" id="pt-gen-${t}-btn" title="Regenerate" style="font-size:.7rem;padding:4px 8px;">↺</button>
        </div>
      </div>`;
  }

  return `
    <div class="card" id="pt-section">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 style="margin-bottom:4px;">📝 Full Practice Tests</h2>
          <p style="color:var(--muted);font-size:.88rem;margin:0;">
            ${certName ? `${esc(certName)} — ` : ''}2 complete exams · 55 questions · 90 minutes · AI-generated
          </p>
        </div>
        <button class="btn btn-primary" id="pt-gen-both-btn">🚀 Generate Both Tests</button>
      </div>
      <div id="pt-status" style="margin-bottom:12px;"></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${testCard(1, pt1)}
        ${testCard(2, pt2)}
      </div>
    </div>`;
}

// ── Domain distribution ───────────────────────────────────────────────────────

function calculateDomainDistribution(chapters, totalQ) {
  const domains = {};
  chapters.forEach(ch => {
    const domain = ch.exam_domain || ch.title;
    const weight = parseFloat((ch.exam_weight || '10%').replace('%','').split('-')[0]) || 10;
    if (!domains[domain]) domains[domain] = { weight: 0 };
    domains[domain].weight += weight;
  });
  const totalWeight = Object.values(domains).reduce((s, d) => s + d.weight, 0) || 1;
  const entries = Object.entries(domains);
  let assigned = 0;
  const distributed = {};
  entries.forEach(([domain, data], i) => {
    const q = i === entries.length - 1
      ? totalQ - assigned
      : Math.round((data.weight / totalWeight) * totalQ);
    distributed[domain] = Math.max(1, q);
    assigned += distributed[domain];
  });
  return distributed;
}

// ── Practice Test Generation ──────────────────────────────────────────────────

const PT_SYSTEM = `You are a certified exam author who writes official certification practice tests.

STRICT RULES:
1. Every question must be exam-quality — plausible wrong answers, not obviously incorrect
2. Scenario-based questions (40%) must describe a REAL business situation
3. Questions must test SPECIFIC knowledge, not vague concepts
4. Wrong answers must represent common misconceptions
5. NO trick questions — test knowledge not wordplay
6. Each question maps to exactly one exam domain
7. Difficulty distribution: 30% Easy, 50% Medium, 20% Hard

Return ONLY a valid JSON array. No markdown, no extra text, just the JSON array.`;

function ptQuestionFormat(prefix) {
  return `Each object in the array must match exactly:
{"id":"${prefix}-001","domain":"domain name","domain_weight":"20%","difficulty":"easy|medium|hard","type":"scenario|service_selection|configuration|conceptual","question":"full question text","options":{"A":"option","B":"option","C":"option","D":"option"},"correct":"B","explanation":{"correct":"Why B is correct","A":"Why A is wrong","C":"Why C is wrong","D":"Why D is wrong"},"exam_tip":"what this tests","commonly_missed":true}`;
}

async function genOnePracticeTest(container, cur, certName, testNum) {
  const ptStatus = container.querySelector('#pt-status');
  const genBtn   = container.querySelector(`#pt-gen-${testNum}-btn`);
  const bothBtn  = container.querySelector('#pt-gen-both-btn');
  if (genBtn)  { genBtn.disabled  = true; genBtn.textContent  = '⏳ Generating…'; }
  if (bothBtn) bothBtn.disabled = true;
  if (ptStatus) ptStatus.innerHTML = `<div class="status-bar info">🤖 Generating Practice Test ${testNum} (this takes 30-60s)…</div>`;

  try {
    const test = await genPracticeTest(cur, certName, testNum);
    lset(PTKEYS.test(cur.id, testNum), test);
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar success">✅ Practice Test ${testNum} generated — ${test.questions.length} questions ready!</div>`;
    setTimeout(() => { if (ptStatus) ptStatus.innerHTML = ''; }, 4000);
    mount(container); // remount to show updated card
  } catch (e) {
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar error">❌ ${esc(e.message)}</div>`;
    if (genBtn)  { genBtn.disabled  = false; genBtn.textContent  = `✨ Generate Test ${testNum}`; }
    if (bothBtn) bothBtn.disabled = false;
  }
}

async function genBothPracticeTests(container, cur, certName) {
  const ptStatus = container.querySelector('#pt-status');
  const bothBtn  = container.querySelector('#pt-gen-both-btn');
  if (bothBtn) { bothBtn.disabled = true; bothBtn.textContent = '⏳ Generating…'; }

  for (let t = 1; t <= 2; t++) {
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar info">🤖 Generating Practice Test ${t}/2 (30-60s each)…</div>`;
    try {
      const test = await genPracticeTest(cur, certName, t);
      lset(PTKEYS.test(cur.id, t), test);
    } catch (e) {
      if (ptStatus) ptStatus.innerHTML = `<div class="status-bar error">❌ Test ${t} failed: ${esc(e.message)}</div>`;
      if (bothBtn) { bothBtn.disabled = false; bothBtn.textContent = '🚀 Generate Both Tests'; }
      return;
    }
    if (t < 2) await new Promise(r => setTimeout(r, 800));
  }

  if (ptStatus) ptStatus.innerHTML = `<div class="status-bar success">✅ Both practice tests generated!</div>`;
  setTimeout(() => { if (ptStatus) ptStatus.innerHTML = ''; }, 4000);
  mount(container);
}

async function genPracticeTest(cur, certName, testNum) {
  const apiKey     = getApiKey();
  const domainDist = calculateDomainDistribution(cur.chapters, 55);
  const entries    = Object.entries(domainDist);
  const half       = Math.ceil(entries.length / 2);
  const batch1     = entries.slice(0, half);
  const batch2     = entries.slice(half);
  const b1Total    = batch1.reduce((s,[,q]) => s + q, 0);
  const b2Total    = batch2.reduce((s,[,q]) => s + q, 0);
  const chapInfo   = cur.chapters.map(ch =>
    `- Chapter ${ch.number}: ${ch.title} (Domain: ${ch.exam_domain || ch.title}, Weight: ${ch.exam_weight || '10%'})`
  ).join('\n');
  const extraNote  = testNum === 2
    ? '\n\nThis is Practice Test 2. Generate COMPLETELY DIFFERENT questions from Test 1. Focus more on scenario-based and harder questions. Include more edge cases and common exam traps.'
    : '';

  const makeUserMsg = (batchDomains, startId, batchTotal) =>
    `Generate exactly ${batchTotal} questions for Practice Test ${testNum} of: ${certName || cur.course_title}

Course chapters:
${chapInfo}

Generate questions for ONLY these domains (${batchTotal} total):
${batchDomains.map(([d,q]) => `${d}: ${q} questions`).join('\n')}

Start IDs at PT${testNum}-${String(startId).padStart(3,'0')}.

${ptQuestionFormat(`PT${testNum}`)}${extraNote}`;

  const [raw1, raw2] = await Promise.all([
    callClaude(apiKey, { system: PT_SYSTEM, user: makeUserMsg(batch1, 1, b1Total), maxTokens: 8000 }),
    callClaude(apiKey, { system: PT_SYSTEM, user: makeUserMsg(batch2, b1Total + 1, b2Total), maxTokens: 8000 }),
  ]);

  const q1 = parseJSON(raw1);
  const q2 = parseJSON(raw2);
  const allQ = [...q1, ...q2];

  // Fisher-Yates shuffle
  for (let i = allQ.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
  }

  return {
    test_number: testNum,
    cert_name: certName || cur.course_title,
    total_questions: allQ.length,
    time_limit_minutes: 90,
    passing_score: 700,
    passing_percentage: '70%',
    generated_date: new Date().toISOString(),
    domain_breakdown: domainDist,
    questions: allQ,
  };
}

// ── Practice Test Modal (interactive) ─────────────────────────────────────────

function showPTModal(container, cur, test) {
  const modal      = container.querySelector('#pt-modal');
  const modalInner = container.querySelector('#pt-modal-inner');
  const questions  = test.questions || [];
  const attempts   = lgetJSON(PTKEYS.attempts(cur.id, test.test_number)) || [];

  const attemptsHtml = attempts.length
    ? `<div style="margin-bottom:12px;">
        <div style="font-size:.78rem;font-weight:600;color:var(--muted);margin-bottom:4px;">Previous Attempts</div>
        ${attempts.map((a,i) => `<div style="font-size:.78rem;color:${a.passed?'#16a34a':'#dc2626'};">
          ${a.passed?'✅':'❌'} Attempt ${i+1}: ${a.score}/${a.total} (${a.percentage}%) — ${new Date(a.date).toLocaleDateString()}
        </div>`).join('')}
      </div>`
    : '';

  modalInner.innerHTML = `
    <div style="background:var(--primary);color:white;padding:20px 24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="margin:0;font-size:1.2rem;">${esc(test.cert_name)} — Practice Test ${test.test_number}</h2>
          <div style="font-size:.85rem;opacity:.85;margin-top:4px;">
            ⏱️ ${test.time_limit_minutes} minutes &nbsp;·&nbsp; 📝 ${questions.length} questions &nbsp;·&nbsp; 🎯 Passing: ${test.passing_score}/1000
          </div>
        </div>
        <button id="pt-modal-close" style="background:rgba(255,255,255,.2);border:none;color:white;
            border-radius:6px;padding:6px 12px;cursor:pointer;font-size:.9rem;">✕ Close</button>
      </div>
      <div style="font-size:.82rem;opacity:.75;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);">
        Read each question carefully. Choose the BEST answer.
        Some questions have multiple plausible options — select the one that best meets all requirements.
      </div>
    </div>
    ${attemptsHtml ? `<div style="padding:12px 24px;background:#f9fafb;border-bottom:1px solid var(--border);">${attemptsHtml}</div>` : ''}
    <div id="pt-questions-list">
      ${questions.map((q, i) => `
        <div class="pt-q-block" id="pt-q-block-${i}">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
            <span style="font-size:.78rem;font-weight:700;background:var(--primary);color:white;
                border-radius:4px;padding:2px 8px;white-space:nowrap;">Q${i+1}</span>
            <span style="font-size:.75rem;color:var(--muted);padding-top:2px;">${esc(q.domain||'')}</span>
            <span style="font-size:.72rem;padding:1px 7px;border-radius:10px;margin-left:auto;white-space:nowrap;
                background:${q.difficulty==='easy'?'#dcfce7':q.difficulty==='hard'?'#fee2e2':'#fef9c3'};
                color:${q.difficulty==='easy'?'#16a34a':q.difficulty==='hard'?'#dc2626':'#d97706'};">
              ${q.difficulty||'medium'}
            </span>
          </div>
          <div style="font-size:.95rem;line-height:1.65;margin-bottom:14px;color:var(--text);">${esc(q.question||'')}</div>
          <div class="pt-options" data-qindex="${i}">
            ${Object.entries(q.options||{}).map(([key, val]) => `
              <div class="pt-option" data-key="${key}" data-qindex="${i}"
                  style="cursor:pointer;display:flex;align-items:flex-start;gap:10px;padding:10px 14px;
                  margin:6px 0;border:1.5px solid var(--border);border-radius:8px;transition:all .15s;">
                <span style="font-weight:700;font-size:.88rem;color:var(--accent);flex-shrink:0;min-width:16px;">${key}</span>
                <span style="font-size:.9rem;line-height:1.5;">${esc(val)}</span>
              </div>
            `).join('')}
          </div>
          <div class="pt-explanation" id="pt-exp-${i}" style="display:none;margin-top:12px;padding:12px;
              background:var(--surface2);border-radius:8px;font-size:.85rem;line-height:1.6;"></div>
        </div>
      `).join('')}
    </div>
    <div style="padding:20px 24px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;background:var(--surface2);">
      <button id="pt-submit-btn" class="btn btn-primary" style="flex:1;">📊 Submit & Grade Test</button>
      <button id="pt-answer-key-btn" class="btn btn-secondary">🔑 Show Answer Key</button>
    </div>
    <div id="pt-results" style="display:none;padding:20px 24px;"></div>
  `;

  modal.style.display = '';

  // Close button
  modalInner.querySelector('#pt-modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Track selections
  const selections = {};
  modalInner.querySelectorAll('.pt-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const qi  = opt.dataset.qindex;
      const key = opt.dataset.key;
      selections[qi] = key;
      // Update visual selection within this question
      modalInner.querySelectorAll(`.pt-option[data-qindex="${qi}"]`).forEach(o => {
        o.style.borderColor = o.dataset.key === key ? '#e94560' : 'var(--border)';
        o.style.background  = o.dataset.key === key ? '#fde8ec20' : '';
      });
    });
  });

  // Submit
  modalInner.querySelector('#pt-submit-btn').addEventListener('click', () => {
    const result = gradeTest(test, selections);
    savePTAttempt(cur, test.test_number, result);
    showTestResults(modalInner, test, selections, result, container, cur);
  });

  // Answer Key
  modalInner.querySelector('#pt-answer-key-btn').addEventListener('click', () => {
    questions.forEach((q, i) => {
      const expEl = modalInner.querySelector(`#pt-exp-${i}`);
      if (!expEl) return;
      expEl.style.display = '';
      expEl.innerHTML = buildExplanationHtml(q, null);
      // Mark correct option
      modalInner.querySelectorAll(`.pt-option[data-qindex="${i}"]`).forEach(opt => {
        if (opt.dataset.key === q.correct) {
          opt.style.borderColor = '#16a34a';
          opt.style.background  = '#f0fdf4';
        }
      });
    });
    modalInner.querySelector('#pt-answer-key-btn').textContent = '✅ Answer Key Shown';
    modalInner.querySelector('#pt-answer-key-btn').disabled = true;
  });
}

function buildExplanationHtml(q, userAnswer) {
  const expObj  = q.explanation || {};
  const correct = q.correct;
  let html = `<div style="font-weight:600;color:#16a34a;margin-bottom:6px;">✅ Correct Answer: ${esc(correct)}</div>`;
  html += `<div style="margin-bottom:6px;">${esc(expObj.correct || expObj[correct] || '')}</div>`;
  if (q.exam_tip) {
    html += `<div style="margin-top:8px;padding:6px 10px;background:#fef9c3;border-radius:5px;font-size:.82rem;color:#78350f;">
      💡 Exam Tip: ${esc(q.exam_tip)}
    </div>`;
  }
  if (userAnswer && userAnswer !== correct) {
    const wrongExp = expObj[userAnswer] || '';
    if (wrongExp) html += `<div style="margin-top:6px;color:#dc2626;font-size:.83rem;">❌ Why ${esc(userAnswer)} is wrong: ${esc(wrongExp)}</div>`;
  }
  return html;
}

function gradeTest(test, selections) {
  const questions = test.questions || [];
  let score = 0;
  const wrongIds  = [];
  const domScores = {};

  questions.forEach((q, i) => {
    const domain = q.domain || 'Unknown';
    if (!domScores[domain]) domScores[domain] = { correct: 0, total: 0 };
    domScores[domain].total++;
    if (selections[String(i)] === q.correct) {
      score++;
      domScores[domain].correct++;
    } else {
      wrongIds.push(q.id || `PT${test.test_number}-${String(i+1).padStart(3,'0')}`);
    }
  });

  const total      = questions.length;
  const pct        = Math.round((score / total) * 100);
  const scaledScore = Math.round((score / total) * 1000);
  const passed     = scaledScore >= (test.passing_score || 700);

  return { date: new Date().toISOString(), score, total, percentage: pct, scaled_score: scaledScore, passed, domain_scores: domScores, wrong_questions: wrongIds };
}

function savePTAttempt(cur, testNum, result) {
  const key      = PTKEYS.attempts(cur.id, testNum);
  const attempts = lgetJSON(key) || [];
  attempts.push(result);
  lset(key, attempts);
}

function showTestResults(modalInner, test, selections, result, container, cur) {
  const questions    = test.questions || [];
  const domBreakdown = Object.entries(result.domain_scores || {}).map(([domain, s]) => {
    const pct    = Math.round((s.correct / s.total) * 100);
    const needs  = pct < 70 ? ' <span style="color:#d97706;font-size:.75rem;">— review needed</span>' : '';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;font-size:.83rem;">
      <span style="flex:1;color:var(--text);" title="${esc(domain)}">${esc(domain.length > 28 ? domain.slice(0,26)+'…' : domain)}</span>
      <span style="color:var(--muted);">${s.correct}/${s.total} (${pct}%)${needs}</span>
    </div>`;
  }).join('');

  // Chapters to review (those whose domain had < 70%)
  const weakDomains = Object.entries(result.domain_scores || {}).filter(([,s]) => (s.correct/s.total) < 0.7).map(([d]) => d);
  const reviewChapters = (cur?.chapters || []).filter(ch => weakDomains.includes(ch.exam_domain || ch.title));
  const reviewHtml = reviewChapters.length
    ? `<div style="margin-top:10px;">
        <div style="font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:5px;">📚 Recommended Review:</div>
        ${reviewChapters.map(ch => `<div style="font-size:.82rem;color:var(--text);padding:3px 0;">
          · Chapter ${ch.number}: ${esc(ch.title)}
        </div>`).join('')}
      </div>`
    : '';

  const resultsEl = modalInner.querySelector('#pt-results');
  resultsEl.style.display = '';
  resultsEl.innerHTML = `
    <div style="text-align:center;padding:16px 0 20px;">
      <div style="font-size:2.5rem;font-weight:800;color:${result.passed?'#16a34a':'#dc2626'};">
        ${result.score}/${result.total}
      </div>
      <div style="font-size:1.1rem;color:var(--muted);">${result.percentage}% — Scaled: ${result.scaled_score}/1000</div>
      <div style="font-size:1.2rem;margin-top:8px;font-weight:600;color:${result.passed?'#16a34a':'#dc2626'};">
        ${result.passed ? '🎉 PASS — Well done!' : '❌ FAIL — Keep studying'}
      </div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;">
      <div style="font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;">Domain Breakdown</div>
      ${domBreakdown}
      ${reviewHtml}
    </div>`;

  // Highlight right/wrong options in the question list
  questions.forEach((q, i) => {
    const userAns = selections[String(i)];
    modalInner.querySelectorAll(`.pt-option[data-qindex="${i}"]`).forEach(opt => {
      if (opt.dataset.key === q.correct) {
        opt.style.borderColor = '#16a34a';
        opt.style.background  = '#f0fdf4';
      } else if (opt.dataset.key === userAns) {
        opt.style.borderColor = '#dc2626';
        opt.style.background  = '#fef2f2';
      }
    });
    if (userAns && userAns !== q.correct) {
      const expEl = modalInner.querySelector(`#pt-exp-${i}`);
      if (expEl) {
        expEl.style.display = '';
        expEl.innerHTML = buildExplanationHtml(q, userAns);
      }
    }
  });

  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Practice Test Markdown Export ─────────────────────────────────────────────

function ptToMarkdown(test) {
  const questions = test.questions || [];
  const domList   = Object.entries(test.domain_breakdown || {})
    .map(([d, q]) => `| ${d} | ${q} | /11 |`).join('\n');

  return `# ${esc(test.cert_name)} — Practice Test ${test.test_number}

> **Time Limit:** ${test.time_limit_minutes} minutes
> **Questions:** ${test.total_questions}
> **Passing Score:** ${test.passing_score}/1000 (${test.passing_percentage})
> **Generated:** ${new Date(test.generated_date).toLocaleDateString()}

---

## Instructions

- Read each question carefully
- Choose the BEST answer
- All questions are equally weighted
- Do not spend too long on any single question

---

## Questions

${questions.map((q, i) => `### Question ${i + 1}
**Domain:** ${q.domain || ''} | **Difficulty:** ${q.difficulty || 'medium'}

${q.question}

- A) ${(q.options||{}).A || ''}
- B) ${(q.options||{}).B || ''}
- C) ${(q.options||{}).C || ''}
- D) ${(q.options||{}).D || ''}

<details>
<summary>📖 Answer & Explanation</summary>

**Correct Answer: ${q.correct}**

${(q.explanation||{})[q.correct] || (q.explanation||{}).correct || ''}

${Object.entries(q.explanation || {}).filter(([k]) => k !== 'correct' && k !== q.correct && 'ABCD'.includes(k)).map(([k,v]) => `**Why not ${k}:** ${v}`).join('\n\n')}

${q.exam_tip ? `**Exam Tip:** ${q.exam_tip}` : ''}

</details>

---`).join('\n\n')}

## Answer Key

| Q | Answer | Domain | Difficulty |
|---|--------|--------|-----------|
${questions.map((q, i) => `| ${i+1} | ${q.correct} | ${q.domain || ''} | ${q.difficulty || ''} |`).join('\n')}

---

## Domain Score Tracker

| Domain | Questions | Your Score |
|--------|-----------|------------|
${domList}

*Fill in as you check your answers*
`;
}

function answerKeyMarkdown(test) {
  const questions = test.questions || [];
  return `# ${esc(test.cert_name)} — Practice Test ${test.test_number} Answer Key

| Q | Answer | Domain | Difficulty | Commonly Missed |
|---|--------|--------|-----------|----------------|
${questions.map((q, i) => `| ${i+1} | **${q.correct}** | ${q.domain||''} | ${q.difficulty||''} | ${q.commonly_missed ? '⚠️ Yes' : 'No'} |`).join('\n')}

---

## Explanations

${questions.map((q, i) => `### Q${i+1}. ${q.question}

**Correct: ${q.correct}** — ${(q.explanation||{})[q.correct] || (q.explanation||{}).correct || ''}

${q.exam_tip ? `> 💡 ${q.exam_tip}` : ''}
`).join('\n')}
`;
}

function downloadPracticeTest(cur, testNum) {
  const test = lgetJSON(PTKEYS.test(cur.id, testNum));
  if (!test) return;
  const slug = (test.cert_name || 'course').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const md   = ptToMarkdown(test);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${slug}-practice-test-${testNum}.md`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function pushPracticeTest(container, cur, testNum) {
  const test = lgetJSON(PTKEYS.test(cur.id, testNum));
  if (!test) return;
  const { githubToken, githubUsername } = getSettings();
  const ptStatus = container.querySelector('#pt-status');
  if (!githubToken) {
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar error">❌ GitHub token not set — add it in ⚙ Settings.</div>`;
    return;
  }
  const ghUser   = githubUsername || 'aseemmankotia';
  const slug     = cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const repoName = `course-${slug}`;
  const API      = 'https://api.github.com';
  const headers  = { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json' };
  if (ptStatus) ptStatus.innerHTML = `<div class="status-bar info">📤 Pushing Practice Test ${testNum} to GitHub…</div>`;

  const files = [
    { path: `practice-tests/practice-test-${testNum}.md`, content: ptToMarkdown(test) },
    { path: `practice-tests/answer-key-${testNum}.md`,    content: answerKeyMarkdown(test) },
  ];

  try {
    await fetch(`${API}/user/repos`, { method:'POST', headers, body: JSON.stringify({ name: repoName, private:false, auto_init:false }) });
    for (const file of files) {
      let sha = null;
      const chk = await fetch(`${API}/repos/${ghUser}/${repoName}/contents/${file.path}`, { headers });
      if (chk.ok) { const ex = await chk.json(); sha = ex.sha; }
      const content = btoa(unescape(encodeURIComponent(file.content)));
      await fetch(`${API}/repos/${ghUser}/${repoName}/contents/${file.path}`, {
        method:'PUT', headers, body: JSON.stringify({ message:`Add ${file.path}`, content, ...(sha?{sha}:{}) }),
      });
      await new Promise(r => setTimeout(r, 300));
    }
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar success">✅ Practice Test ${testNum} pushed to GitHub!</div>`;
    setTimeout(() => { if (ptStatus) ptStatus.innerHTML = ''; }, 4000);
  } catch (e) {
    if (ptStatus) ptStatus.innerHTML = `<div class="status-bar error">❌ ${esc(e.message)}</div>`;
  }
}

// ── Cell status helper ────────────────────────────────────────────────────────

function setCellStatus(container, type, chNum, state) {
  const el = container.querySelector(`#mat-${type}-${chNum}`);
  if (el) el.textContent = STATUS[state] || STATUS.none;
}

// ── Generate all chapters + practice tests ────────────────────────────────────

async function genAll(container, cur, lang, isCert, certName) {
  const btn    = container.querySelector('#mat-gen-all-btn');
  const status = container.querySelector('#mat-status');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  for (let i = 0; i < cur.chapters.length; i++) {
    const ch = cur.chapters[i];
    status.innerHTML = `<div class="status-bar" style="background:var(--surface2);color:var(--text);">
      ⏳ Chapter ${ch.number}/${cur.chapters.length}: ${esc(ch.title)}
      <div style="margin-top:6px;background:#e5e7eb;border-radius:3px;height:4px;">
        <div style="background:var(--accent);height:4px;border-radius:3px;width:${Math.round((i/cur.chapters.length)*100)}%;transition:width .3s;"></div>
      </div>
    </div>`;
    await genChapterAll(container, cur, ch, lang, isCert, certName);
    if (i < cur.chapters.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  status.innerHTML = `<div class="status-bar info">✅ Chapter materials done! Generating practice tests…</div>`;
  await genBothPracticeTests(container, cur, certName);

  status.innerHTML = `<div class="status-bar success">✅ All materials + both practice tests generated!</div>`;
  btn.disabled = false;
  btn.textContent = '🚀 Generate All Materials';
  setTimeout(() => { status.innerHTML = ''; }, 5000);
}

// ── Generate all materials for one chapter ────────────────────────────────────

async function genChapterAll(container, cur, ch, lang, isCert, certName) {
  const types = [
    { type: 'q', fn: () => genQuestions(container, cur, ch, isCert, certName) },
    { type: 'f', fn: () => genFlashcards(container, cur, ch) },
    { type: 'c', fn: () => genCode(container, cur, ch, lang) },
    { type: 's', fn: () => genCheatSheet(container, cur, ch) },
  ];
  for (const { type, fn } of types) {
    setCellStatus(container, type, ch.number, 'generating');
    try {
      await fn();
      setCellStatus(container, type, ch.number, 'ready');
    } catch (e) {
      setCellStatus(container, type, ch.number, 'none');
      console.warn(`Ch ${ch.number} ${type}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

// ── Practice Questions ─────────────────────────────────────────────────────────

async function genQuestions(container, cur, ch, isCert, certName) {
  const apiKey = getApiKey();
  const text = await callClaude(apiKey, {
    system: 'You are an expert educator creating practice questions. Return only clean markdown.',
    user: `Generate 10 practice questions for this chapter.

Chapter ${ch.number}: ${ch.title}
Subtitle: ${ch.subtitle || ''}
Concepts: ${(ch.concepts||[]).join(', ')}
Course: ${cur.course_title}
Target audience: ${cur.audience || 'developers'}
${isCert ? `Certification: ${certName}
Style questions like actual ${certName} exam questions. Include scenario-based questions.` : ''}

Mix of types:
- 5 Multiple choice (4 options, 1 correct) with <details> answer block
- 2 True/False with explanation
- 2 Short answer
- 1 Scenario-based

Format EXACTLY as:

## Chapter ${ch.number}: ${ch.title} — Practice Questions

### Multiple Choice

**Q1.** [question]

A) [option]
B) [option]
C) [option]
D) [option]

<details>
<summary>Answer</summary>

**Correct: B**

[explanation of why B is correct and why others are wrong]

</details>

---

[continue for all 10 questions, properly grouped by type]

### True / False

**Q6.** [statement] — **True / False**

*[explanation]*

---

### Short Answer

**Q8.** [question]

<details>
<summary>Answer</summary>
[answer]
</details>

---`,
    maxTokens: 3000,
  });
  lset(MKEYS.questions(cur.id, ch.number), text.trim());
  const cell = container.querySelector(`#mat-q-${ch.number}`);
  if (cell) cell.textContent = STATUS.ready;
}

// ── Flashcards ────────────────────────────────────────────────────────────────

async function genFlashcards(container, cur, ch) {
  const apiKey = getApiKey();
  const text = await callClaude(apiKey, {
    system: 'You are an expert educator creating flashcards for spaced repetition. Return only clean markdown.',
    user: `Generate 15 flashcards for this chapter.

Chapter ${ch.number}: ${ch.title}
Concepts: ${(ch.concepts||[]).join(', ')}
Key takeaway: ${ch.key_takeaway || ''}
Course: ${cur.course_title}

Format EXACTLY as:

## Chapter ${ch.number}: ${ch.title} — Flashcards

| # | Front (Question) | Back (Answer) |
|---|-----------------|---------------|
| 1 | What is [concept]? | [clear concise answer] |
[... 15 rows total]

### Key Terms

| Term | Definition |
|------|-----------|
| [term] | [definition] |
[5-8 key terms]

### Memory Tricks
- [mnemonic or memory trick 1]
- [mnemonic or memory trick 2]
- [mnemonic or memory trick 3]`,
    maxTokens: 2000,
  });
  lset(MKEYS.flashcards(cur.id, ch.number), text.trim());
  const cell = container.querySelector(`#mat-f-${ch.number}`);
  if (cell) cell.textContent = STATUS.ready;
}

// ── Code Examples ─────────────────────────────────────────────────────────────

async function genCode(container, cur, ch, lang) {
  const apiKey = getApiKey();
  const text = await callClaude(apiKey, {
    system: 'You are an expert software educator. Output valid JSON only.',
    user: `Generate 3-5 practical code examples for this chapter.

Chapter ${ch.number}: ${ch.title}
Language: ${lang}
Concepts: ${(ch.concepts||[]).join(', ')}
Course: ${cur.course_title}
Audience: ${cur.audience || 'beginner developers'}

Return JSON array:
[{
  "filename": "descriptive-kebab-name.${lang==='JavaScript'?'js':lang==='TypeScript'?'ts':lang==='Java'?'java':lang.toLowerCase()==='none'?'txt':'py'}",
  "title": "What this example demonstrates",
  "code": "full code with comments",
  "concepts_demonstrated": ["concept1"],
  "challenge": "Modify this code to..."
}]`,
    maxTokens: 3000,
  });
  const examples = parseJSON(text);
  lset(MKEYS.code(cur.id, ch.number), examples);
  const cell = container.querySelector(`#mat-c-${ch.number}`);
  if (cell) cell.textContent = STATUS.ready;
}

// ── Cheat Sheet ───────────────────────────────────────────────────────────────

async function genCheatSheet(container, cur, ch) {
  const apiKey = getApiKey();
  const text = await callClaude(apiKey, {
    system: 'You are an expert educator creating concise reference materials. Return only clean markdown.',
    user: `Create a one-page cheat sheet for this chapter. Scannable, printable.

Chapter ${ch.number}: ${ch.title}
Concepts: ${(ch.concepts||[]).join(', ')}
Key takeaway: ${ch.key_takeaway || ''}
Course: ${cur.course_title}

Format EXACTLY as:

## Chapter ${ch.number}: ${ch.title} — Quick Reference

### Core Concepts
| Concept | One-line explanation |
|---------|---------------------|
| [concept] | [explanation] |

### Key Syntax / Commands
\`\`\`
[most important syntax or commands]
\`\`\`

### Common Patterns
**Pattern 1: [name]**
[short description]

### Things to Remember
✅ [important point 1]
✅ [important point 2]
❌ [common mistake to avoid]

### Quick Quiz
1. [quick question] → [answer]
2. [quick question] → [answer]`,
    maxTokens: 1800,
  });
  lset(MKEYS.cheatsheet(cur.id, ch.number), text.trim());
  const cell = container.querySelector(`#mat-s-${ch.number}`);
  if (cell) cell.textContent = STATUS.ready;
}

// ── Preview helpers ───────────────────────────────────────────────────────────

function showPreview(container, title, content, filename) {
  const panel     = container.querySelector('#mat-preview-panel');
  const titleEl   = container.querySelector('#mat-preview-title');
  const contentEl = container.querySelector('#mat-preview-content');
  const copyBtn   = container.querySelector('#mat-preview-copy');
  const dlBtn     = container.querySelector('#mat-preview-download');

  titleEl.textContent = title;
  contentEl.value     = content;
  panel.style.display = '';
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(content).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
  };
  dlBtn.onclick = () => {
    const blob = new Blob([content], { type:'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

function showChapterPreview(container, cur, ch) {
  const types = [
    { key: MKEYS.questions(cur.id, ch.number) },
    { key: MKEYS.flashcards(cur.id, ch.number) },
    { key: MKEYS.cheatsheet(cur.id, ch.number) },
  ];
  let combined = '';
  for (const { key } of types) {
    const content = lget(key);
    if (content) combined += content + '\n\n---\n\n';
  }
  const codeStr = lget(MKEYS.code(cur.id, ch.number));
  if (codeStr) {
    try {
      const examples = JSON.parse(codeStr);
      combined += `## Chapter ${ch.number}: ${ch.title} — Code Examples\n\n` +
        examples.map(ex => `### ${eh(ex.title)}\n\n**File:** \`${ex.filename}\`\n\n\`\`\`\n${ex.code}\n\`\`\`\n\n**Challenge:** ${ex.challenge||''}`).join('\n\n---\n\n');
    } catch {}
  }
  if (!combined) combined = `No materials generated yet for Chapter ${ch.number}.\nClick ⚡ Generate to create materials.`;
  showPreview(container, `Chapter ${ch.number}: ${ch.title}`, combined.trim(), `chapter-${pad(ch.number)}-materials.md`);
}

// ── README generator ──────────────────────────────────────────────────────────

function generateReadme(cur) {
  const isCert    = cur.course_type === 'certification';
  const certName  = cur.exam_name || '';
  const chapterList = cur.chapters.map(ch =>
    `- [Chapter ${ch.number}: ${ch.title}](${(getChapterData(ch.number)||{}).youtubeUrl||'#'})`
  ).join('\n');
  const hasPT1 = !!lgetJSON(PTKEYS.test(cur.id, 1));
  const hasPT2 = !!lgetJSON(PTKEYS.test(cur.id, 2));

  return `# ${cur.course_title} — Course Materials

> Free supplementary materials for the [${cur.course_title}](#) YouTube course by TechNuggets Academy

## 📚 What's Included

| Material | Chapters | Description |
|----------|----------|-------------|
| Practice Questions | All ${cur.chapters.length} | 10 questions per chapter (multiple choice, T/F, short answer) |
| Flashcards | All ${cur.chapters.length} | 15 cards per chapter, Anki-compatible |
| Code Examples | All ${cur.chapters.length} | 3-5 runnable examples per chapter |
| Cheat Sheets | All ${cur.chapters.length} | Quick reference guide per chapter |
${hasPT1 || hasPT2 ? `| Practice Tests | 2 full exams | 55 questions each, 90 minutes, with answer keys |` : ''}

## 🎯 How to Use

### Practice Questions
Open any \`practice-questions/chapter-XX-questions.md\` and answer before revealing the \`<details>\` block.

### Flashcards
Import into [Anki](https://apps.ankiweb.net/) or study directly on GitHub.

### Code Examples
\`\`\`bash
git clone https://github.com/aseemmankotia/${cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
cd code-examples/chapter-01
\`\`\`

## 📺 Course Videos

${chapterList}

${isCert ? `## 🏆 Certification Prep

These materials are designed to help you pass the **${certName}** certification exam.
${hasPT1 || hasPT2 ? 'Two full practice tests (55 questions each) are included in \`practice-tests/\` with answer keys.' : ''}` : ''}

## ⭐ Support

- ⭐ Star this repository
- 👍 Like the YouTube videos
- 🔔 Subscribe to TechNuggets Academy

---
*Created with [TechNuggets Academy Course Pipeline](https://github.com/aseemmankotia/course-pipeline)*
`;
}

function getChapterData(n) {
  try { return JSON.parse(localStorage.getItem(`course_chapter_${n}`) || 'null'); }
  catch { return null; }
}

// ── Collect all materials as file list ────────────────────────────────────────

function collectAllMaterials(cur) {
  const files = [{ path: 'README.md', content: generateReadme(cur) }];

  cur.chapters.forEach(ch => {
    const n    = pad(ch.number);
    const slug = ch.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

    const questions = lget(MKEYS.questions(cur.id, ch.number));
    if (questions) files.push({ path: `practice-questions/chapter-${n}-questions.md`, content: questions });

    const flashcards = lget(MKEYS.flashcards(cur.id, ch.number));
    if (flashcards) files.push({ path: `flashcards/chapter-${n}-flashcards.md`, content: flashcards });

    const cheatsheet = lget(MKEYS.cheatsheet(cur.id, ch.number));
    if (cheatsheet) files.push({ path: `cheat-sheets/chapter-${n}-cheatsheet.md`, content: cheatsheet });

    const codeStr = lget(MKEYS.code(cur.id, ch.number));
    if (codeStr) {
      try {
        const examples = JSON.parse(codeStr);
        examples.forEach(ex => {
          files.push({ path: `labs/lab-${n}-${slug}/${ex.filename}`, content: ex.code });
        });
        files.push({ path: `labs/lab-${n}-${slug}/README.md`, content: generateLabReadme(ch, examples) });
        files.push({ path: `labs/lab-${n}-${slug}/verify.sh`, content: generateVerifyScript(ch, examples) });
      } catch {}
    }
  });

  // Practice tests
  for (let t = 1; t <= 2; t++) {
    const test = lgetJSON(PTKEYS.test(cur.id, t));
    if (test) {
      files.push({ path: `practice-tests/practice-test-${t}.md`, content: ptToMarkdown(test) });
      files.push({ path: `practice-tests/answer-key-${t}.md`,    content: answerKeyMarkdown(test) });
    }
  }

  // Score tracker template
  const pt1 = lgetJSON(PTKEYS.test(cur.id, 1));
  const pt2 = lgetJSON(PTKEYS.test(cur.id, 2));
  if (pt1 || pt2) {
    files.push({ path: 'practice-tests/score-tracker.md', content: generateScoreTracker(cur, pt1, pt2) });
  }

  return files;
}

function generateScoreTracker(cur, pt1, pt2) {
  return `# ${cur.course_title} — Score Tracker

## Practice Test 1
| Attempt | Date | Score | % | Pass/Fail |
|---------|------|-------|---|-----------|
| 1 | | /55 | % | |
| 2 | | /55 | % | |
| 3 | | /55 | % | |

${pt1 ? `### Domain Scores — Test 1
| Domain | Questions | Score |
|--------|-----------|-------|
${Object.entries(pt1.domain_breakdown || {}).map(([d,q]) => `| ${d} | ${q} | /${q} |`).join('\n')}
` : ''}

## Practice Test 2
| Attempt | Date | Score | % | Pass/Fail |
|---------|------|-------|---|-----------|
| 1 | | /55 | % | |
| 2 | | /55 | % | |

${pt2 ? `### Domain Scores — Test 2
| Domain | Questions | Score |
|--------|-----------|-------|
${Object.entries(pt2.domain_breakdown || {}).map(([d,q]) => `| ${d} | ${q} | /${q} |`).join('\n')}
` : ''}

## Study Plan

Use weak domains from your score tracker to identify which chapters to revisit.
- **< 60%** on a domain → re-watch that chapter + redo flashcards
- **60-70%** on a domain → review cheat sheet + redo practice questions
- **> 70%** on a domain → you're good, light review before exam
`;
}

function generateLabReadme(ch, examples) {
  return `# Lab ${pad(ch.number)}: ${ch.title}

**Exam Domain:** ${ch.exam_domains_covered?.[0] || 'See curriculum'}
**Duration:** ~${ch.lab_duration || 20} minutes

## Files
${examples.map(ex => `- \`${ex.filename}\` — ${ex.title}`).join('\n')}

## Steps
Follow along with the chapter video, then run the verification script.

## Verify
\`\`\`bash
bash verify.sh
\`\`\`
`;
}

function generateVerifyScript(ch, examples) {
  return `#!/bin/bash
# Verification script for Lab ${ch.number}: ${ch.title}
set -e
echo "🔍 Verifying Lab ${ch.number}: ${ch.title}..."
${examples.map(ex => `[ -f "${ex.filename}" ] && echo "✅ ${ex.filename} found" || echo "❌ ${ex.filename} missing"`).join('\n')}
echo ""
echo "✅ Lab ${ch.number} verification complete!"
`;
}

// ── ZIP download ───────────────────────────────────────────────────────────────

async function downloadZip(container, cur) {
  if (!window.JSZip) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }

  const files = collectAllMaterials(cur);
  if (files.length <= 1) {
    const status = container.querySelector('#mat-status');
    if (status) status.innerHTML = `<div class="status-bar warning">⚠️ No materials generated yet. Generate materials first.</div>`;
    setTimeout(() => { if (status) status.innerHTML = ''; }, 4000);
    return;
  }

  const counts = {
    questions:  cur.chapters.filter(ch => !!lget(MKEYS.questions(cur.id,ch.number))).length,
    flashcards: cur.chapters.filter(ch => !!lget(MKEYS.flashcards(cur.id,ch.number))).length,
    code:       cur.chapters.filter(ch => !!lget(MKEYS.code(cur.id,ch.number))).length,
    cheatsheet: cur.chapters.filter(ch => !!lget(MKEYS.cheatsheet(cur.id,ch.number))).length,
    tests:      [1,2].filter(t => !!lgetJSON(PTKEYS.test(cur.id,t))).length,
  };

  const status = container.querySelector('#mat-status');
  if (status) status.innerHTML = `<div class="status-bar info">📦 Building ZIP with: ${[
    counts.questions  ? `✅ ${counts.questions} question file${counts.questions!==1?'s':''}` : null,
    counts.flashcards ? `✅ ${counts.flashcards} flashcard file${counts.flashcards!==1?'s':''}` : null,
    counts.cheatsheet ? `✅ ${counts.cheatsheet} cheat sheet${counts.cheatsheet!==1?'s':''}` : null,
    counts.code       ? `✅ ${counts.code} lab director${counts.code!==1?'ies':'y'}` : null,
    counts.tests      ? `✅ ${counts.tests} practice test${counts.tests!==1?'s':''}` : null,
    '✅ README.md',
  ].filter(Boolean).join(' · ')}</div>`;

  const zip  = new window.JSZip();
  files.forEach(f => zip.file(f.path, f.content));

  const slug = cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${slug}-course-materials.zip`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setTimeout(() => { if (status) status.innerHTML = `<div class="status-bar success">✅ Downloaded: ${slug}-course-materials.zip</div>`; }, 100);
  setTimeout(() => { if (status) status.innerHTML = ''; }, 4000);
}

// ── GitHub push ────────────────────────────────────────────────────────────────

async function pushToGitHub(container, cur) {
  const { githubToken, githubUsername } = getSettings();
  const status = container.querySelector('#mat-status');

  if (!githubToken) {
    if (status) status.innerHTML = `<div class="status-bar error">❌ GitHub token not set — add it in ⚙ Settings.</div>`;
    return;
  }

  const ghUser   = githubUsername || 'aseemmankotia';
  const slug     = cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const repoName = `course-${slug}`;
  const API      = 'https://api.github.com';
  const headers  = { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json' };
  const btn      = container.querySelector('#mat-github-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Pushing…'; }

  const setStatus = msg => { if (status) status.innerHTML = `<div class="status-bar info">${msg}</div>`; };

  try {
    setStatus('📁 Creating GitHub repository…');
    const createResp = await fetch(`${API}/user/repos`, {
      method:'POST', headers,
      body: JSON.stringify({ name: repoName, description: `Course materials for: ${cur.course_title}`, private:false, auto_init:false }),
    });
    if (!createResp.ok && createResp.status !== 422) {
      const e = await createResp.json().catch(()=>({}));
      throw new Error(`Failed to create repo (${createResp.status}): ${e.message || createResp.statusText}`);
    }

    const files   = collectAllMaterials(cur);
    let   pushed  = 0;

    for (const file of files) {
      setStatus(`📤 Pushing files… (${pushed+1}/${files.length}) <span style="color:var(--muted);font-size:.8rem;">${esc(file.path)}</span>`);
      let sha = null;
      const chk = await fetch(`${API}/repos/${ghUser}/${repoName}/contents/${file.path}`, { headers });
      if (chk.ok) { const ex = await chk.json(); sha = ex.sha; }
      const content = btoa(unescape(encodeURIComponent(file.content)));
      await fetch(`${API}/repos/${ghUser}/${repoName}/contents/${file.path}`, {
        method:'PUT', headers,
        body: JSON.stringify({ message:`Add ${file.path}`, content, ...(sha?{sha}:{}) }),
      });
      pushed++;
      await new Promise(r => setTimeout(r, 250));
    }

    const repoUrl = `https://github.com/${ghUser}/${repoName}`;
    lset(`course_github_url_${cur.id}`, repoUrl);
    showRepoLink(container, repoUrl);
    if (status) status.innerHTML = `<div class="status-bar success">✅ Pushed ${pushed} files to GitHub!</div>`;
    setTimeout(() => { if (status) status.innerHTML = ''; }, 5000);

  } catch (e) {
    if (status) status.innerHTML = `<div class="status-bar error">❌ ${esc(e.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📤 Push to GitHub'; }
  }
}

function showRepoLink(container, repoUrl) {
  const el = container.querySelector('#mat-repo-link');
  if (!el) return;
  el.style.display = '';
  el.innerHTML = `<div class="status-bar" style="background:#f0fdf4;border-color:#86efac;color:#166534;">
    📦 Published at: <a href="${esc(repoUrl)}" target="_blank" style="color:#16a34a;font-weight:600;">${esc(repoUrl)}</a>
  </div>`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
