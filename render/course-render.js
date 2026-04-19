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
 *   ANTHROPIC_API_KEY or GEMINI_API_KEY in .env · ffmpeg · npm install
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
const { callAI }   = require('./ai-client-node.js');

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

  // ── Step 4: Locate HeyGen video ─────────────────────────────────────────
  log('\n⬇  Step 4 — Locating HeyGen video…');
  const heygenVideoPath = findHeygenVideo(chapter_number);
  const tempHeygenPath  = path.join(TEMP_DIR, 'heygen-raw.mp4');
  fs.copyFileSync(heygenVideoPath, tempHeygenPath);
  log(`   ✓ Copied to temp/heygen-raw.mp4`);

  // ── Step 5: Get duration from HeyGen video ───────────────────────────────
  log('\n⏱  Step 5 — Getting video duration…');
  const totalDuration = getVideoDuration(ffprobe, tempHeygenPath);
  log(`   ✓ Total duration: ${totalDuration.toFixed(2)}s`);

  const timed = distributeTimings(allSections, totalDuration);
  timed.forEach((s, i) => log(`   Slide ${i + 1}: ${s.duration.toFixed(1)}s — ${s.type}`));

  // ── Step 6: Composite slides + HeyGen video PIP ──────────────────────────
  log('\n🎬 Step 6 — Compositing with FFmpeg…');
  const outPath        = PATHS.finalVideo;
  const ctaOverlayPath = path.join(__dirname, '..', 'cta-overlay.png');
  await compositeVideo(timed, tempHeygenPath, outPath, totalDuration, ctaOverlayPath, input);

  log(`\n✅ Done: ${outPath}`);
}

// ── Step 1: Split script into sections ───────────────────────────────────────

