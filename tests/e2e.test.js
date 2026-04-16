'use strict';
/**
 * e2e.test.js — Course Pipeline end-to-end test suite
 *
 * Run: node --test tests/e2e.test.js
 *   or: npm test
 *
 * Pure functions are ported from the ES-module source files into CJS for
 * testability. Each port is labelled with its source file.
 */

const { test, describe } = require('node:test');
const assert             = require('node:assert/strict');
const path               = require('node:path');
const fs                 = require('node:fs');

const { createMockStorage } = require('./mocks/storage.mock.js');
const anthropicMock         = require('./mocks/anthropic.mock.js');

// ─────────────────────────────────────────────────────────────────────────────
// PORTED FUNCTIONS — extracted from ES module sources for CJS testability
// ─────────────────────────────────────────────────────────────────────────────

// ── From: components/chapter.js — cleanChapterScript() ───────────────────────

const CODE_BLOCK_PHRASES = [
  "Here's the code example on screen",
  "As shown in the code on screen",
  "Take a look at this on screen",
  "Check out this example on screen",
  "Here's what that looks like on screen",
];

const METADATA_LINE_PATTERNS = [
  /^word\s+count[:：]/i,
  /^estimated\s+runtime[:：]/i,
  /^target\s+audience[:：]/i,
  /^duration[:：]/i,
  /^tone[:：]/i,
  /^chapter\s+\d+\s*$/i,
  /^\[end\s+of\s+chapter/i,
  /^\[chapter\s+\d+/i,
  /^video\s+script/i,
  /^complete\s+spoken/i,
  /^spoken\s+text/i,
];

const DELIVERY_WORDS = [
  'pause', 'smile', 'laugh', 'energetic', 'serious', 'slow', 'fast',
  'loud', 'soft', 'whisper', 'emphasize', 'dramatic', 'excited', 'calm',
  'urgent', 'delivery', 'tone', 'voice', 'speaking', 'beat', 'chuckle',
  'warmly', 'firmly', 'gently', 'clearly',
];

const CODE_SYNTAX_WORDS = [
  'open parenthesis', 'close parenthesis', 'open bracket', 'close bracket',
  'open curly brace', 'close curly brace', 'semicolon', 'colon here',
  'dot notation', 'double colon', 'backslash', 'forward slash',
  'equals sign', 'assignment operator', 'open paren', 'close paren',
];

function cleanChapterScript(script) {
  if (!script) return '';

  let codeIdx = 0;
  let cleaned = script.replace(/```[\s\S]*?```/g, () =>
    CODE_BLOCK_PHRASES[codeIdx++ % CODE_BLOCK_PHRASES.length] + '.'
  );

  let lines = cleaned.split('\n').map(line => {
    const trimmed = line.trim();

    if (/^#{1,6}\s/.test(trimmed)) return null;
    if (/^\*{1,3}[^*\n]+\*{1,3}$/.test(trimmed)) return null;
    if (/^\*{1,2}\[.*\]\*{1,2}$/.test(trimmed)) return null;
    if (/^[-=*_]{2,}$/.test(trimmed)) return null;
    if (/^\[[^\]]+\]$/.test(trimmed)) return null;
    if (METADATA_LINE_PATTERNS.some(p => p.test(trimmed))) return null;

    let out = line;
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    out = out.replace(/\*([^*\n]+)\*/g,     '$1');
    out = out.replace(/__([^_\n]+)__/g,     '$1');
    out = out.replace(/_([^_\n]+)_/g,       '$1');
    out = out.replace(/\*+/g, '');
    out = out.replace(/\[[^\]]*\]/g, '');
    out = out.replace(/`([^`]+)`/g, '$1');
    out = out.replace(/https?:\/\/[^\s]*/g, '');

    DELIVERY_WORDS.forEach(word => {
      out = out.replace(new RegExp(`\\([^)]*\\b${word}\\b[^)]*\\)`, 'gi'), '');
    });

    if (!out.trim()) return null;
    return out;
  });

  lines = lines.filter(l => l !== null);

  lines = lines.map(line => {
    let out = line;
    out = out.replace(/type\s+(['"`])?[a-z_]+(['"`])?\s*(then|next|and)/gi, '');
    CODE_SYNTAX_WORDS.forEach(sw => {
      out = out.replace(new RegExp(sw, 'gi'), '');
    });
    out = out.replace(/line by line|each line|every line|line \d+/gi, '');
    return out;
  });

  const result = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) result.push(line);
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  return result.join('\n').trim();
}

// ── From: components/curriculum.js — curriculum parsing ──────────────────────

