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

// Chapter number: argv wins over whatever is in the JSON
const CHAPTER_NUM  = process.argv[2] ? parseInt(process.argv[2]) : null;
const PADDED_NUM   = CHAPTER_NUM ? String(CHAPTER_NUM).padStart(2, '0') : null;
const CHAPTER_DIR  = CHAPTER_NUM
  ? path.join(__dirname, 'chapters', `chapter-${PADDED_NUM}`)
  : null;

console.log(`\n📚 Course Render${CHAPTER_NUM ? ` — Chapter ${CHAPTER_NUM}` : ''}`);

// Set in main() once chapter paths are resolved
let SLIDES_DIR, TEMP_DIR;

// ── Path helpers ──────────────────────────────────────────────────────────────

function getInputPath() {
  // Check chapter-specific dir first (argv chapter number)
  if (CHAPTER_DIR) {
    const chapterInput = path.join(CHAPTER_DIR, 'course-render-input.json');
    if (fs.existsSync(chapterInput)) return chapterInput;
  }
  // Numbered root file: course-render-input-2.json
  if (CHAPTER_NUM) {
    const numberedRoot = path.join(__dirname, '..', `course-render-input-${CHAPTER_NUM}.json`);
    if (fs.existsSync(numberedRoot)) return numberedRoot;
  }
  // Plain root fallback
  const rootInput = path.join(__dirname, '..', 'course-render-input.json');
  if (fs.existsSync(rootInput)) return rootInput;
  throw new Error(
    'No course-render-input.json found.\n' +
    'Download it from the Render tab or place it in the project root.'
  );
}

function setupChapterPaths(chapterNum) {
  const paddedNum  = String(chapterNum).padStart(2, '0');
  const chapterDir = CHAPTER_DIR || path.join(__dirname, 'chapters', `chapter-${paddedNum}`);
  return {
    chapterDir,
    slidesDir:  path.join(chapterDir, 'slides'),
    tempDir:    path.join(chapterDir, 'temp'),
    finalVideo: path.join(chapterDir, `chapter-${paddedNum}-final.mp4`),
  };
}

