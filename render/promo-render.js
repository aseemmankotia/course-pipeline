#!/usr/bin/env node
'use strict';
/**
 * promo-render.js — 60-second course promo video generator
 *
 * Usage:
 *   node render/promo-render.js               # full render
 *   node render/promo-render.js --preview     # script only, no render
 *   node render/promo-render.js --no-vertical # skip 9:16 version
 *
 * Input:  course-data-export.json (from Settings → Export Course Data)
 * Output: render/promo/welcome-promo.mp4        (16:9  — Udemy + YouTube)
 *         render/promo/welcome-promo-short.mp4  (9:16  — YouTube Shorts)
 */

const puppeteer          = require('puppeteer');
const { execSync }       = require('child_process');
const fs                 = require('fs');
const path               = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { callAI } = require('./ai-client-node.js');

// ── Paths ─────────────────────────────────────────────────────────────────────
const PROJECT_ROOT = path.join(__dirname, '..');
const PROMO_DIR    = path.join(PROJECT_ROOT, 'render', 'promo');
const SLIDES_DIR   = path.join(PROMO_DIR, 'slides');
const TEMP_DIR     = path.join(PROMO_DIR, 'temp');

[PROMO_DIR, SLIDES_DIR, TEMP_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Load course data ──────────────────────────────────────────────────────────
function loadCourseData() {
  const exportFile     = path.join(PROJECT_ROOT, 'course-data-export.json');
  const curriculumFile = path.join(PROJECT_ROOT, 'curriculum.json');

  if (fs.existsSync(exportFile)) {
    console.log('📖 Loading from course-data-export.json...');
    return JSON.parse(fs.readFileSync(exportFile, 'utf8'));
  }
  if (fs.existsSync(curriculumFile)) {
    console.log('📖 Loading from curriculum.json...');
    return JSON.parse(fs.readFileSync(curriculumFile, 'utf8'));
  }

  console.error('❌ No course data found.');
  console.error('   Export from app: Settings → Export Course Data');
  process.exit(1);
}

// ── Generate promo script ─────────────────────────────────────────────────────
async function generatePromoScript(course) {
  console.log('\n🤖 Step 1 — Generating 60-second promo script...');

  const chapters         = course.chapters || [];
  const chapterHighlights = chapters
    .slice(0, 5)
    .map(ch => `- ${ch.title}: ${ch.key_takeaway || ch.subtitle || ''}`)
    .join('\n');

  const text = await callAI({
    prompt: `Write a 60-second promotional video script for this course.

Course: ${course.course_title}
Subtitle: ${course.course_subtitle || ''}
Difficulty: ${course.difficulty || 'Beginner'}
Chapters: ${chapters.length}
Key topics:
${chapterHighlights}

Skills learned: ${(course.skills_learned || []).slice(0, 4).join(', ')}

TARGET PLATFORMS:
- Udemy promo video (shown to potential buyers)
- YouTube Short (drives traffic to course)
- Social media (shareable)

STRICT SCRIPT RULES:
1. Exactly 150 words (= 60 seconds at 150wpm)
2. NO markdown, NO headers, NO stage directions
3. Opens with a HOOK — a pain point or surprising fact
4. Speaks directly to the viewer using "you"
5. Mentions 3 specific things they will learn
6. Ends with ONE clear call to action
7. High energy, confident, zero fluff
8. Natural spoken language only

STRUCTURE (strict timing):
[0:00-0:10] Hook — the problem or opportunity (25 words)
[0:10-0:30] What they will learn — 3 specific outcomes (50 words)
[0:30-0:50] Why this course — credibility + what makes it different (40 words)
[0:50-1:00] CTA — enroll now / link in bio / subscribe (15 words)

Return ONLY the spoken script text. Nothing else.
No timecodes. No labels. Just the words to speak.`,
    systemPrompt: `You write short punchy promotional video scripts.
Every word counts. Zero filler. Maximum impact.
Scripts must be exactly 150 words when counted.`,
    maxTokens: 500,
    action: 'promo_script',
  });

  const wordCount = text.trim().split(/\s+/).length;
  console.log(`   ✓ Script: ${wordCount} words (~${Math.round(wordCount / 150 * 60)} seconds)`);
  return text.trim();
}

// ── Generate slide plan ───────────────────────────────────────────────────────
async function generatePromoSlides(course, script) {
  console.log('\n🤖 Step 2 — Planning promo slides...');

  const text = await callAI({
    prompt: `Design 8 slides for a 60-second course promo video.

Course: ${course.course_title}
Script: ${script}

The slides play during the video while the instructor speaks.
Total video: 60 seconds = 8 slides × ~7.5 seconds each.

Return ONLY a JSON array of exactly 8 slides:
[
  {
    "slide_num": 1,
    "type": "title_card|hook|outcome|chapter_preview|social_proof|cta",
    "duration_seconds": 7,
    "headline": "large text (max 6 words)",
    "subtext": "supporting text (max 12 words)",
    "stat": "optional compelling number e.g. 13 Chapters",
    "icon": "single relevant emoji",
    "accent_color": "#e94560 or #00d4ff or #f9a825",
    "bg_style": "dark_gradient|split|centered|minimal"
  }
]

Slide sequence:
1. Course title card (title_card)
2. The problem/hook (hook)
3. Outcome 1 — what they learn (outcome)
4. Outcome 2 — what they learn (outcome)
5. Outcome 3 — what they learn (outcome)
6. Chapter preview / course stats (chapter_preview)
7. Instructor/credibility (social_proof)
8. Call to action (cta)`,
    systemPrompt: 'You design video slide sequences. Return valid JSON only.',
    maxTokens: 1500,
    action: 'promo_slides',
  });

  try {
    const clean  = text.replace(/```json\n?|```\n?/g, '').trim();
    const match  = clean.match(/\[[\s\S]+\]/);
    const slides = JSON.parse(match ? match[0] : clean);
    console.log(`   ✓ ${slides.length} slides planned`);
    return slides;
  } catch (e) {
    console.warn('   ⚠ Slide planning failed, using defaults');
    return getDefaultSlides(course);
  }
}

function getDefaultSlides(course) {
  const chapters = course.chapters || [];
  return [
    { slide_num: 1, type: 'title_card',      duration_seconds: 8,  headline: course.course_title,                            subtext: course.course_subtitle || '',                                      stat: `${chapters.length} Chapters`,               icon: '🎓', accent_color: '#e94560', bg_style: 'dark_gradient' },
    { slide_num: 2, type: 'hook',            duration_seconds: 7,  headline: 'Struggling with this?',                       subtext: "You're not alone. Most people give up.",                           icon: '😤', accent_color: '#f9a825', bg_style: 'centered'      },
    { slide_num: 3, type: 'outcome',         duration_seconds: 7,  headline: course.skills_learned?.[0] || 'Master the fundamentals', subtext: 'From zero to confident',                              icon: '✅', accent_color: '#e94560', bg_style: 'minimal'       },
    { slide_num: 4, type: 'outcome',         duration_seconds: 7,  headline: course.skills_learned?.[1] || 'Hands-on labs',  subtext: 'Real projects, real skills',                                      icon: '💻', accent_color: '#e94560', bg_style: 'minimal'       },
    { slide_num: 5, type: 'outcome',         duration_seconds: 7,  headline: course.skills_learned?.[2] || 'Pass the exam',  subtext: 'Exam tips and practice tests included',                           icon: '🏆', accent_color: '#f9a825', bg_style: 'minimal'       },
    { slide_num: 6, type: 'chapter_preview', duration_seconds: 8,  headline: `${chapters.length} Chapters`,                 subtext: chapters.slice(0, 3).map(c => c.title).join(' · '),                stat: `${chapters.length * 20} min of content`,    icon: '📚', accent_color: '#e94560', bg_style: 'split'          },
    { slide_num: 7, type: 'social_proof',    duration_seconds: 7,  headline: 'TechNuggets Academy',                          subtext: 'Practical courses. Real skills. No fluff.',                       icon: '⭐', accent_color: '#f9a825', bg_style: 'centered'      },
    { slide_num: 8, type: 'cta',             duration_seconds: 9,  headline: 'Enroll Today',                                 subtext: 'Start learning in the next 5 minutes',                            icon: '🚀', accent_color: '#e94560', bg_style: 'dark_gradient' },
  ];
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Build slide HTML ──────────────────────────────────────────────────────────
function generateSlideHTML(slide, course, slideIndex, totalSlides) {
  const W = 1280, H = 720;

  const bgStyles = {
    dark_gradient: `background: linear-gradient(135deg, #0a0e1a 0%, #1a0a1a 50%, #0a0e1a 100%);`,
    split:         `background: linear-gradient(90deg, #1a1a2e 0%, #0a0e1a 100%);`,
    centered:      `background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0e1a 70%);`,
    minimal:       `background: #0a0e1a;`,
  };

  const bg     = bgStyles[slide.bg_style] || bgStyles.dark_gradient;
  const accent = slide.accent_color || '#e94560';
  const progress = (slideIndex / totalSlides) * 100;

  let content = '';

  if (slide.type === 'title_card') {
    content = `
      <div class="title-card">
        <div class="course-badge">NEW COURSE</div>
        <div class="main-title">${escHtml(slide.headline)}</div>
        <div class="accent-line"></div>
        <div class="subtitle">${escHtml(slide.subtext)}</div>
        <div class="stat-row">
          <span class="stat">${slide.icon} ${escHtml(slide.stat || '')}</span>
          <span class="difficulty">${escHtml(course.difficulty || 'Beginner')}</span>
        </div>
        <div class="brand">TechNuggets Academy</div>
      </div>`;

  } else if (slide.type === 'hook') {
    content = `
      <div class="hook-card">
        <div class="hook-icon">${slide.icon}</div>
        <div class="hook-headline">${escHtml(slide.headline)}</div>
        <div class="hook-sub">${escHtml(slide.subtext)}</div>
      </div>`;

  } else if (slide.type === 'outcome') {
    content = `
      <div class="outcome-card">
        <div class="outcome-num">0${slideIndex - 1}</div>
        <div class="outcome-icon">${slide.icon}</div>
        <div class="outcome-headline">${escHtml(slide.headline)}</div>
        <div class="outcome-sub">${escHtml(slide.subtext)}</div>
        <div class="outcome-check">✓ Included in this course</div>
      </div>`;

  } else if (slide.type === 'chapter_preview') {
    const chapters = course.chapters || [];
    const chapterList = chapters.slice(0, 6).map((ch, i) =>
      `<div class="ch-item">
        <span class="ch-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="ch-title">${escHtml(ch.title)}</span>
      </div>`
    ).join('');
    content = `
      <div class="chapter-card">
        <div class="chapter-label">WHAT'S INSIDE</div>
        <div class="chapter-stat">
          <span class="big-num">${chapters.length}</span>
          <span class="big-label">Chapters</span>
        </div>
        <div class="chapter-list">${chapterList}</div>
        ${slide.stat ? `<div class="chapter-total">${escHtml(slide.stat)}</div>` : ''}
      </div>`;

  } else if (slide.type === 'social_proof') {
    content = `
      <div class="proof-card">
        <div class="proof-logo"><span class="logo-dot">●</span> TechNuggets Academy</div>
        <div class="proof-headline">${escHtml(slide.headline)}</div>
        <div class="proof-sub">${escHtml(slide.subtext)}</div>
        <div class="proof-stars">⭐⭐⭐⭐⭐</div>
        <div class="proof-tagline">Practical courses. Real skills. No fluff.</div>
      </div>`;

  } else if (slide.type === 'cta') {
    content = `
      <div class="cta-card">
        <div class="cta-icon">${slide.icon}</div>
        <div class="cta-headline">${escHtml(slide.headline)}</div>
        <div class="cta-sub">${escHtml(slide.subtext)}</div>
        <div class="cta-button">Start Learning Now →</div>
        <div class="cta-platform">Available on Udemy · YouTube · TechNuggets Academy</div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:${W}px;height:${H}px;${bg}font-family:'DM Sans',sans-serif;overflow:hidden;position:relative;color:white;}
  body::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(233,69,96,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(233,69,96,0.03) 1px,transparent 1px);background-size:50px 50px;pointer-events:none;}
  .top-bar{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${accent},#f9a825,${accent});}
  .progress-bar{position:absolute;bottom:0;left:0;height:3px;width:${progress}%;background:${accent};}
  .slide-counter{position:absolute;top:16px;right:20px;font-size:12px;color:rgba(255,255,255,0.3);}
  .brand-wm{position:absolute;bottom:16px;right:20px;font-size:12px;color:rgba(255,255,255,0.25);display:flex;align-items:center;gap:6px;}
  .brand-wm::before{content:'●';color:#f9a825;font-size:8px;}

  /* TITLE CARD */
  .title-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;}
  .course-badge{font-size:13px;font-weight:700;letter-spacing:0.2em;color:${accent};border:1px solid ${accent};padding:4px 16px;border-radius:20px;margin-bottom:20px;}
  .main-title{font-family:'Poppins',sans-serif;font-size:52px;font-weight:900;line-height:1.1;color:white;margin-bottom:16px;text-shadow:0 0 40px rgba(233,69,96,0.3);}
  .accent-line{width:80px;height:4px;background:linear-gradient(90deg,${accent},#f9a825);border-radius:2px;margin:0 auto 16px;}
  .subtitle{font-size:22px;color:rgba(255,255,255,0.7);max-width:700px;line-height:1.4;margin-bottom:24px;}
  .stat-row{display:flex;gap:20px;align-items:center;}
  .stat{font-size:18px;font-weight:600;color:#f9a825;}
  .difficulty{font-size:14px;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);}
  .brand{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);font-size:14px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;}

  /* HOOK */
  .hook-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;}
  .hook-icon{font-size:80px;margin-bottom:24px;}
  .hook-headline{font-family:'Poppins',sans-serif;font-size:64px;font-weight:900;color:white;line-height:1.1;margin-bottom:16px;}
  .hook-sub{font-size:26px;color:rgba(255,255,255,0.6);max-width:600px;}

  /* OUTCOME */
  .outcome-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:80px;}
  .outcome-num{font-family:'Poppins',sans-serif;font-size:120px;font-weight:900;color:rgba(233,69,96,0.15);position:absolute;right:60px;top:50%;transform:translateY(-50%);line-height:1;}
  .outcome-icon{font-size:52px;margin-bottom:16px;}
  .outcome-headline{font-family:'Poppins',sans-serif;font-size:52px;font-weight:800;color:white;line-height:1.1;margin-bottom:12px;max-width:700px;}
  .outcome-sub{font-size:24px;color:rgba(255,255,255,0.6);margin-bottom:20px;}
  .outcome-check{display:inline-flex;align-items:center;gap:8px;font-size:16px;color:${accent};font-weight:600;}

  /* CHAPTER PREVIEW */
  .chapter-card{position:absolute;inset:0;display:flex;padding:50px 60px;gap:60px;align-items:center;}
  .chapter-label{font-size:12px;letter-spacing:0.2em;color:${accent};font-weight:700;margin-bottom:8px;}
  .chapter-stat{display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0;}
  .big-num{font-family:'Poppins',sans-serif;font-size:100px;font-weight:900;color:${accent};line-height:1;text-shadow:0 0 40px ${accent}40;}
  .big-label{font-size:24px;color:rgba(255,255,255,0.6);font-weight:600;margin-top:-8px;}
  .chapter-list{flex:1;display:flex;flex-direction:column;gap:10px;}
  .ch-item{display:flex;align-items:center;gap:16px;padding:10px 16px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:3px solid ${accent};}
  .ch-num{font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;color:${accent};flex-shrink:0;}
  .ch-title{font-size:15px;color:rgba(255,255,255,0.8);}
  .chapter-total{font-size:14px;color:rgba(255,255,255,0.4);margin-top:8px;}

  /* SOCIAL PROOF */
  .proof-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;}
  .proof-logo{font-family:'Poppins',sans-serif;font-size:32px;font-weight:800;color:white;margin-bottom:24px;display:flex;align-items:center;gap:10px;}
  .logo-dot{color:#f9a825;font-size:20px;}
  .proof-headline{font-family:'Poppins',sans-serif;font-size:48px;font-weight:900;color:white;margin-bottom:12px;}
  .proof-sub{font-size:22px;color:rgba(255,255,255,0.6);margin-bottom:20px;}
  .proof-stars{font-size:36px;margin-bottom:12px;}
  .proof-tagline{font-size:18px;color:${accent};font-weight:600;letter-spacing:0.05em;}

  /* CTA */
  .cta-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;background:radial-gradient(ellipse at center,rgba(233,69,96,0.15) 0%,transparent 70%);}
  .cta-icon{font-size:64px;margin-bottom:16px;}
  .cta-headline{font-family:'Poppins',sans-serif;font-size:72px;font-weight:900;color:white;line-height:1;margin-bottom:12px;text-shadow:0 0 40px rgba(233,69,96,0.5);}
  .cta-sub{font-size:24px;color:rgba(255,255,255,0.7);margin-bottom:28px;}
  .cta-button{display:inline-block;background:${accent};color:white;font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;padding:14px 40px;border-radius:8px;margin-bottom:16px;box-shadow:0 0 40px rgba(233,69,96,0.4);}
  .cta-platform{font-size:14px;color:rgba(255,255,255,0.4);letter-spacing:0.05em;}
</style>
</head>
<body>
  <div class="top-bar"></div>
  <div class="slide-counter">${slideIndex}/${totalSlides}</div>
  ${content}
  <div class="progress-bar"></div>
  <div class="brand-wm">TechNuggets Academy</div>
</body>
</html>`;
}

// ── Screenshot slides ─────────────────────────────────────────────────────────
async function screenshotSlides(slides, course) {
  console.log('\n📸 Step 3 — Generating slide images...');

  const browser    = await puppeteer.launch({ headless: 'new' });
  const slidePaths = [];

  for (let i = 0; i < slides.length; i++) {
    const slide    = slides[i];
    const padded   = String(i).padStart(2, '0');
    const htmlPath = path.join(SLIDES_DIR, `slide-${padded}.html`);
    const pngPath  = path.join(SLIDES_DIR, `slide-${padded}.png`);

    fs.writeFileSync(htmlPath, generateSlideHTML(slide, course, i + 1, slides.length));

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
    await page.goto(`file://${htmlPath}`);
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    await page.close();

    slidePaths.push({ path: pngPath, duration: slide.duration_seconds || 7 });
    console.log(`   ✓ slide-${padded}.png (${slide.type}, ${slide.duration_seconds}s)`);
  }

  await browser.close();
  return slidePaths;
}

// ── Create slideshow from PNGs ────────────────────────────────────────────────
async function createSlideshowVideo(slidePaths) {
  console.log('\n🎬 Step 4 — Building slideshow video...');

  const slideshowPath = path.join(TEMP_DIR, 'slideshow.mp4');
  const segments      = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const { path: imgPath, duration } = slidePaths[i];
    const segPath = path.join(TEMP_DIR, `seg-${i}.mp4`);

    execSync([
      'ffmpeg -y',
      `-loop 1 -framerate 30 -i "${imgPath}"`,
      `-t ${duration}`,
      '-c:v libx264 -crf 18 -preset fast',
      '-pix_fmt yuv420p',
      '-vf "scale=1280:720:flags=lanczos"',
      `"${segPath}"`,
    ].join(' '), { stdio: 'pipe' });

    segments.push(segPath);
    console.log(`   ✓ seg-${i}.mp4 (${duration}s)`);
  }

  const concatFile = path.join(TEMP_DIR, 'concat.txt');
  fs.writeFileSync(concatFile, segments.map(s => `file '${s}'`).join('\n'));

  execSync([
    'ffmpeg -y',
    '-f concat -safe 0',
    `-i "${concatFile}"`,
    '-c copy',
    `"${slideshowPath}"`,
  ].join(' '), { stdio: 'pipe' });

  console.log('   ✓ slideshow.mp4 assembled');
  return slideshowPath;
}

// ── Composite with HeyGen PIP ─────────────────────────────────────────────────
async function compositeWithHeyGen(slideshowPath) {
  console.log('\n🎬 Step 5 — Compositing with HeyGen video...');

  const heygenPaths = [
    path.join(PROJECT_ROOT, 'heygen-promo.mp4'),
    path.join(PROMO_DIR,    'heygen-promo.mp4'),
    path.join(require('os').homedir(), 'Downloads', 'heygen-promo.mp4'),
  ];

  let heygenPath = null;
  for (const p of heygenPaths) {
    if (fs.existsSync(p)) { heygenPath = p; console.log(`   ✓ Found: ${p}`); break; }
  }

  const outputPath = path.join(PROMO_DIR, 'welcome-promo.mp4');

  if (!heygenPath) {
    console.log('   ⚠ No HeyGen video found — outputting slides only');
    console.log('   Place heygen-promo.mp4 in project root to add avatar PIP');

    execSync([
      `ffmpeg -y -i "${slideshowPath}"`,
      '-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p',
      `"${outputPath}"`,
    ].join(' '), { stdio: 'pipe' });

  } else {
    execSync([
      'ffmpeg -y',
      `-i "${slideshowPath}"`,
      `-i "${heygenPath}"`,
      '-filter_complex',
      `"[0:v]scale=1280:720:flags=lanczos[bg];` +
      `[1:v]scale=160:-2:flags=lanczos[av];` +
      `[av]pad=iw+4:ih+4:2:2:color=white[av_b];` +
      `[bg][av_b]overlay=W-w-20:H-h-20[outv]"`,
      '-map [outv] -map 1:a',
      '-c:v libx264 -crf 18 -preset slow',
      '-pix_fmt yuv420p -c:a aac -b:a 192k -shortest',
      `"${outputPath}"`,
    ].join(' '), { stdio: 'pipe' });
  }

  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`   ✓ welcome-promo.mp4 (${sizeMB} MB)`);
  return outputPath;
}

// ── Vertical version for YouTube Shorts ──────────────────────────────────────
async function createVerticalVersion(promoPath) {
  console.log('\n📱 Step 6 — Creating YouTube Shorts version (9:16)...');

  const shortPath = path.join(PROMO_DIR, 'welcome-promo-short.mp4');

  execSync([
    `ffmpeg -y -i "${promoPath}"`,
    '-filter_complex',
    '"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,' +
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[outv]"',
    '-map [outv] -map 0:a?',
    '-c:v libx264 -crf 18 -preset slow',
    '-pix_fmt yuv420p -c:a aac -b:a 192k',
    `"${shortPath}"`,
  ].join(' '), { stdio: 'pipe' });

  console.log('   ✓ welcome-promo-short.mp4 (9:16 for YouTube Shorts)');
  return shortPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args         = process.argv.slice(2);
  const previewOnly  = args.includes('--preview');
  const skipVertical = args.includes('--no-vertical');

  console.log('\n🎬 Course Promo Video Generator');
  console.log('='.repeat(50));
  console.log(`Mode: ${previewOnly ? '👁  Preview only' : '🚀 Full render'}`);
  console.log('='.repeat(50));

  const course = loadCourseData();
  console.log(`\n📚 Course: ${course.course_title}`);
  console.log(`   Chapters: ${course.chapters?.length || 0}`);

  // Step 1: Script
  const script = await generatePromoScript(course);

  console.log('\n📝 Promo Script:');
  console.log('─'.repeat(50));
  console.log(script);
  console.log('─'.repeat(50));
  console.log('\n💡 Copy this script and paste into HeyGen:');
  console.log('   heygen.com → Create Video → Paste script');
  console.log('   Save video as: heygen-promo.mp4');
  console.log(`   Place in: ${PROJECT_ROOT}/`);

  // Always save script to file
  const scriptPath = path.join(PROMO_DIR, 'promo-script.txt');
  fs.writeFileSync(scriptPath, script);
  console.log(`\n   Script saved to: ${scriptPath}`);

  if (previewOnly) {
    console.log('\n👁  Preview mode — script generated, no rendering');
    return;
  }

  // Step 2: Slide plan
  const slides = await generatePromoSlides(course, script);

  // Step 3: Screenshot
  const slidePaths = await screenshotSlides(slides, course);

  // Step 4: Slideshow
  const slideshowPath = await createSlideshowVideo(slidePaths);

  // Step 5: Composite
  const promoPath = await compositeWithHeyGen(slideshowPath);

  // Step 6: Vertical
  if (!skipVertical) {
    await createVerticalVersion(promoPath);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Promo Video Complete!');
  console.log('='.repeat(50));
  console.log(`\n📁 Output files in: ${PROMO_DIR}/`);
  console.log('   welcome-promo.mp4         → Udemy + YouTube');
  if (!skipVertical) {
    console.log('   welcome-promo-short.mp4   → YouTube Shorts (9:16)');
  }
  console.log('   promo-script.txt          → Script for HeyGen / voiceover');
  console.log('\n📋 Next steps:');
  console.log('   1. Upload welcome-promo.mp4 to YouTube as course trailer');
  console.log('   2. Upload to Udemy Studio → Course → Promo Video');
  console.log('   3. Upload welcome-promo-short.mp4 as YouTube Short');
  console.log('   4. Share on social media for course launch');
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('\n❌ Promo render failed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