function parseCurriculumResponse(apiResponse) {
  const textBlocks = (apiResponse.content || []).filter(b => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('No text content in API response.');
  }
  const text  = textBlocks.map(b => b.text).join('\n');
  const clean = text.replace(/```json|```/g, '').trim();
  const m     = clean.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON object found in curriculum response.');
  return JSON.parse(m[0]);
}

function isValidCurriculum(curriculum) {
  if (!curriculum || typeof curriculum !== 'object') return false;
  if (!curriculum.course_title) return false;
  if (!Array.isArray(curriculum.chapters)) return false;
  if (curriculum.chapters.length < 1) return false;
  if (curriculum.chapters.length > 15) return false;
  return true;
}

// ── From: app.js / components/chapter.js — script helpers ────────────────────

function isScriptTruncated(apiResponse) {
  return apiResponse.stop_reason === 'max_tokens';
}

// Mirrors the hasEnding check in app.js generateFullScript()
function hasProperEnding(script) {
  const lower = script.toLowerCase();
  return (
    lower.includes('subscribe') ||
    lower.includes('next chapter') ||
    lower.includes('see you')
  );
}

const WPM = 150;

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function estimateDuration(script) {
  return Math.round(countWords(script) / WPM);
}

// 30-min chapter ≈ 4500 words at 150 wpm
function isWithinWordLimit(text, limit = 4500) {
  return countWords(text) <= limit;
}

// ── From: components/slides.js — render input helpers ────────────────────────

function padChapterNum(n) {
  return String(n).padStart(2, '0');
}

function buildRenderInput(chapterNum, curriculum, script) {
  const ch  = curriculum.chapters.find(c => c.number === chapterNum);
  if (!ch) throw new Error(`Chapter ${chapterNum} not found in curriculum`);
  const pad = padChapterNum(chapterNum);
  return {
    course_title:     curriculum.course_title,
    course_id:        curriculum.id || curriculum.course_id || 'course',
    chapter_number:   ch.number,
    chapter_title:    ch.title,
    chapter_subtitle: ch.subtitle || '',
    total_chapters:   curriculum.chapters.length,
    script:           script || '',
    duration_mins:    ch.duration_mins || 15,
    key_takeaway:     ch.key_takeaway || '',
    quiz_questions:   ch.quiz_questions || [],
    concepts:         ch.concepts || [],
    heygen_local_file: `heygen-chapter-${pad}.mp4`,
    output_filename:  `chapter-${pad}-final.mp4`,
  };
}

// ── File path helpers (derived from render/course-render.js conventions) ──────

function getChapterDir(n) {
  return path.join('render', 'chapters', `chapter-${padChapterNum(n)}`);
}

function getFinalVideoFilename(n) {
  return `chapter-${padChapterNum(n)}-final.mp4`;
}

function getHeygenFilename(n) {
  return `heygen-chapter-${padChapterNum(n)}.mp4`;
}

function getSlidesDir(n) {
  return path.join(getChapterDir(n), 'slides');
}

// ── Slide validation (from render/course-render.js conventions) ───────────────

const VALID_SLIDE_TYPES = new Set([
  'chapter_title', 'concept', 'code', 'live_code',
  'analogy', 'diagram', 'quiz', 'chapter_summary',
]);

const VALID_MERMAID_STARTS = [
  'flowchart', 'graph', 'sequencediagram',
  'classdiagram', 'statediagram', 'erdiagram',
  'gantt', 'pie', 'gitgraph', 'mindmap',
];

function isValidSlideType(type) {
  return VALID_SLIDE_TYPES.has(type);
}

function isValidMermaidCode(code) {
  if (!code || code.length < 10) return false;
  const firstWord = code.trim().split(/[\s\n]/)[0].toLowerCase();
  return VALID_MERMAID_STARTS.some(s => firstWord.startsWith(s));
}

const PLACEHOLDER_PATTERNS = [
  /see diagram in accompanying/i,
  /refer to accompanying/i,
  /see figure \d/i,
  /\[diagram here\]/i,
  /\[insert diagram\]/i,
  /as shown in the diagram below/i,
];

function containsPlaceholder(text) {
  return PLACEHOLDER_PATTERNS.some(p => p.test(text));
}

// ── localStorage course data helpers (storage-injectable) ────────────────────

const CURRICULUM_KEY = 'course_curriculum';

function saveCurriculum(curriculum, storage) {
  storage.setItem(CURRICULUM_KEY, JSON.stringify(curriculum));
}

