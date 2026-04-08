#!/usr/bin/env node
/**
 * course-render.js — Chapter video renderer
 *
 * Usage:  npm run render:chapter
 *
 * Input:  course-render-input.json  (downloaded from Render tab)
 * Output: chapter-{N}-{slug}.mp4
 *
 * Requirements:
 *   ANTHROPIC_API_KEY in .env · ffmpeg · npm install
 */

;(function loadEnv() {
  try {
    require('fs').readFileSync(require('path').join(__dirname,'../.env'), 'utf8')
      .split('\n').forEach(line => {
        const m = line.match(/^([^#=\s][^=]*)=(.*)/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      });
  } catch {}
})();

const fs           = require('fs');
const path         = require('path');
const axios        = require('axios');
const puppeteer    = require('puppeteer');
const { execSync, spawn } = require('child_process');

const INPUT_FILE = path.join(__dirname, '..', 'course-render-input.json');
const SLIDES_DIR = path.join(__dirname, 'slides');
const TEMP_DIR   = path.join(__dirname, 'temp');

// ── PIP config ────────────────────────────────────────────────────────────────
const PIP_WIDTH    = 300;
const PIP_HEIGHT   = 340;
const PIP_POSITION = 'bottom-right';

// ── Brand ─────────────────────────────────────────────────────────────────────
const BRAND_FONT = `https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`;
const ACCENT     = '#e94560';
const NAVY       = '#1a1a2e';
const DEEP_BLUE  = '#16213e';

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  log('📖 Reading course-render-input.json…');
  if (!fs.existsSync(INPUT_FILE)) {
    die('course-render-input.json not found.\nDownload it from the Render tab in the app.');
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const {
    course_title, chapter_number, chapter_title, chapter_subtitle,
    total_chapters, script, duration_mins, key_takeaway,
    quiz_questions = [], concepts = [],
    heygen_local_file, output_filename,
  } = input;

  if (!script) die('script is missing from course-render-input.json');
  if (!heygen_local_file) die('heygen_local_file is missing.');

  fs.mkdirSync(SLIDES_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR,   { recursive: true });

  const ffmpeg  = findBinary('ffmpeg');
  const ffprobe = findBinary('ffprobe');

  // ── Step 1: Split script into slide sections ─────────────────────────────
  log('\n🤖 Step 1 — Splitting chapter script into slide sections…');
  const sections = await splitChapterScript(script, input);
  log(`   ✓ ${sections.length} slides planned`);

  // Prepend chapter title slide + append summary + quiz slides
  const titleSection = {
    type: 'chapter_title',
    chapter_number,
    chapter_title,
    chapter_subtitle,
    total_chapters,
    course_title,
    duration_seconds: 5,
  };
  const summarySection = {
    type: 'chapter_summary',
    chapter_title,
    key_takeaway,
    next_chapter: chapter_number < total_chapters
      ? `Chapter ${chapter_number + 1}` : null,
    duration_seconds: 8,
  };
  const quizSection = quiz_questions.length ? {
    type: 'quiz',
    question:  quiz_questions[0].question,
    options:   quiz_questions[0].options,
    correct:   quiz_questions[0].correct,
    duration_seconds: 8,
  } : null;

  const allSections = [
    titleSection,
    ...sections,
    summarySection,
    ...(quizSection ? [quizSection] : []),
  ];

  // ── Step 2 & 3: Generate HTML + screenshot ───────────────────────────────
  log('\n🎨 Steps 2-3 — Generating and screenshotting slides…');
  await generateSlides(allSections, input);

  // ── Step 4: Locate HeyGen video ──────────────────────────────────────────
  log('\n⬇  Step 4 — Locating HeyGen video…');
  const heygenPath = path.join(TEMP_DIR, 'heygen-raw.mp4');
  const localPath  = path.join(__dirname, '..', heygen_local_file);
  if (!fs.existsSync(localPath)) {
    die(`HeyGen video not found: ${heygen_local_file}\nPlace the MP4 in the project root.`);
  }
  fs.copyFileSync(localPath, heygenPath);
  log(`   ✓ Using: ${heygen_local_file}`);

  // ── Step 5: Duration + timings ───────────────────────────────────────────
  log('\n⏱  Step 5 — Getting video duration and distributing timings…');
  const totalDuration = getVideoDuration(ffprobe, heygenPath);
  log(`   ✓ Total duration: ${totalDuration.toFixed(2)}s`);
  const timed = distributeTimings(allSections, totalDuration);
  timed.forEach((s, i) => log(`   Slide ${i + 1}: ${s.duration.toFixed(1)}s — ${s.type}`));

  // ── Step 6: Composite ────────────────────────────────────────────────────
  log('\n🎬 Step 6 — Compositing with FFmpeg…');
  const outPath = path.join(__dirname, '..', output_filename);
  await composite(ffmpeg, ffprobe, timed, heygenPath, outPath);

  log(`\n✅ Done: ${output_filename}`);
}

// ── Step 1: Split script into sections ───────────────────────────────────────

async function splitChapterScript(script, input) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) die('ANTHROPIC_API_KEY not set in .env');

  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: `You are a course slide designer. Split a chapter video script into slides for a professional online learning platform.

Slide types available:
- "concept"  : explanation slide with title + bullets (use for theory)
- "code"     : code example with syntax highlighting (use when showing code)
- "analogy"  : split-pane analogy vs technical (use for real-world comparisons)
- "diagram"  : Mermaid.js diagram (flowchart/sequence only, never placeholder text)

Rules:
- 6-10 slides per chapter
- Each slide covers ONE focused idea
- Keep bullets to 3-5 per slide
- Code blocks must be complete, self-contained, runnable examples
- Return ONLY a JSON array, no markdown`,
      messages: [{
        role: 'user',
        content: `Chapter: ${input.chapter_title}
Concepts: ${(input.concepts || []).join(', ')}

Script to split into slides:
${script.slice(0, 6000)}

Return JSON array of slides:
[
  {
    "type": "concept",
    "title": "Slide title",
    "bullets": ["point 1", "point 2", "point 3"],
    "duration_seconds": 30
  },
  {
    "type": "code",
    "title": "Code example title",
    "language": "python",
    "code": "# actual code here\\nprint('hello')",
    "explanation": "What this code does",
    "duration_seconds": 45
  },
  {
    "type": "analogy",
    "title": "Analogy title",
    "analogy_left": "Simple everyday thing",
    "analogy_right": "Technical term",
    "simple_label": "Think of it like...",
    "tech_label": "In tech terms...",
    "duration_seconds": 25
  },
  {
    "type": "diagram",
    "title": "Diagram title",
    "mermaid_code": "flowchart LR\\n  A[Start] --> B[End]",
    "duration_seconds": 35
  }
]`,
      }],
    },
    { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
  );

  const text  = res.data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  const clean = text.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in split response');
  return JSON.parse(match[0]);
}

// ── Steps 2 & 3: Generate + screenshot slides ─────────────────────────────────

async function generateSlides(sections, input) {
  const total   = sections.length;
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  const WAIT_MS = {
    chapter_title: 600, concept: 1000, code: 1200,
    analogy: 800, diagram: 3000, quiz: 800, chapter_summary: 800,
  };

  for (let i = 0; i < total; i++) {
    const s       = sections[i];
    const html    = buildSlideHTML(s, i, total, input);
    const htmlPath = path.join(SLIDES_DIR, `slide-${i}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    if (s.type === 'diagram') {
      const svgOk = await page.evaluate(() => {
        const svg = document.querySelector('.mermaid svg');
        return svg && svg.getBoundingClientRect().height > 60;
      });
      if (!svgOk) {
        log(`     ⚠ Mermaid failed for slide ${i} — converting to concept`);
        sections[i] = { type: 'concept', title: s.title, bullets: s.bullets || [], duration_seconds: s.duration_seconds };
        const fallbackHtml = buildSlideHTML(sections[i], i, total, input);
        fs.writeFileSync(htmlPath, fallbackHtml, 'utf8');
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15_000 });
        await page.evaluateHandle('document.fonts.ready');
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const wait = WAIT_MS[s.type] || 1000;
    await new Promise(r => setTimeout(r, wait));

    await page.screenshot({
      path: path.join(SLIDES_DIR, `slide-${i}.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    log(`   ✓ slide-${i}.png (${s.type})`);
  }

  await browser.close();
}

// ── Slide builders ─────────────────────────────────────────────────────────────

function buildSlideHTML(section, index, total, input) {
  switch (section.type) {
    case 'chapter_title':  return buildChapterTitleSlide(section);
    case 'chapter_summary': return buildChapterSummarySlide(section, input);
    case 'concept':        return buildConceptSlide(section, index, total, input);
    case 'code':           return buildCodeSlide(section, index, total, input);
    case 'analogy':        return buildAnalogySlide(section, index, total, input);
    case 'diagram':        return buildDiagramSlide(section, index, total, input);
    case 'quiz':           return buildQuizSlide(section, input);
    default:               return buildConceptSlide(section, index, total, input);
  }
}

const BASE_CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{
  width:1280px;height:720px;
  background:#ffffff;
  font-family:'DM Sans',system-ui,sans-serif;
  color:#2d2d2d;overflow:hidden;position:relative;
}`;

function accentBar() {
  return `<div style="position:absolute;top:0;left:0;right:0;height:4px;background:${ACCENT};"></div>`;
}

function progressDots(index, total) {
  return Array.from({ length: total }, (_, i) =>
    i === index
      ? `<span style="width:24px;height:7px;border-radius:4px;background:${ACCENT};display:inline-block;"></span>`
      : `<span style="width:7px;height:7px;border-radius:50%;background:#e5e7eb;display:inline-block;"></span>`
  ).join('');
}

function chapterBadge(input) {
  return `<div style="position:absolute;bottom:22px;right:24px;font-size:12px;color:#9ca3af;font-weight:500;">
    ${esc(input.course_title || '')} · Ch ${input.chapter_number}
  </div>`;
}

function buildChapterTitleSlide(s) {
  const dots = Array.from({ length: s.total_chapters }, (_, i) =>
    i + 1 === s.chapter_number
      ? `<span style="width:22px;height:8px;border-radius:4px;background:${ACCENT};display:inline-block;"></span>`
      : `<span style="width:8px;height:8px;border-radius:50%;background:#e5e7eb;display:inline-block;"></span>`
  ).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}
.hero{
  display:flex;flex-direction:column;justify-content:center;
  height:100%;padding:60px 80px;
  background:linear-gradient(135deg,${NAVY} 0%,${DEEP_BLUE} 100%);
}
.ch-label{font-family:'Poppins',sans-serif;font-weight:600;font-size:14px;
  color:${ACCENT};letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px;}
.ch-title{font-family:'Poppins',sans-serif;font-weight:800;font-size:56px;
  color:#ffffff;line-height:1.15;margin-bottom:12px;max-width:780px;}
.ch-sub{font-size:20px;color:rgba(255,255,255,.65);margin-bottom:40px;max-width:680px;}
.academy{position:absolute;top:28px;right:32px;font-size:13px;color:rgba(255,255,255,.45);
  font-weight:500;letter-spacing:.02em;}
.accent-line{width:60px;height:4px;background:${ACCENT};border-radius:2px;margin-bottom:28px;}
</style></head><body>
<div class="hero">
  <div class="ch-label">Chapter ${s.chapter_number} of ${s.total_chapters}</div>
  <div class="accent-line"></div>
  <div class="ch-title">${esc(s.chapter_title)}</div>
  <div class="ch-sub">${esc(s.chapter_subtitle || '')}</div>
  <div style="display:flex;gap:6px;align-items:center;">${dots}</div>
</div>
<div class="academy">TechNuggets Academy</div>
</body></html>`;
}

function buildConceptSlide(s, index, total, input) {
  const bullets = (s.bullets || []).slice(0, 6)
    .map(b => `<li style="padding:10px 0 10px 20px;border-left:3px solid ${ACCENT};
      margin-bottom:10px;font-size:19px;line-height:1.45;color:#374151;
      list-style:none;">${esc(b)}</li>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}</style></head><body>
${accentBar()}
<div style="padding:40px 56px 80px;height:100%;display:flex;flex-direction:column;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:12px;">Concept</div>
  <h1 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:38px;
    color:${NAVY};margin-bottom:28px;max-width:900px;line-height:1.2;">${esc(s.title)}</h1>
  <ul style="list-style:none;flex:1;">${bullets}</ul>
</div>
<div style="position:absolute;bottom:22px;left:56px;display:flex;gap:5px;">${progressDots(index, total)}</div>
${chapterBadge(input)}
</body></html>`;
}

function buildCodeSlide(s, index, total, input) {
  const code = esc(s.code || '').replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}
.code-block{
  background:#f8f9fa;border:1.5px solid #e5e7eb;border-radius:8px;
  padding:20px 24px;font-family:'JetBrains Mono',monospace;font-size:16px;
  line-height:1.7;color:#1e293b;overflow:hidden;max-height:380px;
  margin-top:16px;
  box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.lang-badge{
  display:inline-block;background:${ACCENT};color:#fff;
  font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;
  font-family:'DM Sans',sans-serif;letter-spacing:.04em;margin-bottom:8px;
}
</style></head><body>
${accentBar()}
<div style="padding:36px 56px 80px;height:100%;display:flex;flex-direction:column;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:10px;">Code Example</div>
  <h1 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:30px;
    color:${NAVY};margin-bottom:6px;">${esc(s.title)}</h1>
  <div class="lang-badge">${esc(s.language || 'code')}</div>
  <div class="code-block">${code}</div>
  ${s.explanation ? `<p style="font-size:15px;color:#6b7280;margin-top:14px;">${esc(s.explanation)}</p>` : ''}
</div>
<div style="position:absolute;bottom:22px;left:56px;display:flex;gap:5px;">${progressDots(index, total)}</div>
${chapterBadge(input)}
</body></html>`;
}

function buildAnalogySlide(s, index, total, input) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}
.pane{flex:1;padding:28px 32px;border-radius:12px;display:flex;flex-direction:column;gap:10px;}
.pane-label{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;}
.pane-content{font-size:22px;font-weight:600;line-height:1.35;}
.vs{font-family:'Poppins',sans-serif;font-weight:800;font-size:28px;color:#d1d5db;
  display:flex;align-items:center;padding:0 8px;}
</style></head><body>
${accentBar()}
<div style="padding:36px 56px 80px;height:100%;display:flex;flex-direction:column;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:10px;">Think of it like…</div>
  <h1 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:34px;
    color:${NAVY};margin-bottom:24px;">${esc(s.title)}</h1>
  <div style="display:flex;gap:8px;flex:1;align-items:stretch;">
    <div class="pane" style="background:#fff7ed;border:1.5px solid #fed7aa;">
      <div class="pane-label" style="color:#ea580c;">${esc(s.simple_label || 'Everyday analogy')}</div>
      <div class="pane-content" style="color:#9a3412;">${esc(s.analogy_left || '')}</div>
    </div>
    <div class="vs">↔</div>
    <div class="pane" style="background:#eff6ff;border:1.5px solid #bfdbfe;">
      <div class="pane-label" style="color:#1d4ed8;">${esc(s.tech_label || 'Technical concept')}</div>
      <div class="pane-content" style="color:#1e3a8a;">${esc(s.analogy_right || '')}</div>
    </div>
  </div>
</div>
<div style="position:absolute;bottom:22px;left:56px;display:flex;gap:5px;">${progressDots(index, total)}</div>
${chapterBadge(input)}
</body></html>`;
}

function buildDiagramSlide(s, index, total, input) {
  const mermaidCode = esc(s.mermaid_code || 'flowchart LR\n  A[Start] --> B[End]');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'default',themeVariables:{primaryColor:'${ACCENT}',primaryTextColor:'#ffffff',primaryBorderColor:'${ACCENT}',lineColor:'${NAVY}',fontFamily:'DM Sans'}});</script>
<style>${BASE_CSS}
.diagram-wrap{flex:1;display:flex;justify-content:center;align-items:center;padding:8px;}
</style></head><body>
${accentBar()}
<div style="padding:36px 56px 80px;height:100%;display:flex;flex-direction:column;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:10px;">Diagram</div>
  <h1 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:32px;
    color:${NAVY};margin-bottom:16px;">${esc(s.title)}</h1>
  <div class="diagram-wrap">
    <div class="mermaid">${mermaidCode}</div>
  </div>
</div>
<div style="position:absolute;bottom:22px;left:56px;display:flex;gap:5px;">${progressDots(index, total)}</div>
${chapterBadge(input)}
</body></html>`;
}

function buildQuizSlide(s, input) {
  const options = (s.options || []).map((opt, i) => {
    const isCorrect = i === s.correct;
    return `<div style="
      padding:14px 20px;border-radius:8px;border:2px solid;
      border-color:${isCorrect ? ACCENT : '#e5e7eb'};
      background:${isCorrect ? `rgba(233,69,96,.07)` : '#f9fafb'};
      font-size:16px;font-weight:${isCorrect ? '600' : '400'};
      color:${isCorrect ? ACCENT : '#374151'};
      display:flex;align-items:center;gap:12px;
    ">
      <span style="width:26px;height:26px;border-radius:50%;
        background:${isCorrect ? ACCENT : '#e5e7eb'};
        color:${isCorrect ? '#fff' : '#6b7280'};
        display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;flex-shrink:0;">
        ${String.fromCharCode(65 + i)}
      </span>
      ${esc(opt)}
      ${isCorrect ? '<span style="margin-left:auto;font-size:18px;">✓</span>' : ''}
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}</style></head><body>
${accentBar()}
<div style="padding:40px 56px 32px;height:100%;display:flex;flex-direction:column;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:10px;">✅ Check Your Understanding</div>
  <h2 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:26px;
    color:${NAVY};margin-bottom:28px;max-width:900px;line-height:1.35;">${esc(s.question || '')}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;align-content:start;">
    ${options}
  </div>
</div>
${chapterBadge(input)}
</body></html>`;
}

function buildChapterSummarySlide(s, input) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>${BASE_CSS}</style></head><body>
${accentBar()}
<div style="padding:44px 56px;height:100%;display:flex;flex-direction:column;justify-content:center;">
  <div style="font-size:12px;font-weight:600;color:${ACCENT};letter-spacing:.1em;
    text-transform:uppercase;margin-bottom:16px;">Chapter Wrap-Up</div>
  <h1 style="font-family:'Poppins',sans-serif;font-weight:800;font-size:40px;
    color:${NAVY};margin-bottom:28px;">Chapter Complete! 🎉</h1>
  ${s.key_takeaway ? `
  <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;
    padding:18px 22px;margin-bottom:24px;">
    <div style="font-size:12px;font-weight:700;color:#ea580c;margin-bottom:6px;
      letter-spacing:.08em;text-transform:uppercase;">Key Takeaway</div>
    <div style="font-size:18px;font-weight:600;color:#9a3412;">${esc(s.key_takeaway)}</div>
  </div>` : ''}
  ${s.next_chapter ? `
  <div style="display:flex;align-items:center;gap:12px;font-size:16px;color:#6b7280;">
    <span>Up next:</span>
    <span style="font-weight:600;color:${NAVY};">${esc(s.next_chapter)}</span>
    <span style="color:${ACCENT};font-size:20px;">→</span>
  </div>` : ''}
  <div style="margin-top:24px;display:flex;gap:16px;font-size:15px;color:#9ca3af;">
    <span>👍 Like if this helped</span>
    <span>·</span>
    <span>🔔 Subscribe for more chapters</span>
  </div>
</div>
<div style="position:absolute;bottom:22px;right:32px;font-size:12px;color:#9ca3af;font-weight:500;">
  TechNuggets Academy
</div>
</body></html>`;
}