function ensureChapterDirs(paths) {
  [paths.chapterDir, paths.slidesDir, paths.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created: ${dir}`);
    }
  });
}

// ── ElevenLabs / presenter photo config ──────────────────────────────────────
const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY  || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '';
const ELEVENLABS_MODEL    = process.env.ELEVENLABS_MODEL    || 'eleven_monolingual_v1';
const PRESENTER_PHOTO     = process.env.PRESENTER_PHOTO
  || path.join(__dirname, '..', 'presenter.jpg');

// ── Brand ─────────────────────────────────────────────────────────────────────
const BRAND_FONT = `https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`;
const ACCENT     = '#e94560';
const NAVY       = '#1a1a2e';
const DEEP_BLUE  = '#16213e';

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  log('📖 Reading course-render-input.json…');

  const inputFile = getInputPath();
  log(`   Using: ${inputFile}`);
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // Validate chapter number matches argument — wrong JSON = hard fail
  if (CHAPTER_NUM && input.chapter_number !== CHAPTER_NUM) {
    const p = String(CHAPTER_NUM).padStart(2, '0');
    console.error(`\n⚠️  Chapter mismatch!`);
    console.error(`   Argument says: Chapter ${CHAPTER_NUM}`);
    console.error(`   JSON file says: Chapter ${input.chapter_number}`);
    console.error(`   The render input file contains data for the wrong chapter.`);
    console.error(`   Fix: click "📋 Prepare" for Chapter ${CHAPTER_NUM} in the app,`);
    console.error(`   then move the downloaded file to:`);
    console.error(`   render/chapters/chapter-${p}/course-render-input.json`);
    process.exit(1);
  }

  const {
    course_title, chapter_number, chapter_title, chapter_subtitle,
    total_chapters, script, duration_mins, key_takeaway,
    quiz_questions = [], concepts = [],
    output_filename,
  } = input;

  if (!script) die('script is missing from course-render-input.json');

  // Set up chapter-specific directory structure using the effective chapter number
  const PATHS = setupChapterPaths(chapter_number);
  SLIDES_DIR = PATHS.slidesDir;
  TEMP_DIR   = PATHS.tempDir;
  ensureChapterDirs(PATHS);

  log(`   Chapter: ${chapter_number} — ${chapter_title}`);
  log(`   Slides:  ${PATHS.slidesDir}`);
  log(`   Output:  ${PATHS.finalVideo}`);

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

  // ── Step 4: Generate voice audio with ElevenLabs ────────────────────────
  const audioPath = path.join(TEMP_DIR, 'narration.mp3');
  let hasAudio = false;

  if (ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
    log('\n🎙️  Step 4 — Generating voice audio with ElevenLabs…');
    try {
      const { generateAudio } = require('./elevenlabs.js');
      await generateAudio(script, ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY, audioPath, ELEVENLABS_MODEL);
      hasAudio = true;
      log('   ✓ Audio generated successfully');
    } catch (e) {
      log(`   ❌ Audio generation failed: ${e.message}`);
      log('   Continuing without audio…');
    }
  } else {
    log('\n⏭  Step 4 — Skipping audio (ElevenLabs not configured)');
    log('   Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to .env for voice narration.');
  }

  // ── Step 5: Determine total duration + distribute slide timings ──────────
  let totalDuration;
  if (hasAudio) {
    const { getAudioDuration } = require('./elevenlabs.js');
    totalDuration = getAudioDuration(audioPath);
    log(`\n⏱  Step 5 — Audio duration: ${totalDuration.toFixed(2)}s`);
  } else {
    // Estimate from word count (150 words per minute)
    const wordCount = script.split(/\s+/).filter(Boolean).length;
    totalDuration = (wordCount / 150) * 60;
    log(`\n⏱  Step 5 — Estimated duration: ${totalDuration.toFixed(2)}s (${wordCount} words)`);
  }

  const timed = distributeTimings(allSections, totalDuration);
  timed.forEach((s, i) => log(`   Slide ${i + 1}: ${s.duration.toFixed(1)}s — ${s.type}`));

  // ── Step 6: Composite slides + audio + presenter photo ───────────────────
  const hasPhoto = fs.existsSync(PRESENTER_PHOTO);
  if (!hasPhoto) {
    log('\n⚠️  No presenter photo found — rendering without PIP overlay.');
    log(`   Add presenter.jpg to project root: ${path.join(__dirname, '..', 'presenter.jpg')}`);
  }

  log('\n🎬 Step 6 — Compositing with FFmpeg…');
  const outPath = PATHS.finalVideo;
  await compositeVideo(ffmpeg, timed, audioPath, PRESENTER_PHOTO, hasAudio, hasPhoto, outPath, totalDuration);

  log(`\n✅ Done: ${outPath}`);
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
- "concept"   : explanation slide with title + bullets (use for theory)
- "code"      : static code display with syntax highlight (use for showing a finished snippet)
- "live_code" : animated Jupyter-style cell — choose this when the script says "let me show you", "let's try", "let's write", "here's how we do this", or is demonstrating a function, walking through execution, or showing input → output
- "analogy"   : split-pane analogy vs technical (use for real-world comparisons)
- "diagram"   : Mermaid.js diagram — use flowchart LR (left-to-right) for process flows, flowchart TD for hierarchies. Maximum 8 nodes, short labels (2-4 words). No subgraphs, no style blocks, simple arrows only. LR fills horizontal space better.

For live_code slides:
- Write syntactically correct Python (or the course language) that actually runs
- output must look authentic: realistic column names, plausible numbers, real error tracebacks
- output_type choices: "text" (print output), "dataframe" (tabular data), "plot" ("[matplotlib plot displayed]"), "error" (intentional mistake when teaching error handling)
- Keep code_lines to 8 lines max so it fits the slide
- setup_comment is a single # comment line explaining intent

Rules:
- 6-10 slides per chapter
- Each slide covers ONE focused idea
- Keep bullets to 3-5 per slide
- Prefer "live_code" over "code" whenever demonstrating execution
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
    "mermaid_code": "flowchart LR\\n  A[Input] --> B[Process]\\n  B --> C[Output]\\n  B --> D[Log]",
    "duration_seconds": 35
  },
  {
    "type": "live_code",
    "title": "Loading Our Dataset",
    "language": "python",
    "setup_comment": "# Let's load our first dataset",
    "code_lines": [
      "import pandas as pd",
      "",
      "df = pd.read_csv('sales_data.csv')",
      "df.head()"
    ],
    "output": "   name  age  salary\\n0  Alice   28   75000\\n1  Bob     32   82000\\n2  Carol   25   68000",
    "output_type": "dataframe",
    "explanation": "Pandas loaded our CSV into a DataFrame with 3 columns",
    "duration_seconds": 50
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
    analogy: 800, diagram: 4000, quiz: 800, chapter_summary: 800,
    live_code: 0, // computed dynamically below
  };

  for (let i = 0; i < total; i++) {
    const s       = sections[i];
    const html    = buildSlideHTML(s, i, total, input);
    const htmlPath = path.join(SLIDES_DIR, `slide-${String(i).padStart(2,'0')}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    if (s.type === 'diagram') {
      // Wait for Mermaid to render, then scale SVG to fill the container
      await new Promise(r => setTimeout(r, 2500));

      const diagramSize = await page.evaluate(() => {
        const svg       = document.querySelector('.mermaid svg');
        if (!svg) return { width: 0, height: 0 };

        const container = document.querySelector('.diagram-container');
        const cW = container ? container.clientWidth  - 32 : 1160;
        const cH = container ? container.clientHeight - 32 : 380;

        // Read natural dimensions from viewBox or bbox
        let svgW = 0, svgH = 0;
        const vb = svg.viewBox?.baseVal;
        if (vb && vb.width) { svgW = vb.width; svgH = vb.height; }
        if (!svgW) {
          try { const bb = svg.getBBox(); svgW = bb.width; svgH = bb.height; } catch {}
        }
        if (!svgW) { svgW = svg.clientWidth || 400; svgH = svg.clientHeight || 300; }

        if (svgW > 0 && svgH > 0) {
          // Ensure viewBox is set
          if (!svg.getAttribute('viewBox')) {
            svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
          }
          const scale = Math.min((cW / svgW), (cH / svgH), 2.5);
          svg.style.width    = (svgW * scale) + 'px';
          svg.style.height   = (svgH * scale) + 'px';
          svg.style.maxWidth  = 'none';
          svg.style.maxHeight = 'none';
        }

        const rect = svg.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      if (diagramSize.width < 300) {
        log(`     ⚠ Diagram too small (${diagramSize.width}px) — converting to concept`);
        sections[i] = { type: 'concept', title: s.title, bullets: s.bullets || [], duration_seconds: s.duration_seconds };
        const fallbackHtml = buildSlideHTML(sections[i], i, total, input);
        fs.writeFileSync(htmlPath, fallbackHtml, 'utf8');
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15_000 });
        await page.evaluateHandle('document.fonts.ready');
        await new Promise(r => setTimeout(r, 800));
      }
    }

    let wait = WAIT_MS[s.type] ?? 1000;
    if (s.type === 'live_code') {
      const totalChars = (s.code_lines || []).join('').length;
      wait = Math.min(totalChars * 70 + 2000, 8000);
    }
    await new Promise(r => setTimeout(r, wait));

    await page.screenshot({
      path: path.join(SLIDES_DIR, `slide-${String(i).padStart(2,'0')}.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    log(`   ✓ slide-${String(i).padStart(2,'0')}.png (${s.type})`);
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
    case 'live_code':      return buildLiveCodeSlide(section, index, total, input);
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

function buildLiveCodeSlide(s, index, total, input) {
  const codeLines   = s.code_lines || [];
  const output      = s.output || '';
  const outputType  = s.output_type || 'text';
  const setupCmt    = s.setup_comment || '';
  const explanation = s.explanation || '';

  // Build output HTML based on type
  function buildOutputHtml(out, type) {
    if (!out) return '';
    const escaped = out.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (type === 'dataframe') {
      const rows = escaped.split('\\n');
      const header = rows[0];
      const body   = rows.slice(1).join('<br>');
      return `<div style="font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.8;color:#e2e8f0;">
        <div style="color:#63b3ed;border-bottom:1px solid #2d3748;margin-bottom:4px;padding-bottom:4px;">${header}</div>
        <div>${body}</div></div>`;
    }
    if (type === 'error') {
      return `<div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#fc8181;line-height:1.6;">${escaped.replace(/\\n/g,'<br>')}</div>`;
    }
    if (type === 'plot') {
      return `<div style="font-size:15px;color:#68d391;font-style:italic;">${escaped}</div>`;
    }
    return `<div style="font-family:'JetBrains Mono',monospace;font-size:15px;color:#e2e8f0;line-height:1.6;white-space:pre;">${escaped}</div>`;
  }

  const outputHtml = buildOutputHtml(output, outputType);

  // Inject data as JSON so the in-browser script can type it out
  const codeLinesJson = JSON.stringify(codeLines);
  const setupJson     = JSON.stringify(setupCmt);
  const explainJson   = JSON.stringify(explanation);
  const outputJson    = JSON.stringify(output);

  const LIVE_FONT = `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${LIVE_FONT}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1280px;height:720px;background:#1a1a2e;font-family:'Inter',sans-serif;overflow:hidden;position:relative;}
.top-bar{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e94560,#0f3460,#e94560);}
.nb-header{position:absolute;top:3px;left:0;right:0;height:44px;background:#16213e;
  border-bottom:1px solid #0f3460;display:flex;align-items:center;padding:0 20px;gap:12px;}
.nb-title{font-size:14px;color:#a0aec0;}
.kernel{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:#68d391;}
.kdot{width:8px;height:8px;border-radius:50%;background:#68d391;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.nb-body{position:absolute;top:47px;left:0;right:0;bottom:200px;padding:14px 20px;overflow:hidden;}
.cell{margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;}
.cell-num{font-family:'JetBrains Mono',monospace;font-size:12px;color:#4a5568;min-width:44px;
  padding-top:12px;text-align:right;flex-shrink:0;}
.cell-num.running{color:#e94560;}
.cell-content{flex:1;min-width:0;}
.input-cell{background:#0d1117;border:1px solid #30363d;border-left:3px solid #e94560;
  border-radius:4px;padding:10px 14px;}
.code-line{font-family:'JetBrains Mono',monospace;font-size:16px;line-height:1.65;
  color:#e6edf3;white-space:pre;min-height:26px;}
.cursor{display:inline-block;width:2px;height:17px;background:#e94560;
  vertical-align:text-bottom;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.output-cell{background:#0a0e1a;border:1px solid #1a2744;border-left:3px solid #0f3460;
  border-radius:4px;padding:10px 14px;margin-top:4px;display:none;}
.output-cell.show{display:block;}
.expl-bar{position:absolute;bottom:200px;left:0;right:0;background:rgba(233,69,96,.1);
  border-top:1px solid rgba(233,69,96,.3);padding:7px 20px;font-size:14px;
  color:#feb2c0;display:none;}
.expl-bar.show{display:flex;align-items:center;gap:8px;}
.slide-brand{position:absolute;bottom:208px;right:18px;font-size:11px;color:#2d3748;}
.slide-dots{position:absolute;bottom:180px;left:20px;display:flex;gap:5px;}
/* syntax colours */
.kw{color:#ff7b72}.fn{color:#d2a8ff}.st{color:#a5d6ff}
.cm{color:#6e7681;font-style:italic}.nm{color:#79c0ff}
</style>
</head><body>
<div class="top-bar"></div>
<div class="nb-header">
  <span style="font-size:18px;">📓</span>
  <span class="nb-title">Chapter ${input.chapter_number} — ${esc(input.chapter_title || '')}.ipynb</span>
  <div class="kernel"><div class="kdot"></div>Python 3 (ipykernel)</div>
</div>
<div class="nb-body">
  <div class="cell">
    <div class="cell-num">[ ]:</div>
    <div class="cell-content">
      <div class="input-cell">
        <div class="code-line cm" id="setup-line"></div>
      </div>
    </div>
  </div>
  <div class="cell">
    <div class="cell-num running" id="cell-num">[ ]:</div>
    <div class="cell-content">
      <div class="input-cell">
        <div id="code-display"></div>
        <span class="cursor" id="cursor"></span>
      </div>
      <div class="output-cell" id="output-cell">
        <div id="output-content"></div>
      </div>
    </div>
  </div>
</div>
<div class="expl-bar" id="expl-bar">💡 <span id="expl-text"></span></div>
<div class="slide-brand">TechNuggets Academy · Ch ${input.chapter_number}</div>
<div class="slide-dots">${progressDots(index, total)}</div>
<script>
const CODE_LINES  = ${codeLinesJson};
const SETUP_CMT   = ${setupJson};
const OUTPUT      = ${outputJson};
const OUTPUT_TYPE = ${JSON.stringify(outputType)};
const EXPLANATION = ${explainJson};

function hl(line) {
  if (!line.trim()) return '\\u00a0';
  let h = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (h.trim().startsWith('#')) return '<span class="cm">'+h+'</span>';
  h = h.replace(/(['"])(.*?)\\1/g,'<span class="st">$1$2$1</span>');
  ['import','from','as','def','class','return','if','elif','else',
   'for','while','in','not','and','or','True','False','None',
   'with','try','except','raise','lambda'].forEach(k => {
    h = h.replace(new RegExp('\\\\b('+k+')\\\\b','g'),'<span class="kw">$1</span>');
  });
  h = h.replace(/\\b(\\d+\\.?\\d*)\\b/g,'<span class="nm">$1</span>');
  return h;
}

function buildOutput(out, type) {
  if (!out) return '';
  const e = out.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (type === 'dataframe') {
    const rows = e.split('\\n');
    return '<div style="font-family:JetBrains Mono,monospace;font-size:14px;line-height:1.8;color:#e2e8f0;">'
      + '<div style="color:#63b3ed;border-bottom:1px solid #2d3748;padding-bottom:4px;margin-bottom:4px;">'+rows[0]+'</div>'
      + rows.slice(1).map(r=>'<div>'+r+'</div>').join('')+'</div>';
  }
  if (type === 'error') return '<div style="font-family:JetBrains Mono,monospace;font-size:14px;color:#fc8181;line-height:1.6;">'+e.replace(/\\n/g,'<br>')+'</div>';
  if (type === 'plot')  return '<div style="font-size:15px;color:#68d391;font-style:italic;">'+e+'</div>';
  return '<div style="font-family:JetBrains Mono,monospace;font-size:15px;color:#e2e8f0;line-height:1.6;white-space:pre;">'+e+'</div>';
}

async function run() {
  const display = document.getElementById('code-display');
  const cursor  = document.getElementById('cursor');
  const cellNum = document.getElementById('cell-num');

  document.getElementById('setup-line').innerHTML = hl(SETUP_CMT);

  for (let i = 0; i < CODE_LINES.length; i++) {
    const line = CODE_LINES[i];
    const el = document.createElement('div');
    el.className = 'code-line';
    display.appendChild(el);
    for (let c = 0; c <= line.length; c++) {
      el.innerHTML = c === 0 ? '\\u00a0' : hl(line.substring(0, c));
      await new Promise(r => setTimeout(r, 28 + Math.random()*44));
    }
    await new Promise(r => setTimeout(r, 90));
  }

  cursor.style.display = 'none';
  cellNum.textContent = '[*]:';
  await new Promise(r => setTimeout(r, 600));

  cellNum.textContent = '[1]:';
  const outEl = document.getElementById('output-cell');
  document.getElementById('output-content').innerHTML = buildOutput(OUTPUT, OUTPUT_TYPE);
  outEl.classList.add('show');

  await new Promise(r => setTimeout(r, 350));
  const explBar = document.getElementById('expl-bar');
  document.getElementById('expl-text').textContent = EXPLANATION;
  explBar.classList.add('show');
}

run();
</script>
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
  // Raw code — do NOT html-escape, Mermaid needs the literal characters
  const mermaidCode = (s.mermaid_code || 'flowchart LR\n  A[Start] --> B[End]').trim();

  const dots = progressDots(index, total);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<link href="${BRAND_FONT}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1280px;height:720px;background:#ffffff;font-family:'DM Sans',system-ui,sans-serif;
  overflow:hidden;position:relative;}
.top-bar{position:absolute;top:0;left:0;right:0;height:4px;
  background:linear-gradient(90deg,${ACCENT},${DEEP_BLUE});}
.type-label{position:absolute;top:16px;left:60px;font-size:12px;font-weight:600;
  color:${ACCENT};letter-spacing:.12em;text-transform:uppercase;}
.slide-title{position:absolute;top:34px;left:60px;right:360px;
  font-family:'Poppins',sans-serif;font-weight:700;font-size:30px;
  color:${NAVY};line-height:1.2;}
.diagram-container{position:absolute;top:96px;left:40px;right:40px;bottom:215px;
  display:flex;align-items:center;justify-content:center;
  background:#fafafa;border-radius:8px;border:1px solid #f0f0f0;
  overflow:hidden;padding:16px;}
.mermaid{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
.mermaid svg{max-width:100%!important;max-height:100%!important;}
.progress{position:absolute;bottom:185px;left:60px;display:flex;gap:6px;align-items:center;}
.brand{position:absolute;bottom:188px;right:60px;font-size:12px;color:#d1d5db;font-weight:500;}
</style>
</head><body>
<div class="top-bar"></div>
<div class="type-label">Diagram</div>
<div class="slide-title">${esc(s.title)}</div>
<div class="diagram-container">
  <div class="mermaid">${mermaidCode}</div>
</div>
<div class="progress">${dots}</div>
<div class="brand">${esc(input.course_title || 'TechNuggets Academy')} · Ch ${input.chapter_number}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  fontSize: 20,
  flowchart: { nodeSpacing: 60, rankSpacing: 80, padding: 24, useMaxWidth: false, htmlLabels: true },
  themeVariables: {
    fontSize: '20px',
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#fde8ec',
    primaryTextColor: '${NAVY}',
    primaryBorderColor: '${ACCENT}',
    lineColor: '${DEEP_BLUE}',
    secondaryColor: '#e8f0fe',
    tertiaryColor: '#f0fdf4',
  }
});
</script>
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

async function compositeVideo(ffmpeg, sections, audioPath, photoPath, hasAudio, hasPhoto, outPath, totalDuration) {
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
      `"${ffmpeg}" -y -loop 1 -framerate ${FPS} -i "${path.join(SLIDES_DIR, `slide-${String(i).padStart(2,'0')}.png`)}" ` +
      `-vf "scale=1280:720:flags=lanczos,fade=t=in:st=0:d=${FADE},fade=t=out:st=${fadeOutStart}:d=${FADE}" ` +
      `-t ${dur.toFixed(3)} -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p "${seg}"`,
      { stdio: 'pipe' }
    );
    segPaths.push(seg);
    log(`   ✓ seg-${i}.mp4 (${dur.toFixed(1)}s)`);
  }

  // 6b: concat slideshow
  const concatFile = path.join(TEMP_DIR, 'concat.txt');
  fs.writeFileSync(concatFile, segPaths.map(p => `file '${p.replace(/'/g,"'\\''")}'`).join('\n') + '\n');

  const slideshowPath = path.join(TEMP_DIR, 'slideshow.mp4');
  execSync(
    `"${ffmpeg}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${slideshowPath}"`,
    { stdio: 'pipe' }
  );
  log('   ✓ slideshow.mp4 assembled');

  // 6c: final composite
  let ffmpegArgs;

  if (hasAudio && hasPhoto) {
    log('   Mode: Slides + Audio + Photo PIP');
    ffmpegArgs = [
      '-y',
      '-i', slideshowPath,          // 0: slideshow
      '-i', audioPath,              // 1: narration audio
      '-loop', '1', '-i', photoPath, // 2: presenter photo (static)
      '-filter_complex', [
        '[0:v]scale=1280:720:flags=lanczos[bg]',
        '[2:v]scale=320:-2:flags=lanczos[photo_scaled]',
        '[photo_scaled]pad=iw+6:ih+6:3:3:color=white[photo_bordered]',
        '[bg][photo_bordered]overlay=W-w-20:H-h-20[outv]',
      ].join(';'),
      '-map', '[outv]', '-map', '1:a',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest', outPath,
    ];

  } else if (hasAudio && !hasPhoto) {
    log('   Mode: Slides + Audio (no PIP)');
    ffmpegArgs = [
      '-y',
      '-i', slideshowPath,
      '-i', audioPath,
      '-filter_complex', '[0:v]scale=1280:720:flags=lanczos[outv]',
      '-map', '[outv]', '-map', '1:a',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest', outPath,
    ];

  } else if (!hasAudio && hasPhoto) {
    log('   Mode: Slides + Photo PIP (silent)');
    ffmpegArgs = [
      '-y',
      '-i', slideshowPath,
      '-loop', '1', '-i', photoPath,
      '-filter_complex', [
        '[0:v]scale=1280:720:flags=lanczos[bg]',
        '[1:v]scale=320:-2:flags=lanczos[photo_scaled]',
        '[photo_scaled]pad=iw+6:ih+6:3:3:color=white[photo_bordered]',
        '[bg][photo_bordered]overlay=W-w-20:H-h-20[outv]',
      ].join(';'),
      '-map', '[outv]',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-t', String(totalDuration), outPath,
    ];

  } else {
    log('   Mode: Slides only (silent, no PIP)');
    ffmpegArgs = [
      '-y',
      '-i', slideshowPath,
      '-filter_complex', '[0:v]scale=1280:720:flags=lanczos[outv]',
      '-map', '[outv]',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-t', String(totalDuration), outPath,
    ];
  }

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stderr.on('data', d => {
      const line = d.toString();
      if (line.includes('time=') || line.toLowerCase().includes('error'))
        log(`   FFmpeg: ${line.trim()}`);
    });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`));
      else resolve();
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