function getCurriculum(storage) {
  try {
    const raw = storage.getItem(CURRICULUM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function chapterScriptKey(courseId, chapterNum) {
  // Mirrors: localStorage.getItem(`course_chapter_${n}`) from app.js,
  // scoped to courseId so parallel courses don't collide in tests.
  return `course_chapter_${courseId}_${chapterNum}`;
}

function saveChapterScript(courseId, chapterNum, script, storage) {
  storage.setItem(chapterScriptKey(courseId, chapterNum), JSON.stringify({ script }));
}

function getChapterScript(courseId, chapterNum, storage) {
  try {
    const raw = storage.getItem(chapterScriptKey(courseId, chapterNum));
    if (!raw) return null;
    return JSON.parse(raw).script || null;
  } catch { return null; }
}

function isChapterGenerated(courseId, chapterNum, storage) {
  return getChapterScript(courseId, chapterNum, storage) !== null;
}

function countGeneratedChapters(courseId, totalChapters, storage) {
  let count = 0;
  for (let n = 1; n <= totalChapters; n++) {
    if (isChapterGenerated(courseId, n, storage)) count++;
  }
  return count;
}

// ── Integration async helpers ─────────────────────────────────────────────────

async function generateCurriculum(topic, audience, chapterCount, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-opus-4-5',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: `Create a ${chapterCount}-chapter course on ${topic} for ${audience}.` }],
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return parseCurriculumResponse(data);
}

async function generateChapterScript(chapter, curriculum, apiKey) {
  let fullScript = '';
  let attempts   = 0;

  while (attempts < 3) {
    attempts++;
    const messages = attempts === 1
      ? [{ role: 'user', content: `Write a complete video script for Chapter ${chapter.number}: ${chapter.title} of "${curriculum.course_title}".` }]
      : [
          { role: 'user',      content: `Write a complete video script for Chapter ${chapter.number}: ${chapter.title} of "${curriculum.course_title}".` },
          { role: 'assistant', content: fullScript },
          { role: 'user',      content: 'Continue from where you left off.' },
        ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body:    JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 6000, messages }),
    });
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    const data  = await res.json();
    const chunk = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    fullScript += (attempts > 1 ? '\n' : '') + chunk;
    if (data.stop_reason !== 'max_tokens') break;
  }

  return fullScript;
}

