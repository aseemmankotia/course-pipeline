/**
 * materials.js — Tab 6: 📚 Course Materials
 * Per-chapter: practice questions, flashcards, code examples, cheat sheets.
 * Generates markdown files, previews them, and downloads as a ZIP.
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

const STATUS = { none:'⬜', generating:'🔄', ready:'✅' };

async function callClaude(apiKey, { system, user, maxTokens = 2500 }) {
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
  if (!s.claudeApiKey) throw new Error('Claude API key not set — add it in ⚙ Settings.');
  return s.claudeApiKey;
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

  const s = getSettings();
  const lang = s.courseLanguage || 'Python';
  const isCert = cur.course_type === 'certification';
  const certName = cur.exam_name || '';

  const gridRows = cur.chapters.map(ch => {
    const qDone  = !!lget(MKEYS.questions(cur.id, ch.number));
    const fDone  = !!lget(MKEYS.flashcards(cur.id, ch.number));
    const cDone  = !!lget(MKEYS.code(cur.id, ch.number));
    const sDone  = !!lget(MKEYS.cheatsheet(cur.id, ch.number));
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
          <button class="btn btn-outline btn-sm mat-gen-btn" data-chapter="${ch.number}" title="Generate all materials for this chapter">⚡ Generate</button>
          <button class="btn btn-outline btn-sm mat-preview-btn" data-chapter="${ch.number}" title="Preview generated materials">👁 Preview</button>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
          <h2 style="margin-bottom:4px;">📚 Course Materials</h2>
          <p style="color:var(--muted);font-size:.9rem;margin:0;">Generate supplementary materials for GitHub · <strong>${esc(lang)}</strong> code examples</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="mat-gen-all-btn">🚀 Generate All Materials</button>
          <button class="btn btn-secondary" id="mat-zip-btn">⬇ Download ZIP</button>
        </div>
      </div>

      <div id="mat-status" style="margin-bottom:12px;"></div>

      <!-- Progress grid -->
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

      <!-- Preview panel -->
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

      <!-- README preview -->
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
    </style>
  `;

  // Wire buttons
  container.querySelector('#mat-gen-all-btn').addEventListener('click', () => genAll(container, cur, lang, isCert, certName));
  container.querySelector('#mat-zip-btn').addEventListener('click', () => downloadZip(cur));
  container.querySelector('#mat-readme-preview-btn').addEventListener('click', () => showPreview(container, 'README.md', generateReadme(cur), 'README.md'));
  container.querySelector('#mat-preview-close').addEventListener('click', () => {
    container.querySelector('#mat-preview-panel').style.display = 'none';
  });

  container.querySelectorAll('.mat-gen-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const n = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      if (!ch) return;
      await genChapterAll(container, cur, ch, lang, isCert, certName);
    });
  });

  container.querySelectorAll('.mat-preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.chapter);
      const ch = cur.chapters.find(c => c.number === n);
      if (!ch) return;
      showChapterPreview(container, cur, ch);
    });
  });
}

// ── Cell status helper ────────────────────────────────────────────────────────

function setCellStatus(container, type, chNum, state) {
  const el = container.querySelector(`#mat-${type}-${chNum}`);
  if (el) el.textContent = STATUS[state] || STATE.none;
}

// ── Generate all chapters ─────────────────────────────────────────────────────

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

  status.innerHTML = `<div class="status-bar success">✅ All materials generated for ${cur.chapters.length} chapters!</div>`;
  btn.disabled = false;
  btn.textContent = '🚀 Generate All Materials';
  setTimeout(() => { status.innerHTML = ''; }, 5000);
}

// ── Generate all materials for one chapter ────────────────────────────────────

async function genChapterAll(container, cur, ch, lang, isCert, certName) {
  const types = [
    { type: 'q', label: 'questions',  fn: () => genQuestions(container, cur, ch, isCert, certName) },
    { type: 'f', label: 'flashcards', fn: () => genFlashcards(container, cur, ch) },
    { type: 'c', label: 'code',       fn: () => genCode(container, cur, ch, lang) },
    { type: 's', label: 'cheatsheet', fn: () => genCheatSheet(container, cur, ch) },
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
| 2 | [term or concept] | [definition or explanation] |
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

For each example provide clear comments, expected output, and a challenge variation.

Return JSON array:
[{
  "filename": "descriptive-kebab-name.${lang === 'JavaScript' ? 'js' : lang === 'TypeScript' ? 'ts' : lang === 'Java' ? 'java' : lang.toLowerCase() === 'none' ? 'txt' : 'py'}",
  "title": "What this example demonstrates",
  "code": "full code with line-by-line comments explaining what each part does\\n# Expected output:\\n# [show what running this produces]",
  "concepts_demonstrated": ["concept1", "concept2"],
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
[one row per concept]

### Key Syntax / Commands
\`\`\`
[most important syntax or commands, 1 per line with comment]
\`\`\`

### Common Patterns
**Pattern 1: [name]**
[short description and when to use it]

**Pattern 2: [name]**
[short description]

### Things to Remember
✅ [important point 1]
✅ [important point 2]
✅ [important point 3]
❌ [common mistake to avoid]
❌ [another common mistake]

### Quick Quiz
1. [quick question] → [answer]
2. [quick question] → [answer]
3. [quick question] → [answer]`,
    maxTokens: 1800,
  });
  lset(MKEYS.cheatsheet(cur.id, ch.number), text.trim());
  const cell = container.querySelector(`#mat-s-${ch.number}`);
  if (cell) cell.textContent = STATUS.ready;
}

// ── Preview helpers ───────────────────────────────────────────────────────────

function showPreview(container, title, content, filename) {
  const panel    = container.querySelector('#mat-preview-panel');
  const titleEl  = container.querySelector('#mat-preview-title');
  const contentEl = container.querySelector('#mat-preview-content');
  const copyBtn  = container.querySelector('#mat-preview-copy');
  const dlBtn    = container.querySelector('#mat-preview-download');

  titleEl.textContent  = title;
  contentEl.value      = content;
  panel.style.display  = '';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(content).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
  };

  dlBtn.onclick = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

function showChapterPreview(container, cur, ch) {
  // Show first available material for this chapter
  const types = [
    { key: MKEYS.questions(cur.id, ch.number),  label: `Ch ${ch.number} Questions`,   file: `practice-questions/chapter-${pad(ch.number)}-questions.md` },
    { key: MKEYS.flashcards(cur.id, ch.number), label: `Ch ${ch.number} Flashcards`,  file: `flashcards/chapter-${pad(ch.number)}-flashcards.md` },
    { key: MKEYS.cheatsheet(cur.id, ch.number), label: `Ch ${ch.number} Cheat Sheet`, file: `cheat-sheets/chapter-${pad(ch.number)}-cheatsheet.md` },
  ];

  // Build a combined preview
  let combined = '';
  let hasAny = false;
  for (const { key, label } of types) {
    const content = lget(key);
    if (content) { combined += content + '\n\n---\n\n'; hasAny = true; }
  }

  const codeStr = lget(MKEYS.code(cur.id, ch.number));
  if (codeStr) {
    try {
      const examples = JSON.parse(codeStr);
      const codeMarkdown = `## Chapter ${ch.number}: ${ch.title} — Code Examples\n\n` +
        examples.map(ex => `### ${eh(ex.title)}\n\n**File:** \`${ex.filename}\`\n\n\`\`\`\n${ex.code}\n\`\`\`\n\n**Challenge:** ${ex.challenge || ''}`).join('\n\n---\n\n');
      combined += codeMarkdown;
      hasAny = true;
    } catch {}
  }

  if (!hasAny) {
    combined = `No materials generated yet for Chapter ${ch.number}.\n\nClick ⚡ Generate to create materials.`;
  }

  showPreview(container, `Chapter ${ch.number}: ${ch.title}`, combined.trim(), `chapter-${pad(ch.number)}-materials.md`);
}

// ── README generator ──────────────────────────────────────────────────────────

function generateReadme(cur) {
  const isCert = cur.course_type === 'certification';
  const certName = cur.exam_name || '';
  const chapterList = cur.chapters.map(ch =>
    `- [Chapter ${ch.number}: ${ch.title}](${(getChapterData(ch.number) || {}).youtubeUrl || '#'})`
  ).join('\n');

  return `# ${cur.course_title} — Course Materials

> Free supplementary materials for the [${cur.course_title}](#) YouTube course by TechNuggets Academy

## 📚 What's Included

| Material | Chapters | Description |
|----------|----------|-------------|
| Practice Questions | All ${cur.chapters.length} | 10 questions per chapter (multiple choice, T/F, short answer) |
| Flashcards | All ${cur.chapters.length} | 15 cards per chapter, Anki-compatible |
| Code Examples | All ${cur.chapters.length} | 3-5 runnable examples per chapter |
| Cheat Sheets | All ${cur.chapters.length} | Quick reference guide per chapter |

## 🎯 How to Use

### Practice Questions
Open any \`practice-questions/chapter-XX-questions.md\` file.
Try answering before revealing the answer in the \`<details>\` block.

### Flashcards
Import the flashcard markdown into [Anki](https://apps.ankiweb.net/) or study directly on GitHub.

### Code Examples
Clone this repo and run examples locally:
\`\`\`bash
git clone https://github.com/aseemmankotia/${cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
cd code-examples/chapter-01
python example-01.py
\`\`\`

### Cheat Sheets
Print or bookmark the \`cheat-sheets/\` folder for quick reference during study.

## 📺 Course Videos

${chapterList}

${isCert ? `## 🏆 Certification Prep

These materials are designed to help you pass the **${certName}** certification exam.
Practice questions mirror the exam format and difficulty level.` : ''}

## ⭐ Support

If these materials helped you, please:
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

// ── ZIP download ───────────────────────────────────────────────────────────────

async function downloadZip(cur) {
  // Ensure JSZip is loaded
  if (!window.JSZip) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }

  const zip = new window.JSZip();

  // README
  zip.file('README.md', generateReadme(cur));

  // Per-chapter materials
  let anyContent = false;
  cur.chapters.forEach(ch => {
    const n = pad(ch.number);

    const questions = lget(MKEYS.questions(cur.id, ch.number));
    if (questions) { zip.file(`practice-questions/chapter-${n}-questions.md`, questions); anyContent = true; }

    const flashcards = lget(MKEYS.flashcards(cur.id, ch.number));
    if (flashcards) { zip.file(`flashcards/chapter-${n}-flashcards.md`, flashcards); anyContent = true; }

    const cheatsheet = lget(MKEYS.cheatsheet(cur.id, ch.number));
    if (cheatsheet) { zip.file(`cheat-sheets/chapter-${n}-cheatsheet.md`, cheatsheet); anyContent = true; }

    const codeStr = lget(MKEYS.code(cur.id, ch.number));
    if (codeStr) {
      try {
        const examples = JSON.parse(codeStr);
        let readmeLines = [`# Chapter ${ch.number}: ${ch.title} — Code Examples\n`];
        examples.forEach(ex => {
          zip.file(`code-examples/chapter-${n}/${ex.filename}`, ex.code);
          readmeLines.push(`## ${ex.title}\n\n**File:** \`${ex.filename}\`\n\n**Challenge:** ${ex.challenge || 'Try modifying this example!'}\n`);
          anyContent = true;
        });
        zip.file(`code-examples/chapter-${n}/README.md`, readmeLines.join('\n'));
      } catch {}
    }
  });

  if (!anyContent) {
    alert('No materials generated yet. Generate some materials first, then download.');
    return;
  }

  const slug = cur.course_title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${slug}-materials.zip`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