async function splitChapterScript(script, input) {
  const sectionsText = await callAI({
    systemPrompt: `You are a course slide designer. Split a chapter video script into slides for a professional online learning platform.

Slide types available:
- "concept"     : explanation slide with title + bullets (use for theory)
- "code"        : static code display with syntax highlight (use for showing a finished snippet)
- "live_code"   : animated Jupyter-style cell — choose this when the script says "let me show you", "let's try", "let's write", "here's how we do this", or is demonstrating a function, walking through execution, or showing input → output
- "analogy"     : split-pane analogy vs technical (use for real-world comparisons)
- "diagram"     : Mermaid.js diagram — use flowchart LR (left-to-right) for process flows, flowchart TD for hierarchies. Maximum 8 nodes, short labels (2-4 words). No subgraphs, no style blocks, simple arrows only. LR fills horizontal space better.
- "portal_demo" : REQUIRED when script mentions: 'in the Azure portal', 'navigate to' any Azure service, 'click on'/'select' in a UI context, 'you will see' a screen or form, 'go to' + any Azure service name, any hands-on lab step involving the portal, 'open' any Azure blade. Generate a realistic Azure portal mockup showing exactly what the student sees. Use realistic Azure resource names (az104-lab-rg, etc), real regions, real VM sizes. Highlight fields the exam commonly tests. Always include CLI equivalent command.

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
    prompt: `Chapter: ${input.chapter_title}
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
  },
  {
    "type": "portal_demo",
    "title": "Creating a Virtual Machine",
    "portal_service": "Virtual Machines",
    "portal_action": "Create VM - Basics tab",
    "portal_url": "portal.azure.com/#create/Microsoft.VirtualMachine",
    "breadcrumb": ["Home", "Virtual machines", "Create a virtual machine"],
    "active_tab": "Basics",
    "tabs": ["Basics", "Disks", "Networking", "Management", "Tags", "Review + create"],
    "fields": [
      { "label": "Subscription", "value": "Azure subscription 1", "type": "dropdown", "highlight": false },
      { "label": "Resource group", "value": "az104-lab-rg", "type": "dropdown", "highlight": true, "highlight_reason": "Exam tip: always group resources by lifecycle" },
      { "label": "Virtual machine name", "value": "az104-vm-01", "type": "text", "highlight": false },
      { "label": "Region", "value": "(US) East US", "type": "dropdown", "highlight": true, "highlight_reason": "Region affects availability and pricing" },
      { "label": "Image", "value": "Ubuntu Server 22.04 LTS - x64 Gen2", "type": "dropdown", "highlight": false },
      { "label": "Size", "value": "Standard_D2s_v3 - 2 vcpus, 8 GiB", "type": "dropdown", "highlight": true, "highlight_reason": "Exam tests VM size naming convention" }
    ],
    "bottom_buttons": ["Review + create", "Next: Disks >"],
    "exam_callout": "D-series VMs are general purpose. Exam differentiates: B=burstable, D=general, E=memory-optimized, F=compute-optimized",
    "cli_equivalent": "az vm create --resource-group az104-lab-rg --name az104-vm-01 --image Ubuntu2204 --size Standard_D2s_v3",
    "duration_seconds": 45
  }
]`,
    maxTokens: 4000,
    action:    'slide_splitting',
  });

  const clean = sectionsText.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`No JSON array in split response:\n${sectionsText.substring(0, 200)}`);
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`Failed to parse sections: ${e.message}\n${sectionsText.substring(0, 200)}`);
  }
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
    portal_demo: 1500,
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
    case 'portal_demo':    return buildPortalDemoSlide(section, index, total, input);
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

// ── Portal Demo slide builder ─────────────────────────────────────────────────

function buildPortalDemoSlide(s, index, total, input) {
  const action  = (s.portal_action || '').toLowerCase();
  const layout  =
    (action.includes('cli') || action.includes('shell') || action.includes('command')) ? 'terminal' :
    (action.includes('metric') || action.includes('monitor'))                          ? 'metrics'  :
    (action.includes('pricing') || action.includes('cost'))                            ? 'pricing'  :
    (action.includes('list') || action.includes(' all') || action.includes('browse'))  ? 'list'     :
    (action.includes('overview') || action.includes('setting'))                        ? 'dashboard':
    'form';

  const breadcrumbs = (s.breadcrumb || ['Home', s.portal_service || 'Azure']).map(b => esc(b));
  const fields      = s.fields || [];
  const tabs        = s.tabs || ['Basics', 'Review + create'];
  const activeTab   = s.active_tab || tabs[0];
  const btns        = s.bottom_buttons || ['Review + create'];
  const examCallout = s.exam_callout || '';
  const cliCmd      = s.cli_equivalent || '';
  const title       = esc(s.title || s.portal_service || 'Azure Portal');
  const subtitle    = esc(s.portal_action || '');
  const portalUrl   = esc(s.portal_url || 'portal.azure.com');

  // ── Shared chrome (topbar, breadcrumb) ────────────────────────────────────
  const AZURE_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1280px;height:720px;font-family:'Inter','Segoe UI',sans-serif;overflow:hidden;background:#f3f2f1;font-size:13px;color:#323130;}
    .az-topbar{height:48px;background:#0078d4;display:flex;align-items:center;padding:0 16px;gap:12px;position:relative;}
    .az-logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:600;font-size:15px;}
    .az-logo-icon{width:24px;height:24px;background:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#0078d4;font-weight:800;font-size:14px;}
    .az-search{flex:1;max-width:400px;height:32px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:4px;display:flex;align-items:center;padding:0 12px;color:rgba(255,255,255,.8);font-size:13px;margin-left:16px;}
    .az-user{margin-left:auto;color:#fff;font-size:13px;display:flex;align-items:center;gap:8px;}
    .az-avatar{width:28px;height:28px;border-radius:50%;background:#50e6ff;display:flex;align-items:center;justify-content:center;color:#0078d4;font-weight:700;font-size:12px;}
    .az-urlbar{height:26px;background:#f3f2f1;border-bottom:1px solid #e1dfdd;display:flex;align-items:center;padding:0 12px;gap:6px;font-size:11px;color:#605e5c;}
    .az-breadcrumb{height:36px;background:#fff;border-bottom:1px solid #e1dfdd;display:flex;align-items:center;padding:0 24px;gap:6px;font-size:13px;}
    .bc-item{color:#0078d4;cursor:pointer;} .bc-item:last-child{color:#323130;font-weight:600;} .bc-sep{color:#a19f9d;font-size:11px;}
    .brand-badge{position:absolute;bottom:0;left:0;background:#1a1a2e;color:#fff;font-size:10px;padding:3px 10px;font-weight:600;letter-spacing:.04em;}
  `;

  const topChrome = `
    <div class="az-topbar">
      <div class="az-logo"><div class="az-logo-icon">A</div>Microsoft Azure</div>
      <div class="az-search">🔍 Search resources, services, and docs (G+/)</div>
      <div style="margin-left:auto;display:flex;gap:14px;color:#fff;font-size:15px;">🔔 ⚙️ ?</div>
      <div class="az-user"><div class="az-avatar">AM</div>aseem@technuggets.com</div>
    </div>
    <div class="az-urlbar">🔒 <span style="color:#323130;">${portalUrl}</span></div>
    <div class="az-breadcrumb">
      ${breadcrumbs.map((b, i) => `<span class="bc-item">${b}</span>${i < breadcrumbs.length - 1 ? '<span class="bc-sep">›</span>' : ''}`).join('')}
    </div>`;

  const examOverlay = examCallout ? `
    <div style="position:absolute;top:110px;right:0;width:292px;background:#e94560;color:#fff;padding:10px 14px;font-size:11.5px;font-weight:500;display:flex;gap:8px;align-items:flex-start;z-index:20;">
      <span style="font-size:15px;flex-shrink:0;">📝</span>
      <span><strong>Exam Note:</strong> ${esc(examCallout)}</span>
    </div>` : '';

  const cliBanner = cliCmd ? `
    <div style="position:absolute;bottom:52px;left:220px;right:0;background:#1b1b1b;color:#50e6ff;font-family:'Courier New',monospace;font-size:11.5px;padding:7px 20px;border-top:1px solid #333;display:flex;align-items:center;gap:10px;z-index:10;">
      <span style="color:#888;white-space:nowrap;font-size:11px;">CLI equivalent:</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(cliCmd)}</span>
    </div>` : '';

  // ── Form layout ───────────────────────────────────────────────────────────
  if (layout === 'form') {
    const hasCli   = !!cliCmd;
    const formBottom = hasCli ? 88 : 52;

    const projectFields = fields.slice(0, Math.ceil(fields.length / 2));
    const instanceFields = fields.slice(Math.ceil(fields.length / 2));

    const renderField = (f) => {
      const isHL = f.highlight;
      return `
        <div style="margin-bottom:11px;position:relative;">
          <div style="font-size:12px;font-weight:600;color:#323130;margin-bottom:4px;">${esc(f.label)} <span style="color:#d13438;font-size:10px;">*</span></div>
          <div style="width:100%;max-width:380px;height:32px;border:${isHL ? '2px solid #0078d4' : '1px solid #8a8886'};border-radius:2px;padding:0 8px;background:${isHL ? '#e8f4ff' : '#fff'};display:flex;align-items:center;justify-content:space-between;font-size:13px;">
            <span>${esc(f.value)}</span>
            ${f.type === 'dropdown' ? '<span style="color:#605e5c;font-size:10px;">▼</span>' : ''}
          </div>
          ${isHL && f.highlight_reason ? `
            <div style="position:absolute;right:-248px;top:18px;width:230px;background:#fff4ce;border:1px solid #f7d057;border-radius:4px;padding:7px 9px;font-size:10.5px;color:#323130;z-index:15;display:flex;gap:5px;">
              <span style="font-size:13px;flex-shrink:0;">💡</span>${esc(f.highlight_reason)}
            </div>` : ''}
        </div>`;
    };

    const tabsHtml = tabs.map(t =>
      `<div style="padding:9px 14px;font-size:13px;color:${t === activeTab ? '#0078d4' : '#605e5c'};border-bottom:${t === activeTab ? '2px solid #0078d4' : '2px solid transparent'};font-weight:${t === activeTab ? '600' : '400'};margin-bottom:-1px;white-space:nowrap;cursor:pointer;">${esc(t)}</div>`
    ).join('');

    const formActionsHtml = `
      <div style="position:absolute;bottom:0;left:220px;right:0;height:52px;background:#fff;border-top:1px solid #e1dfdd;display:flex;align-items:center;padding:0 24px;gap:8px;z-index:10;">
        ${btns.map((b, i) => `<button style="height:32px;background:${i===0?'#0078d4':'#fff'};color:${i===0?'#fff':'#0078d4'};border:${i===0?'none':'1px solid #0078d4'};border-radius:2px;padding:0 16px;font-size:13px;font-weight:${i===0?'600':'400'};cursor:pointer;">${esc(b)}</button>`).join('')}
      </div>`;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
      ${AZURE_CSS}
      .sidebar{width:220px;background:#faf9f8;border-right:1px solid #e1dfdd;padding:8px 0;overflow:hidden;}
      .sb-item{padding:8px 14px;font-size:13px;color:#323130;cursor:pointer;display:flex;align-items:center;gap:8px;}
      .sb-item.active{background:#e8f4ff;color:#0078d4;border-left:3px solid #0078d4;font-weight:600;}
      .sb-div{height:1px;background:#e1dfdd;margin:6px 0;}
    </style></head><body>
    ${topChrome}
    <div style="display:flex;height:calc(720px - 110px);position:relative;">
      <div class="sidebar">
        ${tabs.map((t, i) => `<div class="sb-item${t === activeTab ? ' active' : ''}">${['📋','💿','🌐','⚙️','📊','🔧','🏷️','✅'][i]||'•'} ${esc(t)}</div>${i === tabs.length - 3 ? '<div class="sb-div"></div>' : ''}`).join('')}
      </div>
      <div style="flex:1;background:#fff;overflow:hidden;position:relative;">
        <div style="padding:14px 24px 10px;border-bottom:1px solid #e1dfdd;">
          <div style="font-size:20px;font-weight:600;color:#323130;margin-bottom:2px;">${title}</div>
          <div style="font-size:13px;color:#605e5c;">${subtitle}</div>
        </div>
        <div style="display:flex;border-bottom:1px solid #e1dfdd;padding:0 24px;">${tabsHtml}</div>
        <div style="padding:14px 24px;overflow-y:auto;max-height:calc(720px - ${formBottom + 110 + 60}px);">
          ${projectFields.length ? `<div style="font-size:13px;font-weight:600;color:#323130;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e1dfdd;">Project details</div>` : ''}
          ${projectFields.map(renderField).join('')}
          ${instanceFields.length ? `<div style="font-size:13px;font-weight:600;color:#323130;margin:14px 0 10px;padding-bottom:5px;border-bottom:1px solid #e1dfdd;">Instance details</div>` : ''}
          ${instanceFields.map(renderField).join('')}
        </div>
      </div>
    </div>
    ${examOverlay}${cliBanner}${formActionsHtml}
    <div class="brand-badge">TechNuggets Academy</div>
    </body></html>`;
  }

  // ── Terminal / Cloud Shell layout ─────────────────────────────────────────
  if (layout === 'terminal') {
    const prompt  = 'aseem@Azure:~$';
    const command = esc(cliCmd || `az ${(s.portal_service || 'group').toLowerCase().replace(/\s+/g,'')} list --output table`);
    const output  = esc(s.cli_output || 'Name              ResourceGroup    Location\n----------------  ---------------  ----------\naz104-lab-rg      N/A              eastus\naz104-vm-01       az104-lab-rg     eastus');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
      ${AZURE_CSS}
      .terminal{background:#0c0c0c;color:#cccccc;font-family:'Courier New',Consolas,monospace;font-size:13px;line-height:1.5;padding:16px 20px;white-space:pre;}
    </style></head><body>
    ${topChrome}
    <div style="display:flex;height:calc(720px - 110px);flex-direction:column;">
      <div style="background:#fff;padding:10px 24px;border-bottom:1px solid #e1dfdd;display:flex;align-items:center;gap:16px;">
        <span style="font-size:14px;font-weight:600;color:#323130;">Azure Cloud Shell</span>
        <span style="font-size:12px;background:#e8f4ff;color:#0078d4;padding:2px 8px;border-radius:10px;font-weight:500;">Bash</span>
        <span style="font-size:12px;color:#605e5c;">PowerShell</span>
        <div style="margin-left:auto;font-size:12px;color:#605e5c;">aseem@Azure:~ (East US)</div>
      </div>
      <div class="terminal" style="flex:1;">Requesting a Cloud Shell...Succeeded.<br>Connecting terminal...<br><br><span style="color:#50e6ff;">${prompt}</span> <span style="color:#fffb00;">${command}</span><br><br><span style="color:#d4d4d4;">${output}</span><br><br><span style="color:#50e6ff;">${prompt}</span> <span style="animation:blink 1s step-end infinite;">█</span></div>
    </div>
    ${examOverlay}
    <div class="brand-badge">TechNuggets Academy</div>
    </body></html>`;
  }

  // ── Resource list layout ──────────────────────────────────────────────────
  if (layout === 'list') {
    const resources = fields.length ? fields : [
      { label: 'az104-rg-01', value: 'East US', type: 'active' },
      { label: 'az104-rg-02', value: 'West Europe', type: 'active' },
      { label: 'az104-rg-03', value: 'Southeast Asia', type: 'active' },
    ];

    const rows = resources.map((r, i) => `
      <tr style="border-bottom:1px solid #f3f2f1;">
        <td style="padding:8px 12px;"><input type="checkbox" style="margin-right:8px;">${esc(r.label || r.value)}</td>
        <td style="padding:8px 12px;"><span style="background:#dff6dd;color:#107c10;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:500;">● Active</span></td>
        <td style="padding:8px 12px;color:#605e5c;font-size:12px;">${esc(r.value || r.label)}</td>
        <td style="padding:8px 12px;color:#0078d4;font-size:12px;cursor:pointer;">az104-sub-01</td>
        <td style="padding:8px 12px;"><button style="background:none;border:1px solid #e1dfdd;border-radius:2px;padding:2px 8px;font-size:12px;color:#323130;cursor:pointer;">···</button></td>
      </tr>`).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${AZURE_CSS}</style></head><body>
    ${topChrome}
    <div style="height:calc(720px - 110px);background:#fff;padding:0;">
      <div style="padding:14px 24px 12px;border-bottom:1px solid #e1dfdd;display:flex;align-items:center;gap:12px;">
        <div style="font-size:20px;font-weight:600;color:#323130;">${title}</div>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button style="height:32px;background:#0078d4;color:#fff;border:none;border-radius:2px;padding:0 14px;font-size:13px;font-weight:600;cursor:pointer;">+ Create</button>
          <button style="height:32px;background:#fff;color:#323130;border:1px solid #e1dfdd;border-radius:2px;padding:0 12px;font-size:13px;cursor:pointer;">⟳ Refresh</button>
        </div>
      </div>
      <div style="padding:10px 24px;border-bottom:1px solid #e1dfdd;display:flex;align-items:center;gap:10px;">
        <div style="height:30px;border:1px solid #e1dfdd;border-radius:2px;display:flex;align-items:center;padding:0 10px;width:260px;font-size:13px;color:#605e5c;">🔍 Filter for any field...</div>
        <span style="font-size:13px;color:#605e5c;">Subscription == All &nbsp;&#8964;</span>
        <span style="font-size:13px;color:#605e5c;">Location == All &nbsp;&#8964;</span>
        <span style="font-size:13px;color:#0078d4;cursor:pointer;">+ Add filter</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead style="background:#faf9f8;">
          <tr style="border-bottom:2px solid #e1dfdd;">
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#323130;">Name ↑</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#323130;">Status</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#323130;">Location</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#323130;">Subscription</th>
            <th style="padding:8px 12px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${examOverlay}
    <div class="brand-badge">TechNuggets Academy</div>
    </body></html>`;
  }

  // ── Dashboard / Overview layout ───────────────────────────────────────────
  if (layout === 'dashboard') {
    const essentials = fields.slice(0, 4).map(f => `
      <div style="padding:10px 16px;border-right:1px solid #e1dfdd;flex:1;">
        <div style="font-size:11px;color:#605e5c;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;">${esc(f.label)}</div>
        <div style="font-size:13px;color:#0078d4;cursor:pointer;">${esc(f.value)}</div>
      </div>`).join('');

    const sideNav = ['Overview','Activity log','Access control (IAM)','Tags','Diagnose and solve problems','Settings','Properties','Locks','Monitoring','Insights','Alerts','Metrics','Diagnostic settings'].map((item,i) =>
      `<div style="padding:7px 16px;font-size:13px;color:${i===0?'#0078d4':'#323130'};background:${i===0?'#e8f4ff':'transparent'};${i===0?'border-left:3px solid #0078d4;font-weight:600;':''}cursor:pointer;">${item}</div>` +
      (i===4 || i===7 ? '<div style="height:1px;background:#e1dfdd;margin:4px 0;"></div>' : '')
    ).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${AZURE_CSS}</style></head><body>
    ${topChrome}
    <div style="display:flex;height:calc(720px - 110px);">
      <div style="width:210px;background:#faf9f8;border-right:1px solid #e1dfdd;overflow-y:auto;">${sideNav}</div>
      <div style="flex:1;overflow:hidden;background:#fff;">
        <div style="padding:12px 20px 10px;border-bottom:1px solid #e1dfdd;">
          <div style="font-size:18px;font-weight:600;color:#323130;">${title}</div>
          <div style="font-size:12px;color:#605e5c;margin-top:2px;">${subtitle}</div>
        </div>
        <div style="background:#faf9f8;border-bottom:1px solid #e1dfdd;padding:6px 20px;font-size:12px;font-weight:600;color:#323130;">Essentials</div>
        <div style="display:flex;border-bottom:1px solid #e1dfdd;">${essentials || '<div style="padding:10px 16px;color:#605e5c;font-size:13px;">No data configured</div>'}</div>
        <div style="padding:14px 20px;">
          ${(fields.slice(4) || []).map(f => `
            <div style="display:flex;padding:8px 0;border-bottom:1px solid #f3f2f1;">
              <span style="width:200px;font-size:13px;color:#605e5c;font-weight:600;">${esc(f.label)}</span>
              <span style="font-size:13px;color:${f.highlight?'#0078d4':'#323130'};font-weight:${f.highlight?'600':'400'};cursor:pointer;">${esc(f.value)}</span>
              ${f.highlight && f.highlight_reason ? `<span style="margin-left:12px;font-size:11px;background:#fff4ce;border:1px solid #f7d057;padding:1px 8px;border-radius:10px;color:#605e5c;">💡 ${esc(f.highlight_reason)}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>
    </div>
    ${examOverlay}${cliBanner}
    <div class="brand-badge">TechNuggets Academy</div>
    </body></html>`;
  }

  // ── Metrics layout ────────────────────────────────────────────────────────
  if (layout === 'metrics') {
    const bars = Array.from({length: 24}, (_,i) => {
      const h = 20 + Math.round(Math.sin(i * 0.5) * 30 + Math.random() * 20);
      return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;"><div style="background:#0078d4;opacity:.8;height:${h}%;border-radius:2px 2px 0 0;"></div></div>`;
    }).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${AZURE_CSS}</style></head><body>
    ${topChrome}
    <div style="height:calc(720px - 110px);background:#fff;padding:14px 24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="font-size:18px;font-weight:600;color:#323130;">${title}</div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
          ${['1 hour','6 hours','12 hours','1 day','7 days','30 days'].map((t,i)=>`<span style="padding:4px 10px;border:1px solid #e1dfdd;border-radius:2px;font-size:12px;background:${i===2?'#0078d4':'#fff'};color:${i===2?'#fff':'#323130'};cursor:pointer;">${t}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <div style="height:30px;border:1px solid #0078d4;border-radius:2px;display:flex;align-items:center;padding:0 12px;font-size:13px;color:#0078d4;background:#e8f4ff;gap:6px;">📊 ${esc((fields[0]?.label) || 'CPU Percentage')} <span>▼</span></div>
        <div style="height:30px;border:1px solid #e1dfdd;border-radius:2px;display:flex;align-items:center;padding:0 12px;font-size:13px;color:#323130;gap:6px;">Aggregation: Avg <span>▼</span></div>
      </div>
      <div style="border:1px solid #e1dfdd;border-radius:4px;padding:16px;height:calc(100% - 110px);display:flex;flex-direction:column;">
        <div style="display:flex;align-items:flex-end;height:100%;gap:2px;padding-bottom:0;">
          ${bars}
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:6px;font-size:11px;color:#605e5c;">
          <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>Now</span>
        </div>
      </div>
    </div>
    ${examOverlay}
    <div class="brand-badge">TechNuggets Academy</div>
    </body></html>`;
  }

  // ── Pricing layout ────────────────────────────────────────────────────────
  const tiers = fields.length ? fields : [
    { label: 'Free', value: '$0/month', type: 'text', highlight: false },
    { label: 'Standard', value: '$0.10/GB', type: 'text', highlight: true, highlight_reason: 'Most exam scenarios use Standard' },
    { label: 'Premium', value: '$0.15/GB', type: 'text', highlight: false },
  ];

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${AZURE_CSS}</style></head><body>
  ${topChrome}
  <div style="height:calc(720px - 110px);background:#f3f2f1;padding:16px 24px;display:flex;gap:16px;">
    <div style="flex:2;display:flex;flex-direction:column;gap:12px;">
      <div style="font-size:18px;font-weight:600;color:#323130;">${title} — Pricing</div>
      ${tiers.map(t => `
        <div style="background:#fff;border:${t.highlight ? '2px solid #0078d4' : '1px solid #e1dfdd'};border-radius:4px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:14px;font-weight:600;color:#323130;">${esc(t.label)}</div>
            ${t.highlight_reason ? `<div style="font-size:12px;color:#0078d4;margin-top:2px;">${esc(t.highlight_reason)}</div>` : ''}
          </div>
          <div style="font-size:18px;font-weight:700;color:${t.highlight ? '#0078d4' : '#323130'};">${esc(t.value)}</div>
        </div>`).join('')}
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e1dfdd;border-radius:4px;padding:16px;">
      <div style="font-size:14px;font-weight:600;color:#323130;margin-bottom:12px;">Cost Estimate</div>
      <div style="font-size:28px;font-weight:700;color:#323130;margin-bottom:4px;">~$12.40<span style="font-size:14px;font-weight:400;color:#605e5c;">/month</span></div>
      <div style="font-size:12px;color:#605e5c;margin-bottom:12px;">Based on current configuration</div>
      <button style="width:100%;height:32px;background:#0078d4;color:#fff;border:none;border-radius:2px;font-size:13px;font-weight:600;cursor:pointer;">Add to estimate</button>
    </div>
  </div>
  ${examOverlay}
  <div class="brand-badge">TechNuggets Academy</div>
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

// ── HeyGen video lookup ───────────────────────────────────────────────────────

function findHeygenVideo(chapterNum) {
  const paddedNum  = String(chapterNum).padStart(2, '0');
  const chapterDir = CHAPTER_DIR || path.join(__dirname, 'chapters', `chapter-${paddedNum}`);
  const candidates = [
    path.join(chapterDir, `heygen-chapter-${paddedNum}.mp4`),
    path.join(__dirname, '..', `heygen-chapter-${paddedNum}.mp4`),
    path.join(process.env.HOME || '', 'Downloads', `heygen-chapter-${paddedNum}.mp4`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      log(`   Found: ${c}`);
      return c;
    }
  }
  die(
    `HeyGen video not found for Chapter ${chapterNum}.\n` +
    `Looked for heygen-chapter-${paddedNum}.mp4 in:\n` +
    candidates.map(c => `  · ${c}`).join('\n') + '\n\n' +
    `Export the HeyGen video and place it in one of those locations.`
  );
}

// ── FFmpeg spawn wrapper ──────────────────────────────────────────────────────

function runFFmpeg(args) {
  const ffmpegBin = findBinary('ffmpeg');
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
}

// ── PIP timing helpers ────────────────────────────────────────────────────────

function getPIPFilter(totalDuration, pipMode, introDuration, outroDuration) {
  switch (pipMode) {
    case 'full':
      return '';
    case 'intro_only':
      return `enable='between(t,0,${introDuration})'`;
    case 'outro_only': {
      const outroStart = (totalDuration - outroDuration).toFixed(2);
      return `enable='between(t,${outroStart},${totalDuration.toFixed(2)})'`;
    }
    case 'intro_outro': {
      const outroStartIO = (totalDuration - outroDuration).toFixed(2);
      return `enable='lt(t,${introDuration})+gt(t,${outroStartIO})'`;
    }
    case 'none':
      return null;
    default:
      return '';
  }
}

function getPIPWithFade(pipMode, introDuration, outroStart, totalDuration) {
  if (pipMode === 'intro_only') {
    return `[av_bordered]format=yuva420p,fade=in:st=0:d=1:alpha=1,fade=out:st=${introDuration - 1}:d=1:alpha=1[av_faded]`;
  } else if (pipMode === 'outro_only') {
    return `[av_bordered]format=yuva420p,fade=in:st=${outroStart}:d=1:alpha=1,fade=out:st=${totalDuration - 1}:d=1:alpha=1[av_faded]`;
  }
  return null;
}

// ── Step 6: Composite ─────────────────────────────────────────────────────────

async function compositeVideo(sections, heygenPath, outPath, totalDuration, ctaOverlayPath, renderInput) {
  const ffmpegBin = findBinary('ffmpeg');
  const FPS       = 30;
  const FADE      = 0.4;

  const pipMode   = (renderInput && renderInput.pip_mode) || 'full';
  const introDur  = (renderInput && renderInput.pip_duration_intro) || 45;
  const outroDur  = (renderInput && renderInput.pip_duration_outro) || 30;
  const ctaStart  = totalDuration - 30;
  const ctaEnd    = totalDuration - 8;
  const ctaExists = fs.existsSync(ctaOverlayPath);
  const outroStart = totalDuration - outroDur;

  // 6a: per-slide video segments
  const segPaths = [];
  for (let i = 0; i < sections.length; i++) {
    const s   = sections[i];
    const dur = s.duration;
    const seg = path.join(TEMP_DIR, `seg-${i}.mp4`);
    const fadeOutStart = Math.max(0, dur - FADE).toFixed(3);

    execSync(
      `"${ffmpegBin}" -y -loop 1 -framerate ${FPS} -i "${path.join(SLIDES_DIR, `slide-${String(i).padStart(2,'0')}.png`)}" ` +
      `-vf "scale=1280:720:flags=lanczos,fade=t=in:st=0:d=${FADE},fade=t=out:st=${fadeOutStart}:d=${FADE}" ` +
      `-t ${dur.toFixed(3)} -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p "${seg}"`,
      { stdio: 'pipe' }
    );
    segPaths.push(seg);
    log(`   ✓ seg-${i}.mp4 (${dur.toFixed(1)}s)`);
  }

  // 6b: concat into slideshow
  const concatFile    = path.join(TEMP_DIR, 'concat.txt');
  fs.writeFileSync(concatFile, segPaths.map(p => `file '${p.replace(/'/g,"'\\''")}'`).join('\n') + '\n');

  const slideshowPath = path.join(TEMP_DIR, 'slideshow.mp4');
  execSync(
    `"${ffmpegBin}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${slideshowPath}"`,
    { stdio: 'pipe' }
  );
  log('   ✓ slideshow.mp4 assembled');

  log(`   PIP Mode: ${pipMode}`);

  // 6c: final composite
  if (pipMode === 'none') {
    log('   Rendering without PIP overlay (audio from HeyGen)…');
    const filterComplex = ctaExists
      ? [
          '[0:v]scale=1280:720:flags=lanczos[bg]',
          `[bg][1:v]overlay=0:440:enable='between(t,${ctaStart.toFixed(2)},${ctaEnd.toFixed(2)})'[outv]`,
        ].join(';')
      : '[0:v]scale=1280:720:flags=lanczos[outv]';

    const inputs = ctaExists
      ? ['-i', slideshowPath, '-i', ctaOverlayPath]
      : ['-i', slideshowPath];

    await runFFmpeg([
      '-y',
      ...inputs,
      '-i', heygenPath,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', `${inputs.length / 2}:a`,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest', outPath,
    ]);
    log(`   ✓ ${path.basename(outPath)} written`);
    return;
  }

  // Build PIP enable + optional fade
  const pipEnable  = getPIPFilter(totalDuration, pipMode, introDur, outroDur);
  const pipFade    = getPIPWithFade(pipMode, introDur, outroStart, totalDuration);
  const pipOverlay = pipEnable
    ? `overlay=W-w-20:H-h-20:${pipEnable}`
    : `overlay=W-w-20:H-h-20`;
  const avSrc      = pipFade ? '[av_faded]' : '[av_bordered]';

  if (pipMode === 'intro_only') {
    log(`   PIP visible: 0s → ${introDur}s`);
  } else if (pipMode === 'outro_only') {
    log(`   PIP visible: ${outroStart.toFixed(0)}s → ${totalDuration.toFixed(0)}s`);
  } else if (pipMode === 'intro_outro') {
    log(`   PIP visible: 0s → ${introDur}s AND ${outroStart.toFixed(0)}s → ${totalDuration.toFixed(0)}s`);
  } else {
    log('   PIP visible: entire video');
  }

  const pipChain = [
    '[1:v]scale=320:-2:flags=lanczos[av_scaled]',
    '[av_scaled]pad=iw+6:ih+6:3:3:color=white[av_bordered]',
    ...(pipFade ? [pipFade] : []),
  ];

  let filterComplex, inputs;

  if (ctaExists) {
    filterComplex = [
      '[0:v]scale=1280:720:flags=lanczos[bg]',
      ...pipChain,
      `[bg]${avSrc}${pipOverlay}[with_pip]`,
      `[with_pip][2:v]overlay=0:440:enable='between(t,${ctaStart.toFixed(2)},${ctaEnd.toFixed(2)})'[outv]`,
    ].join(';');
    inputs = ['-i', slideshowPath, '-i', heygenPath, '-i', ctaOverlayPath];
  } else {
    filterComplex = [
      '[0:v]scale=1280:720:flags=lanczos[bg]',
      ...pipChain,
      `[bg]${avSrc}${pipOverlay}[outv]`,
    ].join(';');
    inputs = ['-i', slideshowPath, '-i', heygenPath];
  }

  await runFFmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '1:a',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest', outPath,
  ]);

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
