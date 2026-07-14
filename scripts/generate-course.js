#!/usr/bin/env node
/**
 * generate-course.js — Headless course generator for the TechNuggets pipeline.
 *
 * Generates a complete certification course (curriculum → chapter scripts →
 * materials → practice tests → render inputs → HeyGen narration files →
 * Udemy listing copy) with zero browser interaction.
 *
 * Usage:
 *   node scripts/generate-course.js --config=course-configs/aws-ai-practitioner-aif-c01.json
 *   node scripts/generate-course.js --config=... --resume        (default: resumes)
 *   node scripts/generate-course.js --config=... --stage=curriculum|scripts|materials|tests|assemble
 *
 * Output: generated/<slug>/
 *   state.json                    checkpoint (safe to re-run; finished units skipped)
 *   course-data-export.json       same schema as the browser app's export
 *   course-render-input-N.json    per-chapter render configs for npm run render:all
 *   heygen/chapter-NN-narration.txt  clean spoken text for HeyGen avatar/voice
 *   udemy-listing.md              title/subtitle/description/objectives for the Udemy form
 *   promo-script.txt              60-second promo narration
 *
 * Requires ANTHROPIC_API_KEY in .env (project root).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---------- tiny .env parser (no deps) ----------
function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const ENV = loadEnv();
const API_KEY = process.env.ANTHROPIC_API_KEY || ENV.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('❌ ANTHROPIC_API_KEY not found in .env'); process.exit(1); }

const MODEL = process.env.COURSE_GEN_MODEL || 'claude-sonnet-4-5';

// ---------- args ----------
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.config) { console.error('Usage: node scripts/generate-course.js --config=course-configs/<file>.json'); process.exit(1); }

const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, args.config), 'utf8'));
const OUT = path.join(ROOT, 'generated', CFG.slug);
fs.mkdirSync(path.join(OUT, 'heygen'), { recursive: true });

const STATE_FILE = path.join(OUT, 'state.json');
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { scripts: {}, materials: {}, tests: {} };
function save() { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

// ---------- master prompt (reuse the repo's certification philosophy) ----------
const MASTER = fs.readFileSync(path.join(ROOT, 'prompts', 'certification-course-prompt.md'), 'utf8');

// ---------- HTTP layer: plain fetch, or CONNECT-tunnel when HTTPS_PROXY is set ----------
const http = require('http');
const https = require('https');
const tls = require('tls');

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || null;

class ConnectProxyAgent extends https.Agent {
  constructor(proxyUrl, opts) {
    super(opts);
    const u = new URL(proxyUrl);
    this.proxyHost = u.hostname;
    this.proxyPort = Number(u.port) || 3128;
  }
  createConnection(options, cb) {
    const req = http.request({
      host: this.proxyHost,
      port: this.proxyPort,
      method: 'CONNECT',
      path: `${options.host}:${options.port}`,
      headers: { host: `${options.host}:${options.port}` },
    });
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) return cb(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
      cb(null, tls.connect({ socket, servername: options.host }));
    });
    req.on('error', cb);
    req.end();
  }
}

const proxyAgent = PROXY ? new ConnectProxyAgent(PROXY, { keepAlive: true }) : null;

function postJSON(url, headers, bodyObj) {
  if (!proxyAgent) {
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj) })
      .then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
  }
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      host: u.hostname, port: 443, path: u.pathname, method: 'POST',
      headers, agent: proxyAgent, timeout: 600000,
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        let json = {}; try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.end(JSON.stringify(bodyObj));
  });
}

// ---------- Anthropic call with retry ----------
async function callClaude(system, user, maxTokens = 8000, label = '') {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await postJSON('https://api.anthropic.com/v1/messages', {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      }, {
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        const wait = Math.min(60, 5 * attempt * attempt);
        console.log(`   ⏳ ${label}: HTTP ${res.status}, retry in ${wait}s (attempt ${attempt}/5)`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      const data = res.json;
      if (data.error) throw new Error(`${data.error.type}: ${data.error.message}`);
      const text = (data.content || []).map(b => b.text || '').join('');
      const usage = data.usage || {};
      console.log(`   ✅ ${label}: ${usage.output_tokens || '?'} tokens out`);
      return text;
    } catch (e) {
      if (attempt === 5) throw e;
      const wait = 5 * attempt;
      console.log(`   ⚠️ ${label}: ${e.message} — retry in ${wait}s`);
      await new Promise(r => setTimeout(r, wait * 1000));
    }
  }
}

// ---------- tolerant JSON parse (mirrors app.js parseJSON strategies) ----------
function parseJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [text, fenced && fenced[1]].filter(Boolean);
  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
    const start = c.search(/[{[]/);
    if (start >= 0) {
      // brace-scan for the matching close
      const open = c[start], close = open === '{' ? '}' : ']';
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < c.length; i++) {
        const ch = c[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = !inStr;
        if (inStr) continue;
        if (ch === open) depth++;
        if (ch === close) { depth--; if (depth === 0) { try { return JSON.parse(c.slice(start, i + 1)); } catch {} break; } }
      }
    }
  }
  throw new Error('Could not parse JSON from model response: ' + text.slice(0, 200));
}

const domainsBlock = CFG.domains.map(d => `- ${d.name} (${d.weight}): ${d.notes}`).join('\n');

// ---------- Stage 1: curriculum ----------
async function genCurriculum() {
  if (state.curriculum) { console.log('▶ curriculum: already done, skipping'); return; }
  console.log('▶ Stage 1/5: curriculum');
  const system = `${MASTER}\n\nYou are generating the CURRICULUM. Respond with ONLY valid JSON, no prose.`;
  const user = `Design the complete curriculum for a Udemy certification-prep video course.

CERT: ${CFG.cert_name} (${CFG.exam_code}) by ${CFG.exam_vendor}
EXAM FORMAT: ${CFG.exam_format}
AUDIENCE: ${CFG.audience}
OFFICIAL DOMAINS:
${domainsBlock}
EXTRA GUIDANCE: ${CFG.extra_guidance}
AUTHOR: ${CFG.author} — use this exact name anywhere an author/instructor is referenced.

Create exactly ${CFG.chapters_target} chapters. Order chapters by exam-domain order. The final chapter is a full exam simulation + test-taking strategy. Respond with ONLY this JSON:
{
  "course_title": "≤60 chars, includes cert code, compelling",
  "course_subtitle": "≤120 chars, outcome-focused",
  "course_description": "3 paragraphs of Udemy sales copy. Mention author ${CFG.author}.",
  "difficulty": "${CFG.difficulty}",
  "estimated_hours": <number>,
  "prerequisites": ["..."],
  "skills_learned": ["8-10 concrete skills"],
  "chapters": [
    {
      "number": 1,
      "title": "...",
      "subtitle": "...",
      "duration_mins": <15-30>,
      "exam_domain": "exact domain name",
      "exam_weight": "e.g. 20%",
      "heavily_tested": ["top 3 concepts"],
      "concepts": ["5-7 specific concepts"],
      "hands_on": "specific lab with exact tool/service names",
      "lab_duration_mins": <number>,
      "gotchas": ["top 3 exam traps"],
      "real_world_example": "concrete scenario, 2-3 sentences",
      "quiz_questions": [
        {"question":"...","options":["A","B","C","D"],"correct_index":<0-3>,"explanation":"..."}
      ],
      "key_takeaway": "one sentence"
    }
  ]
}
Each chapter needs exactly 2 quiz_questions.`;
  const text = await callClaude(system, user, 16000, 'curriculum');
  const cur = parseJSON(text);
  if (!cur.chapters || cur.chapters.length < CFG.chapters_target - 1) throw new Error('Curriculum missing chapters');
  state.curriculum = cur;
  save();
}

// ---------- Stage 2: chapter scripts ----------
async function genScripts() {
  console.log('▶ Stage 2/5: chapter scripts');
  const cur = state.curriculum;
  for (const ch of cur.chapters) {
    if (state.scripts[ch.number]) { console.log(`   ↷ ch${ch.number} script done, skipping`); continue; }
    const system = `${MASTER}\n\nYou are generating a CHAPTER SCRIPT. Follow the SCRIPT GENERATION PROMPT rules exactly.`;
    const user = `Write the full narration script for this chapter of "${cur.course_title}" (${CFG.exam_code} prep).

CHAPTER ${ch.number}/${cur.chapters.length}: ${ch.title}
SUBTITLE: ${ch.subtitle}
EXAM DOMAIN: ${ch.exam_domain} (${ch.exam_weight})
HEAVILY TESTED: ${(ch.heavily_tested || []).join('; ')}
CONCEPTS: ${(ch.concepts || []).join('; ')}
LAB: ${ch.hands_on}
GOTCHAS: ${(ch.gotchas || []).join('; ')}
TARGET: 2500-3000 words (~17-20 min at 150 wpm).

FORMAT: Markdown. Start with "# ${cur.course_title}" then "## Chapter ${ch.number}: ${ch.title}", then the timed sections per the strict chapter structure ([0:00] etc). This script will be read aloud by ${CFG.author} via an AI avatar — write natural spoken sentences; spell out symbols where a human would (say "top-p" not "top_p"). Include exam callouts and the lab pause instruction. End with the 30-second max summary. No subscribe CTA (this is a Udemy course).

FACTUAL ACCURACY RULES — CRITICAL:
- The current year is ${new Date().getFullYear()}. Reference CURRENT model generations, context windows, and service capabilities. Never cite outdated examples (no "Claude 2", no "GPT-4 has 4096 tokens").
- Never fabricate exam trivia. Only claim "the exam tests X" for things in the official exam guide domains. Do not invent oddly specific claims (like exact tokenization of a particular word).
- Quadratic is not exponential — keep mathematical language precise.
- For prices and limits that change often: teach the decision rule and comparison, use "approximately", and avoid precise dollar figures unless they are stable and exam-relevant.
- Every specific number you state must be one you are confident is correct at publication time; otherwise omit it or generalize.`;
    const text = await callClaude(system, user, 8000, `ch${ch.number} script`);
    state.scripts[ch.number] = text;
    save();
  }
}

// ---------- Stage 3: materials per chapter ----------
async function genMaterials() {
  console.log('▶ Stage 3/5: materials (questions, flashcards, cheatsheets)');
  const cur = state.curriculum;
  for (const ch of cur.chapters) {
    const key = `ch${ch.number}`;
    if (state.materials[key]) { console.log(`   ↷ ${key} materials done, skipping`); continue; }
    const system = `${MASTER}\n\nYou are generating chapter MATERIALS. Respond with ONLY valid JSON.`;
    const user = `Generate study materials for chapter ${ch.number} "${ch.title}" of the ${CFG.exam_code} course.
DOMAIN: ${ch.exam_domain} (${ch.exam_weight}) — heavily tested: ${(ch.heavily_tested || []).join('; ')}
CONCEPTS: ${(ch.concepts || []).join('; ')}

Respond ONLY with JSON:
{
  "questions": [ 8 exam-quality practice questions using the QUESTION STANDARDS distribution:
    {"question":"...","options":["...","...","...","..."],"correct_index":<0-3>,"domain":"...","why_correct":"...","why_others_wrong":["...","...","..."],"commonly_missed":true|false}
  ],
  "flashcards": [ 12 Anki-style cards per FLASHCARD RULES: {"front":"...","back":"...","category":"Numbers & Limits|Service Comparisons|Commands & Syntax|Architecture Patterns|Pricing Tiers"} ],
  "cheatsheet": "markdown cheat sheet for this chapter: tables of limits/comparisons/commands, ≤600 words"
}
ACCURACY: The current year is ${new Date().getFullYear()} — use current model/service facts only; every stated number must be correct at publication time or omitted; never fabricate exam trivia.`;
    const text = await callClaude(system, user, 8000, `${key} materials`);
    state.materials[key] = parseJSON(text);
    save();
  }
}

// ---------- Stage 4: practice tests ----------
async function genTests() {
  console.log('▶ Stage 4/5: practice tests (2 × 45 questions)');
  const cur = state.curriculum;
  const perDomain = CFG.domains.map(d => ({
    domain: d.name,
    count: Math.max(3, Math.round(45 * parseInt(d.weight) / 100)),
  }));
  for (const testNum of [1, 2]) {
    for (const pd of perDomain) {
      const key = `t${testNum}:${pd.domain}`;
      if (state.tests[key]) { console.log(`   ↷ ${key} done, skipping`); continue; }
      const system = `${MASTER}\n\nYou are generating PRACTICE TEST questions. Respond with ONLY a valid JSON array.`;
      const user = `Generate ${pd.count} exam-quality ${CFG.exam_code} practice-test questions for domain "${pd.domain}" (practice test #${testNum}${testNum === 2 ? ' — make these HARDER and fully distinct from a typical first test' : ''}).
Follow the QUESTION STANDARDS distribution and SCENARIO QUESTION FORMAT.
Respond ONLY with a JSON array:
[{"question":"...","options":["...","...","...","..."],"correct_index":<0-3>,"domain":"${pd.domain}","why_correct":"...","why_others_wrong":["...","...","..."],"commonly_missed":true|false}]
ACCURACY: The current year is ${new Date().getFullYear()} — use current model/service facts only; correct answers must be verifiably correct; never fabricate exam trivia. Randomize which option position holds the correct answer.`;
      const text = await callClaude(system, user, 8000, key);
      state.tests[key] = parseJSON(text);
      save();
    }
  }
}

// ---------- Stage 5: assemble outputs ----------
function extractNarration(md) {
  // Strip markdown headings, code fences, timestamps, and stage directions → clean spoken text for HeyGen
  return md
    .replace(/```[\s\S]*?```/g, ' ')                 // code blocks are shown on slides, not read verbatim
    .replace(/^#{1,6} .*$/gm, '')
    .replace(/^\s*\[\d+:\d+\]\s*-?\s*/gm, '')
    .replace(/\*\*(ON SCREEN|VISUAL|SLIDE)[^]*?\*\*/gi, '')
    .replace(/\*\*/g, '')
    .replace(/^[-*] /gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assemble() {
  console.log('▶ Stage 5/5: assemble outputs');
  const cur = state.curriculum;
  const now = new Date().toISOString();
  const courseId = Date.now();

  // materials in browser-export shape
  const materials = {};
  for (const ch of cur.chapters) {
    const m = state.materials[`ch${ch.number}`] || {};
    materials[`ch${ch.number}_questions`] = m.questions || [];
    materials[`ch${ch.number}_flashcards`] = m.flashcards || [];
    materials[`ch${ch.number}_cheatsheet`] = m.cheatsheet || '';
  }

  // practice tests in browser-export shape
  const practice_tests = [1, 2].map(n => {
    const questions = [];
    const domain_breakdown = {};
    for (const d of CFG.domains) {
      const qs = state.tests[`t${n}:${d.name}`] || [];
      questions.push(...qs);
      domain_breakdown[d.name] = qs.length;
    }
    return {
      test_number: n,
      cert_name: cur.course_title,
      total_questions: questions.length,
      time_limit_minutes: 90,
      passing_score: 700,
      passing_percentage: '70%',
      generated_date: now,
      domain_breakdown,
      questions,
    };
  });

  const scripts = {};
  for (const ch of cur.chapters) scripts[String(ch.number)] = state.scripts[ch.number];

  const exportJson = {
    ...cur,
    id: courseId,
    topic: CFG.topic,
    audience: CFG.audience,
    createdAt: now,
    course_type: 'certification',
    author: CFG.author,
    export_date: now,
    export_version: '1.0',
    scripts,
    materials,
    practice_tests,
  };
  fs.writeFileSync(path.join(OUT, 'course-data-export.json'), JSON.stringify(exportJson, null, 2));

  // render inputs + heygen narration
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  for (const ch of cur.chapters) {
    const renderInput = {
      course_title: cur.course_title,
      course_id: courseId,
      chapter_number: ch.number,
      chapter_title: ch.title,
      chapter_subtitle: ch.subtitle,
      total_chapters: cur.chapters.length,
      script: state.scripts[ch.number],
      duration_mins: ch.duration_mins,
      key_takeaway: ch.key_takeaway,
      quiz_questions: ch.quiz_questions,
      concepts: ch.concepts,
      heygen_local_file: `heygen-chapter-${String(ch.number).padStart(2, '0')}.mp4`,
      output_filename: `chapter-${String(ch.number).padStart(2, '0')}-${slugify(ch.title)}.mp4`,
    };
    fs.writeFileSync(path.join(OUT, `course-render-input-${ch.number}.json`), JSON.stringify(renderInput, null, 2));
    fs.writeFileSync(path.join(OUT, 'heygen', `chapter-${String(ch.number).padStart(2, '0')}-narration.txt`), extractNarration(state.scripts[ch.number]));
  }

  // Udemy listing copy
  const listing = `# Udemy Listing — ${cur.course_title}

**Instructor / Author:** ${CFG.author}

## Title (60 char max)
${cur.course_title}

## Subtitle (120 char max)
${cur.course_subtitle}

## Description
${cur.course_description}

## What you'll learn
${(cur.skills_learned || []).map(s => `- ${s}`).join('\n')}

## Requirements
${(cur.prerequisites || []).map(s => `- ${s}`).join('\n')}

## Who this course is for
${CFG.audience}

## Course structure
${cur.chapters.map(c => `${c.number}. ${c.title} (${c.duration_mins} min) — ${c.exam_domain} ${c.exam_weight}`).join('\n')}

## Practice tests
2 full-length practice tests (${practice_tests[0].total_questions} and ${practice_tests[1].total_questions} questions) with per-domain breakdown and explanations.
`;
  fs.writeFileSync(path.join(OUT, 'udemy-listing.md'), listing);
  console.log(`✅ Assembled → ${OUT}`);
}

// ---------- run ----------
(async () => {
  const stage = args.stage;
  console.log(`\n📚 Generating course: ${CFG.cert_name} (${CFG.exam_code}) — model ${MODEL}\n   Output: ${OUT}\n`);
  try {
    if (!stage || stage === 'curriculum') await genCurriculum();
    if (!stage || stage === 'scripts') await genScripts();
    if (!stage || stage === 'materials') await genMaterials();
    if (!stage || stage === 'tests') await genTests();
    if (!stage || stage === 'assemble') assemble();
    fs.writeFileSync(path.join(OUT, 'DONE'), new Date().toISOString());
    console.log('\n🎉 Course generation complete.');
  } catch (e) {
    console.error('\n❌ Failed:', e.message);
    console.error('   State saved — re-run the same command to resume.');
    process.exit(1);
  }
})();
