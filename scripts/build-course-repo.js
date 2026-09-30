#!/usr/bin/env node
/**
 * build-course-repo.js — generate the GitHub "course materials" repo tree for a course,
 * purely from exports/<slug>/course-data-export.json (no API calls).
 *
 * Output: exports/<slug>/repo/  (README + cheat-sheets/ flashcards/ practice-questions/
 *         practice-tests/ labs/) — ready to push to github.com/<user>/course-<...>.
 *
 * Usage: node scripts/build-course-repo.js --slug=<slug> [--out=exports/<slug>/repo]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const slug = args.slug;
if (!slug) { console.error('Usage: node scripts/build-course-repo.js --slug=<slug> [--out=dir]'); process.exit(1); }

const exportPath = path.join(ROOT, 'exports', slug, 'course-data-export.json');
if (!fs.existsSync(exportPath)) { console.error(`No course-data-export.json for ${slug}`); process.exit(1); }
const d = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const OUT = path.resolve(ROOT, args.out || path.join('exports', slug, 'repo'));

const cell = s => String(s == null ? '' : s).replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|').trim();
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const write = (rel, txt) => { const f = path.join(OUT, rel); mkdir(path.dirname(f)); fs.writeFileSync(f, txt); };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const title = d.course_title || slug;
const chapters = d.chapters || [];
const nCh = chapters.length;
const materials = d.materials || {};
const tests = d.practice_tests || [];
const examCode = (title.match(/\(([^)]+)\)/) || [])[1] || d.topic || '';

// ---------- README ----------
function readme() {
  const rows = [];
  if (Object.keys(materials).some(k => /_questions$/.test(k))) rows.push(`| Practice Questions | All ${nCh} | Multiple choice, T/F & scenario, with explained answers |`);
  if (Object.keys(materials).some(k => /_flashcards$/.test(k))) rows.push(`| Flashcards | All ${nCh} | Front/back cards, table format |`);
  if (Object.keys(materials).some(k => /_cheatsheet$/.test(k))) rows.push(`| Cheat Sheets | All ${nCh} | Quick reference per chapter |`);
  if (chapters.some(c => c.hands_on)) rows.push(`| Labs / Hands-on | selected | Practical exercises drawn from each chapter |`);
  if (tests.length) rows.push(`| Practice Tests | ${tests.length} full exams | ${tests[0].total_questions || ''} questions each, with answer keys |`);
  const vids = chapters.map(c => `- Chapter ${c.number}: ${c.title}`).join('\n');
  return `# ${title} — Course Materials

> Free supplementary study materials for the **${title}** course by TechNuggets Academy.

## 📚 What's Included

| Material | Chapters | Description |
|----------|----------|-------------|
${rows.join('\n')}

## 🎯 How to Use

- **Practice Questions** — open any \`practice-questions/chapter-XX-questions.md\` and answer before expanding the **Answer** block.
- **Flashcards** — study the front/back tables directly, or copy into your spaced-repetition tool of choice.
- **Cheat Sheets** — last-minute quick reference per chapter.
- **Practice Tests** — full-length timed exams in \`practice-tests/\` with separate answer keys and a score tracker.

## 📺 Course Chapters

${vids}

## 🏆 Certification Prep

These materials are designed to help you prepare for the **${examCode}** exam. Exam mechanics change — always confirm the current outline, format, and fees on the official certification page before registering.

## ⭐ Support

- ⭐ Star this repository
- 🔔 Subscribe to **TechNuggets Academy** on YouTube
- 🎓 Full video course + practice tests on Udemy

---
*Generated with the [TechNuggets Academy course pipeline](https://github.com/aseemmankotia/course-pipeline). Study materials were produced with AI assistance and reviewed for accuracy.*
`;
}

// ---------- cheat sheets ----------
function cheatsheets() {
  chapters.forEach(c => {
    const cs = materials[`ch${c.number}_cheatsheet`];
    if (!cs) return;
    const body = typeof cs === 'string' ? cs : String(cs);
    write(`cheat-sheets/chapter-${String(c.number).padStart(2, '0')}-cheatsheet.md`, body.trimEnd() + '\n');
  });
}

// ---------- flashcards ----------
function flashcards() {
  chapters.forEach(c => {
    const fc = materials[`ch${c.number}_flashcards`];
    if (!Array.isArray(fc) || !fc.length) return;
    let out = `## Chapter ${c.number}: ${c.title} — Flashcards\n\n| # | Front (Question) | Back (Answer) |\n|---|-----------------|---------------|\n`;
    fc.forEach((card, i) => { out += `| ${i + 1} | ${cell(card.front)} | ${cell(card.back)} |\n`; });
    write(`flashcards/chapter-${String(c.number).padStart(2, '0')}-flashcards.md`, out);
  });
}

// ---------- practice questions ----------
function renderQ(q, n) {
  let out = `**Q${n}.** ${q.question}\n\n`;
  (q.options || []).forEach((o, i) => { out += `${LETTERS[i]}) ${o}\n`; });
  out += `\n<details>\n<summary>Answer</summary>\n\n`;
  if (typeof q.correct_index === 'number') out += `**Correct: ${LETTERS[q.correct_index]}**\n\n`;
  if (q.why_correct) out += `${q.why_correct}\n\n`;
  if (Array.isArray(q.why_others_wrong) && q.why_others_wrong.length) {
    out += `**Why the others are wrong:**\n`;
    q.why_others_wrong.forEach(w => { out += `- ${w}\n`; });
    out += `\n`;
  }
  if (q.commonly_missed) {
    const cm = typeof q.commonly_missed === 'string' ? q.commonly_missed : 'Frequently missed on the exam — read the options carefully.';
    out += `> ⚠️ ${cm}\n\n`;
  }
  out += `</details>\n\n---\n\n`;
  return out;
}
function practiceQuestions() {
  chapters.forEach(c => {
    const qs = materials[`ch${c.number}_questions`];
    if (!Array.isArray(qs) || !qs.length) return;
    let out = `## Chapter ${c.number}: ${c.title} — Practice Questions\n\n`;
    qs.forEach((q, i) => { out += renderQ(q, i + 1); });
    write(`practice-questions/chapter-${String(c.number).padStart(2, '0')}-questions.md`, out);
  });
}

// ---------- practice tests + answer keys + score tracker ----------
function practiceTests() {
  tests.forEach(t => {
    const n = t.test_number || (tests.indexOf(t) + 1);
    let test = `# Practice Test ${n}: ${t.cert_name || examCode}\n\n`;
    test += `- **Questions:** ${t.total_questions || (t.questions || []).length}\n- **Time limit:** ${t.time_limit_minutes || 90} minutes\n- **Passing score:** ${t.passing_percentage || t.passing_score || 70}%\n\n> Answers are in \`answer-key-${n}.md\`. Track results in \`score-tracker.md\`.\n\n---\n\n`;
    let key = `# Answer Key — Practice Test ${n}\n\n`;
    (t.questions || []).forEach((q, i) => {
      test += `**Q${i + 1}.** ${q.question}\n\n`;
      (q.options || []).forEach((o, j) => { test += `${LETTERS[j]}) ${o}\n`; });
      test += `\n---\n\n`;
      key += `**Q${i + 1}. Correct: ${typeof q.correct_index === 'number' ? LETTERS[q.correct_index] : '?'}**\n\n`;
      if (q.why_correct) key += `${q.why_correct}\n\n`;
      key += `---\n\n`;
    });
    write(`practice-tests/practice-test-${n}.md`, test);
    write(`practice-tests/answer-key-${n}.md`, key);
  });
  if (tests.length) {
    let tr = `# Score Tracker\n\n| Attempt | Date | Test | Score | % | Pass? | Weak areas |\n|---------|------|------|-------|---|-------|-----------|\n`;
    for (let i = 0; i < 6; i++) tr += `| ${i + 1} | | | | | | |\n`;
    write('practice-tests/score-tracker.md', tr);
  }
}

// ---------- labs ----------
function labs() {
  chapters.forEach(c => {
    if (!c.hands_on) return;
    let out = `# Chapter ${c.number} Lab: ${c.title}\n\n`;
    if (c.lab_duration_mins) out += `**Estimated time:** ${c.lab_duration_mins} minutes\n\n`;
    out += `## Exercise\n\n${c.hands_on}\n\n`;
    if (c.key_takeaway) out += `## Key takeaway\n\n${c.key_takeaway}\n`;
    write(`labs/chapter-${String(c.number).padStart(2, '0')}-lab.md`, out);
  });
}

// build
mkdir(OUT);
write('README.md', readme());
cheatsheets(); flashcards(); practiceQuestions(); practiceTests(); labs();

// summary
function count(dir) { const p = path.join(OUT, dir); return fs.existsSync(p) ? fs.readdirSync(p).length : 0; }
console.log(`✓ ${slug} → ${path.relative(ROOT, OUT)}`);
console.log(`  README.md, cheat-sheets(${count('cheat-sheets')}), flashcards(${count('flashcards')}), practice-questions(${count('practice-questions')}), practice-tests(${count('practice-tests')}), labs(${count('labs')})`);
