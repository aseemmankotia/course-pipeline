// scripts/udemy/practice-tests.js
// Create practice tests and load questions from the repo's practice-test CSVs,
// entirely via the Udemy instructor API. Validated end-to-end 2026-08-20.
//
// Confirmed API shapes (do not "simplify" without re-checking):
//   Create quiz:  POST /api-2.0/courses/{cid}/quizzes/
//                 { title, type:'practice-test', description, duration, pass_percent }
//                 -> NOTE: freshly created quizzes come back is_published:true, which
//                    BLOCKS adding questions ("You can only create assessments for
//                    drafts of practice tests"). You MUST PATCH is_published:false
//                    before inserting assessments.
//   Add question: POST /api-2.0/quizzes/{qid}/assessments/
//                 { assessment_type:'multiple-choice'|'multiple-select',
//                   question_plain, correct_response:['a'|'b'|...],  // LETTER(s)
//                   prompt:{ question:'<p>..</p>', answers:['<p>..</p>',...],
//                            feedbacks:['<p>..</p>',...], relatedLectureIds:[], links:[] } }
//   Publish:      PATCH /api-2.0/courses/{cid}/quizzes/{qid}/ { is_published:true }
//   List:         GET  /api-2.0/courses/{cid}/quizzes/?fields[quiz]=title,type,num_assessments,is_published