// ── Step 5: Timing distribution ───────────────────────────────────────────────

function distributeTimings(sections, totalDuration) {
  const TITLE_DUR   = 5;
  const SUMMARY_DUR = 8;
  const QUIZ_DUR    = 8;

  const fixed = sections.filter(s =>
    ['chapter_title','chapter_summary','quiz'].includes(s.type));
  const dynamic = sections.filter(s =>
    !['chapter_title','chapter_summary','quiz'].includes(s.type));

  const fixedTotal = fixed.reduce((sum, s) => {
    if (s.type === 'chapter_title')  return sum + TITLE_DUR;
    if (s.type === 'chapter_summary') return sum + SUMMARY_DUR;
    if (s.type === 'quiz')           return sum + QUIZ_DUR;
    return sum;
  }, 0);

  const remaining = Math.max(totalDuration - fixedTotal, dynamic.length * 2);
  const dynSum    = dynamic.reduce((s, sl) => s + (sl.duration_seconds || 30), 0);

  return sections.map(s => {
    if (s.type === 'chapter_title')   return { ...s, duration: TITLE_DUR };
    if (s.type === 'chapter_summary') return { ...s, duration: SUMMARY_DUR };
    if (s.type === 'quiz')            return { ...s, duration: QUIZ_DUR };
    return { ...s, duration: Math.max(((s.duration_seconds || 30) / dynSum) * remaining, 2) };
  });
}