async function generateAllScripts(curriculum, apiKey) {
  const scripts = [];
  for (const ch of curriculum.chapters) {
    const script = await generateChapterScript(ch, curriculum, apiKey);
    scripts.push({ chapter: ch.number, script });
  }
  return scripts;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 1 — Chapter Script Cleaning Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('cleanChapterScript()', () => {

  test('removes markdown headers entirely', () => {
    const cases = [
      '# Kubernetes Deep Dive: Chapter 1',
      '## The Container Revolution',
      '### Sub section heading',
      '#### Deep heading',
    ];
    cases.forEach(line => {
      const output = cleanChapterScript(line);
      assert.strictEqual(output.trim(), '', `Should be empty for: ${line}`);
    });
  });

  test('removes bold-only lines entirely', () => {
    const cases = [
      '**CHAPTER INTRO**',
      '**THE EVOLUTION OF INFRASTRUCTURE**',
      '**HANDS-ON EXERCISE**',
    ];
    cases.forEach(line => {
      const output = cleanChapterScript(line);
      assert.strictEqual(output.trim(), '', `Should be empty for: ${line}`);
    });
  });

  test('removes bold-wrapped bracket lines', () => {
    const cases = [
      '**[END OF CHAPTER 1]**',
      '**[SECTION BREAK]**',
    ];
    cases.forEach(line => {
      const output = cleanChapterScript(line);
      assert.strictEqual(output.trim(), '', `Should be empty for: ${line}`);
    });
  });

  test('removes italic metadata lines', () => {
    const cases = [
      '*Word count: approximately 3,450 words*',
      '*Estimated runtime: approximately 23 minutes*',
      '*Target audience: beginners*',
    ];
    cases.forEach(line => {
      // These lines are bold-only style or metadata patterns — should be cleaned
      const output = cleanChapterScript(line);
      assert.ok(
        !output.includes('Word count') && !output.includes('Estimated runtime') && !output.includes('Target audience'),
        `Metadata should be removed from: ${line}`
      );
    });
  });

  test('removes script metadata headers (full block)', () => {
    const input = [
      '# Kubernetes Deep Dive: Chapter 1',
      '## Video Script - Complete Spoken Text',
      '---',
      '**CHAPTER INTRO**',
      '',
      'Welcome everyone to this course.',
    ].join('\n');

    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('Video Script'), false);
    assert.strictEqual(output.includes('CHAPTER INTRO'), false);
    assert.strictEqual(output.includes('---'), false);
    assert.ok(output.includes('Welcome everyone'));
  });

  test('strips bold symbols but keeps inline text', () => {
    const input  = 'This is **very important** to understand';
    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('**'), false);
    assert.ok(output.includes('very important'));
  });

  test('removes code blocks and replaces with spoken placeholder', () => {
    const input  = 'Here is how:\n```python\nimport pandas as pd\ndf = pd.read_csv("data.csv")\n```\nThat is it.';
    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('```'), false);
    assert.strictEqual(output.includes('import pandas'), false);
    assert.ok(output.includes('screen') || output.includes('code'));
    assert.ok(output.includes('That is it'));
  });

  test('removes inline code backtick markers but keeps text', () => {
    const input  = 'Use the `kubectl` command to manage pods';
    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('`'), false);
    assert.ok(output.includes('kubectl'));
  });

  test('removes delivery stage directions in parentheses', () => {
    const cases = [
      { input: 'Hello everyone (pause for effect)', absent: 'pause for effect' },
      { input: 'This is important (speaking clearly)', absent: 'speaking clearly' },
      { input: 'Welcome back (smile warmly)',        absent: 'smile warmly' },
    ];
    cases.forEach(({ input, absent }) => {
      const output = cleanChapterScript(input);
      assert.strictEqual(output.includes(absent), false, `Should remove: "${absent}"`);
    });
  });

  test('removes bracketed stage directions inline', () => {
    const input  = 'Hello [PAUSE] everyone [TRANSITION] let us begin';
    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('[PAUSE]'), false);
    assert.strictEqual(output.includes('[TRANSITION]'), false);
    assert.ok(output.includes('Hello'));
    assert.ok(output.includes('let us begin'));
  });

  test('removes horizontal rules', () => {
    const input  = 'Section 1\n---\nContent\n===\nMore content';
    const output = cleanChapterScript(input);
    assert.strictEqual(output.includes('---'), false);
    assert.strictEqual(output.includes('==='), false);
    assert.ok(output.includes('Content'));
  });

  test('removes standalone END OF CHAPTER markers', () => {
    const cases = [
      '[END OF CHAPTER 1]',
      '[Chapter 1 End]',
    ];
    cases.forEach(marker => {
      const output = cleanChapterScript(marker);
      assert.strictEqual(output.trim(), '', `Should be empty for: "${marker}"`);
    });
  });

  test('preserves normal spoken sentences intact', () => {
    const sentences = [
      'Welcome to Chapter 1 of our Kubernetes course.',
      'Today we are going to learn something really exciting.',
      'By the end of this chapter you will understand containers.',
      'Let me show you how this works in practice.',
      'If you found this helpful please subscribe!',
    ];
    sentences.forEach(sentence => {
      const output = cleanChapterScript(sentence);
      assert.strictEqual(output.trim(), sentence.trim(), `Should preserve: "${sentence}"`);
    });
  });

  test('collapses multiple blank lines to max 2', () => {
    const input      = 'Line 1\n\n\n\n\nLine 2\n\n\n\nLine 3';
    const output     = cleanChapterScript(input);
    const tripleBlank = output.match(/\n{3,}/);
    assert.strictEqual(tripleBlank, null, 'Should have no 3+ consecutive newlines');
  });

  test('handles empty and null input gracefully', () => {
    assert.strictEqual(cleanChapterScript(''),    '');
    assert.strictEqual(cleanChapterScript(null),  '');
    assert.strictEqual(cleanChapterScript(undefined), '');
  });

  test('full script cleaning end-to-end', () => {
    const input = [
      '# Kubernetes Deep Dive: Chapter 1',
      '## Video Script - Complete Spoken Text',
      '---',
      '**CHAPTER INTRO**',
      '',
      'Welcome to Kubernetes Deep Dive! I am so glad you are here.',
      '',
      '**THE CONTAINER PROBLEM**',
      '',
      'Before containers, we had **massive** problems with deployment.',
      '',
      '```bash',
      'docker run -d nginx',
      '```',
      '',
      'As you can see on screen, this is very simple.',
      '',
      '*Word count: approximately 1,500 words*',
      '[END OF CHAPTER 1]',
    ].join('\n');

    const output = cleanChapterScript(input);

    assert.strictEqual(output.includes('# Kubernetes'),     false);
    assert.strictEqual(output.includes('## Video Script'),  false);
    assert.strictEqual(output.includes('**CHAPTER INTRO**'), false);
    assert.strictEqual(output.includes('**THE CONTAINER'),  false);
    assert.strictEqual(output.includes('```'),              false);
    assert.strictEqual(output.includes('docker run'),       false);
    assert.strictEqual(output.includes('Word count'),       false);
    assert.strictEqual(output.includes('[END OF CHAPTER'),  false);
    assert.strictEqual(output.includes('---'),              false);

    assert.ok(output.includes('Welcome to Kubernetes Deep Dive'));
    assert.ok(output.includes('massive'));
    assert.ok(output.includes('As you can see on screen'));
  });

  test('processes the sample fixture without throwing', () => {
    const raw = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'sample-chapter-script.txt'), 'utf8'
    );
    let output;
    assert.doesNotThrow(() => { output = cleanChapterScript(raw); });
    assert.strictEqual(output.includes('# Python'), false, 'Headers removed');
    assert.strictEqual(output.includes('```'),      false, 'Code blocks removed');
    assert.ok(output.includes('Welcome to Chapter 4'), 'Normal content kept');
    assert.ok(output.includes('See you in Chapter 5'), 'CTA ending kept');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 2 — Curriculum Generation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Curriculum validation and parsing', () => {

  test('validates correct curriculum JSON structure', () => {
    const curriculum = {
      course_title: 'Kubernetes for Beginners',
      course_subtitle: 'From zero to production',
      difficulty: 'Beginner',
      estimated_hours: 8,
      prerequisites: ['Basic Linux'],
      skills_learned: ['Containers', 'Pods'],
      chapters: [
        {
          number: 1,
          title: 'Introduction to Containers',
          subtitle: 'Why containers exist',
          duration_mins: 20,
          concepts: ['Docker', 'Images'],
          hands_on: 'Run first container',
          real_world_example: 'Netflix uses containers',
          quiz_questions: [{ question: 'What?', options: ['A', 'B', 'C', 'D'], correct: 0 }],
          key_takeaway: 'Containers solve deployment problems',
        },
      ],
    };

    assert.ok(isValidCurriculum(curriculum));
    assert.strictEqual(curriculum.chapters.length, 1);
    assert.ok(Array.isArray(curriculum.chapters[0].concepts));
    assert.ok(Array.isArray(curriculum.chapters[0].quiz_questions));
  });

  test('rejects curriculum missing chapters', () => {
    assert.strictEqual(isValidCurriculum({ course_title: 'Test' }), false);
  });

  test('rejects curriculum missing course_title', () => {
    assert.strictEqual(isValidCurriculum({ chapters: [{ number: 1, title: 'Ch1' }] }), false);
  });

  test('rejects null/undefined curriculum', () => {
    assert.strictEqual(isValidCurriculum(null), false);
    assert.strictEqual(isValidCurriculum(undefined), false);
    assert.strictEqual(isValidCurriculum('string'), false);
  });

  test('validates chapter count within 1-15 bounds', () => {
    const makeC = (n) => ({
      course_title: 'Test',
      chapters: Array.from({ length: n }, (_, i) => ({ number: i + 1, title: `Ch${i+1}` })),
    });

    assert.strictEqual(isValidCurriculum(makeC(0)),  false, '0 chapters invalid');
    assert.strictEqual(isValidCurriculum(makeC(4)),  true,  '4 chapters valid');
    assert.strictEqual(isValidCurriculum(makeC(10)), true,  '10 chapters valid');
    assert.strictEqual(isValidCurriculum(makeC(15)), true,  '15 chapters valid');
    assert.strictEqual(isValidCurriculum(makeC(16)), false, '16 chapters invalid');
  });

  test('parses curriculum from Claude API response', () => {
    const sampleCurriculum = require('./fixtures/sample-curriculum.json');
    const mockResponse     = anthropicMock.createCurriculumResponse(sampleCurriculum);
    const parsed           = parseCurriculumResponse(mockResponse);

    assert.ok(isValidCurriculum(parsed));
    assert.strictEqual(parsed.chapters.length, 9);
    assert.strictEqual(parsed.course_title, 'Python for Data Science');
  });

  test('handles curriculum response wrapped in markdown code fence', () => {
    const curriculum = {
      course_title: 'Fenced Test',
      chapters: [{ number: 1, title: 'Ch1', subtitle: '' }],
    };
    const mockResponse = {
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(curriculum) + '\n```' }],
      stop_reason: 'end_turn',
    };
    const parsed = parseCurriculumResponse(mockResponse);
    assert.ok(isValidCurriculum(parsed));
    assert.strictEqual(parsed.course_title, 'Fenced Test');
  });

  test('throws when no text blocks in API response', () => {
    const mockResponse = { content: [{ type: 'tool_use', name: 'web_search' }] };
    assert.throws(
      () => parseCurriculumResponse(mockResponse),
      /no text/i,
    );
  });

  test('sample curriculum fixture is valid', () => {
    const curriculum = require('./fixtures/sample-curriculum.json');
    assert.ok(isValidCurriculum(curriculum));
    assert.strictEqual(curriculum.chapters.length, 9);
    curriculum.chapters.forEach((ch, i) => {
      assert.strictEqual(ch.number, i + 1,             `Chapter ${i+1} has correct number`);
      assert.ok(ch.title,                              `Chapter ${i+1} has title`);
      assert.ok(Array.isArray(ch.concepts),            `Chapter ${i+1} has concepts array`);
      assert.ok(Array.isArray(ch.quiz_questions),      `Chapter ${i+1} has quiz_questions array`);
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 3 — Chapter Script Generation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Chapter script generation helpers', () => {

  test('isScriptTruncated detects max_tokens', () => {
    assert.strictEqual(isScriptTruncated(anthropicMock.createScriptResponse('partial', true)),  true);
    assert.strictEqual(isScriptTruncated(anthropicMock.createScriptResponse('complete', false)), false);
  });

  test('hasProperEnding detects subscribe CTA', () => {
    assert.strictEqual(hasProperEnding('smash that subscribe button!'), true);
  });

  test('hasProperEnding detects next chapter reference', () => {
    assert.strictEqual(hasProperEnding('In the next chapter we cover deployments.'), true);
  });

  test('hasProperEnding detects see you sign-off', () => {
    assert.strictEqual(hasProperEnding('Great work today! See you in the next chapter!'), true);
  });

  test('hasProperEnding returns false for missing CTA', () => {
    assert.strictEqual(hasProperEnding('And that covers the basics of containers.'), false);
  });

  test('countWords is accurate', () => {
    assert.strictEqual(countWords('This is a test script with exactly ten words here'), 10);
    assert.strictEqual(countWords(''), 0);
    assert.strictEqual(countWords('   '), 0);
    assert.strictEqual(countWords('one'), 1);
  });

  test('estimateDuration calculates at 150 wpm', () => {
    const script = 'word '.repeat(1500);
    assert.strictEqual(estimateDuration(script), 10); // 1500 / 150 = 10 mins
  });

  test('estimateDuration rounds correctly', () => {
    const script = 'word '.repeat(300);
    assert.strictEqual(estimateDuration(script), 2); // 300 / 150 = 2 mins
  });

  test('isWithinWordLimit returns false for over-limit scripts', () => {
    assert.strictEqual(isWithinWordLimit('word '.repeat(5000)), false);
  });

  test('isWithinWordLimit returns true for normal chapter scripts', () => {
    assert.strictEqual(isWithinWordLimit('word '.repeat(3000)), true);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 4 — Render Input Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildRenderInput()', () => {

  const testCurriculum = {
    course_title: 'Kubernetes Deep Dive',
    course_id:    12345,
    chapters: [{
      number:       1,
      title:        'Introduction',
      subtitle:     'Getting started',
      duration_mins: 20,
      concepts:     ['containers', 'pods'],
      key_takeaway: 'Containers solve problems',
      quiz_questions: [],
    }],
  };

  test('builds valid render input for chapter 1', () => {
    const renderInput = buildRenderInput(1, testCurriculum, 'Chapter 1 script content.');

    assert.strictEqual(renderInput.chapter_number,    1);
    assert.strictEqual(renderInput.chapter_title,     'Introduction');
    assert.strictEqual(renderInput.script,            'Chapter 1 script content.');
    assert.strictEqual(renderInput.heygen_local_file, 'heygen-chapter-01.mp4');
    assert.strictEqual(renderInput.output_filename,   'chapter-01-final.mp4');
  });

  test('includes all required fields', () => {
    const required = [
      'course_title', 'course_id', 'chapter_number',
      'chapter_title', 'chapter_subtitle', 'total_chapters',
      'script', 'duration_mins', 'concepts', 'key_takeaway',
      'quiz_questions', 'heygen_local_file', 'output_filename',
    ];
    const renderInput = buildRenderInput(1, testCurriculum, 'script');
    required.forEach(field => {
      assert.ok(field in renderInput, `Missing required field: ${field}`);
    });
  });

  test('padChapterNum pads single digits', () => {
    assert.strictEqual(padChapterNum(1),  '01');
    assert.strictEqual(padChapterNum(5),  '05');
    assert.strictEqual(padChapterNum(9),  '09');
    assert.strictEqual(padChapterNum(10), '10');
  });

  test('total_chapters reflects curriculum size', () => {
    const renderInput = buildRenderInput(1, testCurriculum, '');
    assert.strictEqual(renderInput.total_chapters, 1);
  });

  test('throws for chapter number not in curriculum', () => {
    assert.throws(
      () => buildRenderInput(99, testCurriculum, 'script'),
      /Chapter 99 not found/,
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 5 — Slide Type Validation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Slide validation', () => {

  test('isValidSlideType accepts all valid types', () => {
    const validTypes = [
      'chapter_title', 'concept', 'diagram',
      'analogy', 'code', 'live_code',
      'quiz', 'chapter_summary',
    ];
    validTypes.forEach(type => {
      assert.strictEqual(isValidSlideType(type), true, `Should be valid: ${type}`);
    });
  });

  test('isValidSlideType rejects unknown types', () => {
    assert.strictEqual(isValidSlideType('invalid_type'), false);
    assert.strictEqual(isValidSlideType(''),             false);
    assert.strictEqual(isValidSlideType('text'),         false);
  });

  test('isValidMermaidCode accepts valid flowchart', () => {
    assert.strictEqual(isValidMermaidCode('flowchart LR\n  A --> B'), true);
  });

  test('isValidMermaidCode accepts valid graph', () => {
    assert.strictEqual(isValidMermaidCode('graph TD\n  A[Start] --> B[End]'), true);
  });

  test('isValidMermaidCode accepts sequenceDiagram', () => {
    assert.strictEqual(isValidMermaidCode('sequenceDiagram\n  Alice->>Bob: Hello'), true);
  });

  test('isValidMermaidCode rejects plain text', () => {
    assert.strictEqual(isValidMermaidCode('See diagram in accompanying material'), false);
    assert.strictEqual(isValidMermaidCode('Refer to figure 1'),                    false);
    assert.strictEqual(isValidMermaidCode(''),                                      false);
    assert.strictEqual(isValidMermaidCode(null),                                    false);
  });

  test('isValidMermaidCode rejects strings shorter than 10 chars', () => {
    assert.strictEqual(isValidMermaidCode('graph TD'), false);
  });

  test('containsPlaceholder detects diagram placeholder text', () => {
    const placeholders = [
      'See diagram in accompanying material',
      'Refer to accompanying diagram',
      'See figure 1',
      '[diagram here]',
      '[insert diagram]',
      'As shown in the diagram below',
    ];
    placeholders.forEach(text => {
      assert.strictEqual(containsPlaceholder(text), true, `Should detect: "${text}"`);
    });
  });

  test('containsPlaceholder does not flag normal content', () => {
    const normal = [
      'Kubernetes uses a control plane to manage workloads',
      'Containers share the host operating system kernel',
      'Let me show you how this works in practice',
    ];
    normal.forEach(text => {
      assert.strictEqual(containsPlaceholder(text), false, `Should not flag: "${text}"`);
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 6 — localStorage / Course Data Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Course data storage', () => {

  test('saves and retrieves curriculum', () => {
    const storage    = createMockStorage();
    const curriculum = { course_title: 'Test Course', course_id: 99999, chapters: [{ number: 1, title: 'Ch1' }] };

    saveCurriculum(curriculum, storage);
    const retrieved = getCurriculum(storage);

    assert.strictEqual(retrieved.course_title, 'Test Course');
    assert.strictEqual(retrieved.course_id, 99999);
  });

  test('getCurriculum returns null for empty storage', () => {
    assert.strictEqual(getCurriculum(createMockStorage()), null);
  });

  test('saves and retrieves chapter script', () => {
    const storage    = createMockStorage();
    const courseId   = 12345;
    const chapterNum = 3;
    const script     = 'Chapter 3 script content here.';

    saveChapterScript(courseId, chapterNum, script, storage);
    const retrieved = getChapterScript(courseId, chapterNum, storage);

    assert.strictEqual(retrieved, script);
  });

  test('getChapterScript returns null for missing entry', () => {
    assert.strictEqual(getChapterScript(99999, 5, createMockStorage()), null);
  });

  test('isChapterGenerated tracks generation status', () => {
    const storage  = createMockStorage();
    const courseId = 12345;

    assert.strictEqual(isChapterGenerated(courseId, 1, storage), false, 'Initially not generated');

    saveChapterScript(courseId, 1, 'script content', storage);
    assert.strictEqual(isChapterGenerated(courseId, 1, storage), true, 'Generated after save');
  });

  test('countGeneratedChapters counts correctly', () => {
    const storage  = createMockStorage();
    const courseId = 12345;

    saveChapterScript(courseId, 1, 'script 1', storage);
    saveChapterScript(courseId, 2, 'script 2', storage);
    saveChapterScript(courseId, 3, 'script 3', storage);

    assert.strictEqual(countGeneratedChapters(courseId, 9, storage), 3);
  });

  test('countGeneratedChapters returns 0 for empty storage', () => {
    assert.strictEqual(countGeneratedChapters(12345, 9, createMockStorage()), 0);
  });

  test('different course IDs are stored independently', () => {
    const storage = createMockStorage();
    saveChapterScript(111, 1, 'course A script', storage);
    saveChapterScript(222, 1, 'course B script', storage);

    assert.strictEqual(getChapterScript(111, 1, storage), 'course A script');
    assert.strictEqual(getChapterScript(222, 1, storage), 'course B script');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 7 — Chapter Directory Structure Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Chapter file and directory paths', () => {

  test('getChapterDir includes chapter-01 for chapter 1', () => {
    assert.ok(getChapterDir(1).includes('chapter-01'));
  });

  test('getChapterDir includes chapter-09 for chapter 9', () => {
    assert.ok(getChapterDir(9).includes('chapter-09'));
  });

  test('getFinalVideoFilename is correct', () => {
    assert.strictEqual(getFinalVideoFilename(1), 'chapter-01-final.mp4');
    assert.strictEqual(getFinalVideoFilename(9), 'chapter-09-final.mp4');
  });

  test('getHeygenFilename is correct', () => {
    assert.strictEqual(getHeygenFilename(3), 'heygen-chapter-03.mp4');
    assert.strictEqual(getHeygenFilename(1), 'heygen-chapter-01.mp4');
  });

  test('getSlidesDir contains chapter and slides', () => {
    const dir = getSlidesDir(2);
    assert.ok(dir.includes('chapter-02'), 'Slides dir includes chapter-02');
    assert.ok(dir.includes('slides'),     'Slides dir includes "slides"');
  });

  test('padChapterNum is consistent across helpers', () => {
    [1, 2, 5, 9].forEach(n => {
      const pad      = padChapterNum(n);
      const chDir    = getChapterDir(n);
      const finalVid = getFinalVideoFilename(n);
      const heygenVid = getHeygenFilename(n);
      assert.ok(chDir.includes(`chapter-${pad}`),    `chapterDir uses pad ${pad}`);
      assert.ok(finalVid.includes(`chapter-${pad}`), `finalVideo uses pad ${pad}`);
      assert.ok(heygenVid.includes(`chapter-${pad}`), `heygenFile uses pad ${pad}`);
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY 8 — Integration Tests (mocked API)
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration tests (mocked API)', () => {

  test('full curriculum generation flow', async () => {
    const sampleCurriculum = require('./fixtures/sample-curriculum.json');

    global.fetch = async () => ({
      ok:   true,
      json: async () => ({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(sampleCurriculum) }],
        usage: { input_tokens: 1000, output_tokens: 2000 },
      }),
    });

    const result = await generateCurriculum(
      'Python for Data Science', 'beginners', 9, 'sk-ant-mock'
    );

    assert.ok(isValidCurriculum(result));
    assert.strictEqual(result.chapters.length, 9);
  });

  test('generateCurriculum throws on non-OK response', async () => {
    global.fetch = async () => ({ ok: false, statusText: 'Unauthorized', json: async () => ({}) });
    await assert.rejects(() => generateCurriculum('Test', 'beginners', 9, 'bad-key'), /API error/i);
  });

  test('chapter script generation retries on max_tokens', async () => {
    let callCount = 0;

    global.fetch = async () => {
      callCount++;
      return {
        ok:   true,
        json: async () =>
          callCount < 2
            ? anthropicMock.createScriptResponse('Partial chapter script without ending...', true)
            : anthropicMock.createScriptResponse('Continuation... See you in the next chapter!', false),
      };
    };

    const script = await generateChapterScript(
      { number: 1, title: 'Test Chapter', duration_mins: 20 },
      { course_title: 'Test Course' },
      'sk-ant-mock'
    );

    assert.strictEqual(callCount, 2, 'Should call API twice (truncated + continuation)');
    assert.ok(script.includes('See you in the next chapter'));
  });

  test('generateAllScripts processes all chapters', async () => {
    const generated = [];

    global.fetch = async (_url, opts) => {
      const body         = JSON.parse(opts.body);
      const chapterMatch = body.messages[0].content.match(/Chapter (\d+)/);
      if (chapterMatch) generated.push(parseInt(chapterMatch[1]));

      return {
        ok:   true,
        json: async () => ({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Script for chapter. See you in the next one!' }],
          usage: { input_tokens: 200, output_tokens: 500 },
        }),
      };
    };

    const curriculum = {
      course_title: 'Test',
      course_id:    1,
      chapters: [1, 2, 3].map(n => ({
        number: n, title: `Chapter ${n}`, subtitle: '',
        duration_mins: 20, concepts: [], hands_on: '',
        real_world_example: '', quiz_questions: [], key_takeaway: '',
      })),
    };

    const results = await generateAllScripts(curriculum, 'sk-ant-mock');
    assert.strictEqual(results.length,   3,   'Should return 3 results');
    assert.strictEqual(generated.length, 3,   'Should have called API 3 times');
  });

  test('parseCurriculumResponse handles web search mixed content', () => {
    const curriculum = { course_title: 'Mixed', chapters: [{ number: 1, title: 'Ch1' }] };
    const response   = {
      content: [
        { type: 'tool_use',    name: 'web_search', input: {} },
        { type: 'tool_result', content: 'results' },
        { type: 'text',        text: JSON.stringify(curriculum) },
      ],
    };
    const parsed = parseCurriculumResponse(response);
    assert.strictEqual(parsed.course_title, 'Mixed');
  });

});