'use strict';
const fs = require('fs');

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (t) => (t ? `<p>${esc(t)}</p>` : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Turn a Udemy practice-test CSV into assessment payloads.
function csvToAssessments(csvPath) {
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8')).filter((r) => r.length > 1);
  const header = rows.shift().map((h) => h.trim());
  const idx = (name) => header.indexOf(name);
  const out = [];
  for (const r of rows) {
    const get = (name) => (idx(name) >= 0 ? (r[idx(name)] || '').trim() : '');
    const q = get('Question');
    if (!q) continue;
    const opts = [], expl = [];
    for (let n = 1; n <= 6; n++) {
      const o = get(`Answer Option ${n}`);
      if (o) { opts.push(o); expl.push(get(`Explanation ${n}`)); }
    }
    const corr = get('Correct Answers').split(',').map((s) => s.trim()).filter(Boolean);
    const cr = corr.filter((c) => /^\d+$/.test(c) && +c >= 1 && +c <= opts.length).map((c) => LETTERS[+c - 1]);
    if (!cr.length) continue;
    out.push({
      assessment_type: cr.length === 1 ? 'multiple-choice' : 'multiple-select',
      question_plain: q.slice(0, 1000),
      prompt: {
        question: wrap(q),
        answers: opts.map(wrap),
        feedbacks: expl.map(wrap),
        relatedLectureIds: [], links: [],
      },
      correct_response: cr,
    });
  }
  return out;
}

// Load a single practice test (idempotent).
async function loadOneTest(client, { cid, title, duration, passPercent, questions, log = console.log }) {
  const list = await client.get(`/api-2.0/courses/${cid}/quizzes/`, {
    query: { page_size: 100, 'fields[quiz]': 'title,type,num_assessments' },
  });
  const existing = (list.results || []).find((q) => q.type === 'practice-test' && q.title === title);
  if (existing && existing.num_assessments >= questions.length) {
    log(`  SKIP (complete): ${title} (${existing.num_assessments} Q)`);
    await client.patch(`/api-2.0/courses/${cid}/quizzes/${existing.id}/`, { is_published: true }).catch(() => {});
    return { title, created: false, inserted: existing.num_assessments, failed: 0, quizId: existing.id };
  }
  if (existing) {
    log(`  deleting incomplete: ${title} (${existing.num_assessments} Q)`);
    await client.del(`/api-2.0/courses/${cid}/quizzes/${existing.id}/`); await sleep(400);
  }
  const quiz = await client.post(`/api-2.0/courses/${cid}/quizzes/`, {
    title, type: 'practice-test', description: title, duration, pass_percent: passPercent,
  });
  if (client.dryRun) { log(`  [dry-run] would create ${title} + ${questions.length} questions`); return { title, created: true, inserted: 0, failed: 0, dryRun: true }; }
  // CRITICAL: make the quiz editable before adding questions.
  await client.patch(`/api-2.0/courses/${cid}/quizzes/${quiz.id}/`, { is_published: false }); await sleep(200);
  let ok = 0, fail = 0;
  for (let i = 0; i < questions.length; i++) {
    let done = false;
    for (let a = 0; a < 4 && !done; a++) {
      try { await client.post(`/api-2.0/quizzes/${quiz.id}/assessments/`, questions[i]); ok++; done = true; }
      catch (e) { if (a === 3) { fail++; log(`   Q${i + 1} failed: ${String(e).slice(0, 120)}`); } await sleep(600); }
    }
    await sleep(110);
  }
  await client.patch(`/api-2.0/courses/${cid}/quizzes/${quiz.id}/`, { is_published: true });
  log(`  -> ${title}: inserted ${ok}, failed ${fail} (published)`);
  return { title, created: true, inserted: ok, failed: fail, quizId: quiz.id };
}

// Load all practice tests for a course from an array of {csv, duration, passPercent, title}.
async function loadPracticeTests(client, cid, tests, log = console.log) {
  const results = [];
  for (const t of tests) {
    const questions = t.questions || csvToAssessments(t.csv);
    results.push(await loadOneTest(client, {
      cid, title: t.title, duration: t.duration || 90, passPercent: t.passPercent || 70, questions, log,
    }));
  }
  return results;
}

// Course-level loader with the hard-won robustness (validated 2026-08-20):
//  - Udemy caps a regular course at **2 practice tests**.
//  - DELETE is eventually-consistent: the quizzes count lags ~1s after a 204, so an
//    immediate create can still see 2 and 400 with "maximum of 2 practice tests".
// This: keeps any already-complete target, deletes the rest, WAITS for the count to
// actually drop, then creates the missing ones (re-checking the cap before each).
async function loadCourseTests(client, cid, tests, log = console.log) {
  const listPT = async () => {
    const r = await client.get(`/api-2.0/courses/${cid}/quizzes/`, {
      query: { page_size: 100, 'fields[quiz]': 'title,type,num_assessments' },
    });
    return (r.results || []).filter((q) => q.type === 'practice-test');
  };
  const resolved = tests.map((t) => ({ ...t, questions: t.questions || csvToAssessments(t.csv) }));
  let pts = await listPT();
  const keep = new Set();
  for (const t of resolved) {
    const done = pts.find((q) => q.title === t.title && q.num_assessments >= t.questions.length);
    if (done) {
      keep.add(done.id);
      await client.patch(`/api-2.0/courses/${cid}/quizzes/${done.id}/`, { is_published: true }).catch(() => {});
      log(`  keep complete: ${t.title} (${done.num_assessments} Q)`);
    }
  }
  for (const q of pts) {
    if (!keep.has(q.id)) { log(`  deleting: ${q.title} (${q.num_assessments} Q)`); await client.del(`/api-2.0/courses/${cid}/quizzes/${q.id}/`); await sleep(1200); }
  }
  for (let i = 0; i < 10; i++) { pts = await listPT(); if (pts.length <= keep.size) break; await sleep(1500); } // wait for consistency
  const results = [];
  for (const t of resolved) {
    if ((await listPT()).find((q) => q.title === t.title && q.num_assessments >= t.questions.length)) { results.push({ title: t.title, skipped: true }); continue; }
    for (let i = 0; i < 10 && (await listPT()).length >= 2; i++) await sleep(1500); // respect the 2-test cap
    results.push(await loadOneTest(client, { cid, title: t.title, duration: t.duration || 90, passPercent: t.passPercent || 70, questions: t.questions, log }));
  }
  return results;
}

module.exports = { loadPracticeTests, loadCourseTests, loadOneTest, csvToAssessments, parseCSV };