// ── Step 6: Composite ─────────────────────────────────────────────────────────

async function composite(ffmpeg, ffprobe, sections, heygenPath, outPath) {
  const FPS  = 30;
  const FADE = 0.4;

  // 6a: slide segments
  const segPaths = [];
  for (let i = 0; i < sections.length; i++) {
    const s   = sections[i];
    const dur = s.duration;
    const seg = path.join(TEMP_DIR, `seg-${i}.mp4`);
    const fadeOutStart = Math.max(0, dur - FADE).toFixed(3);

    execSync(
      `"${ffmpeg}" -y -loop 1 -framerate ${FPS} -i "${path.join(SLIDES_DIR, `slide-${i}.png`)}" ` +
      `-vf "scale=1280:720:flags=lanczos,fade=t=in:st=0:d=${FADE},fade=t=out:st=${fadeOutStart}:d=${FADE}" ` +
      `-t ${dur.toFixed(3)} -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p "${seg}"`,
      { stdio: 'pipe' }
    );
    segPaths.push(seg);
    log(`   ✓ seg-${i}.mp4 (${dur.toFixed(1)}s)`);
  }

  // 6b: concat
  const concatFile = path.join(TEMP_DIR, 'concat.txt');
  fs.writeFileSync(concatFile, segPaths.map(p => `file '${p.replace(/'/g,"'\\''")}'`).join('\n') + '\n');

  const slideshowPath = path.join(TEMP_DIR, 'slideshow.mp4');
  execSync(
    `"${ffmpeg}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${slideshowPath}"`,
    { stdio: 'pipe' }
  );
  log('   ✓ slideshow.mp4 assembled');

  // 6c: PIP composite
  const hasAudio  = hasAudioStream(ffprobe, heygenPath);
  const overlayExpr = { 'bottom-right': 'W-w-20:H-h-20', 'bottom-left': '20:H-h-20', 'top-right': 'W-w-20:20' }[PIP_POSITION] || 'W-w-20:H-h-20';

  let probeOut = '';
  try {
    probeOut = execSync(
      `"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${heygenPath}"`,
      { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
    ).trim();
  } catch {}

  const [avW, avH] = probeOut.split(',').map(Number);
  const isPortrait = avH > avW;
  const pipScaleFilter = isPortrait
    ? `[1:v]scale=-2:${PIP_HEIGHT}:flags=lanczos[av_scaled]`
    : `[1:v]scale=${PIP_WIDTH}:-2:flags=lanczos[av_scaled]`;

  const filterComplex = [
    `[0:v]scale=1280:720:flags=lanczos[bg]`,
    `${pipScaleFilter}`,
    `[av_scaled]pad=iw+6:ih+6:3:3:color=white[av_bordered]`,
    `[bg][av_bordered]overlay=${overlayExpr}[outv]`,
  ].join(';');

  const audioMapArgs = hasAudio
    ? ['-map','[outv]','-map','1:a','-c:a','aac','-b:a','192k']
    : ['-map','[outv]','-an'];

  const ffmpegArgs = [
    '-y', '-i', slideshowPath, '-i', heygenPath,
    '-filter_complex', filterComplex,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    ...audioMapArgs, outPath,
  ];

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ffmpegArgs, { stdio: ['ignore','pipe','pipe'] });
    proc.stderr.on('data', d => {
      const line = d.toString();
      if (line.includes('error') || line.includes('Error') || line.includes('time='))
        log(`   FFmpeg: ${line.trim()}`);
    });
    proc.on('close', code => {
      if (code !== 0) {
        log(`❌ FFmpeg exited ${code}`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      } else resolve();
    });
  });

  log(`   ✓ ${path.basename(outPath)} written`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVideoDuration(ffprobe, p) {
  const out = execSync(
    `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`,
    { encoding: 'utf8' }
  ).trim();
  const d = parseFloat(out);
  if (isNaN(d) || d <= 0) die(`Cannot read duration from ${p}`);
  return d;
}

function hasAudioStream(ffprobe, p) {
  try {
    return execSync(
      `"${ffprobe}" -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${p}"`,
      { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
    ).trim().includes('audio');
  } catch { return false; }
}

function findBinary(name) {
  for (const bin of [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`, name]) {
    try { execSync(`"${bin}" -version 2>&1`, { stdio: 'ignore' }); return bin; } catch {}
  }
  throw new Error(`"${name}" not found. Install: brew install ffmpeg`);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function log(msg) { console.log(msg); }
function die(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }

// ── Run ───────────────────────────────────────────────────────────────────────
main().catch(err => { console.error('\n❌ Render failed:', err.message); process.exit(1); });
