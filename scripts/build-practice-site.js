#!/usr/bin/env node
/**
 * build-practice-site.js — generate a static free-practice-test site from the
 * question banks in generated/<slug>/state.json.
 *
 * The site is the top of the marketing funnel: 12 free questions per cert with
 * real explanations, then a link to the full Udemy course. Sales through the
 * referral links carry a 97% instructor share vs 37% organic, so every student
 * this site converts is worth ~2.6x an organic one.
 *
 * Output: site/ (index.html + one page per cert). Pure static HTML/JS/CSS,
 * no dependencies, deployable on GitHub Pages as-is.
 *
 * Usage: node scripts/build-practice-site.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site');

// slug -> { file, name, tagline, udemy (referral if live, plain if in review), badge }
const COURSES = [
  { slug: 'aws-certified-ai-practitioner-aif-c01', name: 'AWS Certified AI Practitioner (AIF-C01)',
    tagline: 'Foundational AWS AI/ML and generative AI', page: 'aws-aif-c01',
    udemy: 'https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?referralCode=003B046A1F6935BDE16F', live: true },
  { slug: 'iapp-aigp-ai-governance', name: 'IAPP AI Governance Professional (AIGP)',
    tagline: 'EU AI Act, NIST AI RMF, ISO/IEC 42001', page: 'iapp-aigp',
    udemy: 'https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?referralCode=0B6A80F71D9FCB827C55', live: true },
  { slug: 'aws-genai-developer-aip-c01', name: 'AWS Certified GenAI Developer (AIP-C01)',
    tagline: 'Bedrock, RAG and production GenAI on AWS', page: 'aws-aip-c01',
    udemy: 'https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?referralCode=25D9BA793B6B69835FCB', live: true },
  { slug: 'comptia-secai-plus-cy0-001', name: 'CompTIA SecAI+ (CY0-001)',
    tagline: 'AI security: MITRE ATLAS, OWASP LLM Top 10', page: 'comptia-secai',
    udemy: 'https://www.udemy.com/course/comptia-secai-cy0-001-certification/', live: false },
  { slug: 'aws-security-specialty-scs-c03', name: 'AWS Certified Security – Specialty (SCS-C03)',
    tagline: 'IAM, detection, data protection and AI guardrails', page: 'aws-scs-c03',
    udemy: 'https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/', live: false },
  { slug: 'isaca-aair-ai-risk', name: 'ISACA Advanced in AI Risk (AAIR)',
    tagline: 'Enterprise AI risk programs and governance', page: 'isaca-aair',
    udemy: 'https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/', live: false },
  { slug: 'databricks-genai-engineer-associate', name: 'Databricks Certified GenAI Engineer Associate',
    tagline: 'Vector Search, MLflow, Model Serving and RAG', page: 'databricks-genai',
    udemy: 'https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/', live: false },
  { slug: 'nvidia-nca-genl-generative-ai-llms', name: 'NVIDIA Generative AI & LLMs (NCA-GENL)',
    tagline: 'Transformers, prompt engineering and the NVIDIA stack', page: 'nvidia-nca-genl',
    udemy: 'https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/', live: false },
];

const N_QUESTIONS = 12;

// pick questions spread across domains, deterministically
function pickQuestions(state) {
  const byDomain = {};
  for (const k of Object.keys(state.tests || {})) {
    if (!k.startsWith('t1')) continue;
    for (const q of state.tests[k] || []) {
      if (!Array.isArray(q.options) || q.options.length !== 4) continue;
      if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index > 3) continue;
      (byDomain[q.domain || 'General'] = byDomain[q.domain || 'General'] || []).push(q);
    }
  }
  const domains = Object.keys(byDomain);
  const picked = [];
  let i = 0;
  while (picked.length < N_QUESTIONS && domains.some(d => byDomain[d].length)) {
    const d = domains[i % domains.length];
    if (byDomain[d].length) picked.push(byDomain[d].shift());
    i++;
  }
  return picked;
}

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root{--bg:#0f172a;--card:#1e293b;--txt:#e2e8f0;--dim:#94a3b8;--acc:#38bdf8;--ok:#4ade80;--bad:#f87171;--btn:#0ea5e9}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 64px}
header{padding:28px 0 8px}h1{font-size:1.5rem}h1 a{color:var(--txt);text-decoration:none}
.sub{color:var(--dim);margin:4px 0 20px}
.card{background:var(--card);border-radius:12px;padding:20px;margin:14px 0}
.card h2{font-size:1.05rem;margin-bottom:4px}.card p{color:var(--dim);font-size:.92rem}
.card a.go{display:inline-block;margin-top:10px;color:var(--acc);text-decoration:none;font-weight:600}
.q{margin-bottom:8px;font-weight:600}
.opt{display:block;width:100%;text-align:left;background:#0f172a;border:1px solid #334155;color:var(--txt);
 border-radius:8px;padding:10px 12px;margin:6px 0;cursor:pointer;font-size:.95rem}
.opt:hover{border-color:var(--acc)}
.opt.correct{border-color:var(--ok);background:#052e16}
.opt.wrong{border-color:var(--bad);background:#450a0a}
.expl{display:none;background:#0f172a;border-left:3px solid var(--acc);padding:10px 12px;margin-top:8px;
 border-radius:0 8px 8px 0;font-size:.92rem;color:var(--dim)}
.meta{font-size:.78rem;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
.cta{background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:12px;padding:22px;margin:26px 0;text-align:center}
.cta a{display:inline-block;background:#fff;color:#0f172a;font-weight:700;text-decoration:none;
 padding:11px 22px;border-radius:8px;margin-top:10px}
.cta p{color:#e0f2fe}
.score{font-size:1.1rem;font-weight:700;margin:18px 0 6px}
footer{color:var(--dim);font-size:.8rem;margin-top:44px;border-top:1px solid #1e293b;padding-top:16px}
footer a{color:var(--dim)}
.badge{display:inline-block;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px;vertical-align:middle}
.badge.live{background:#052e16;color:var(--ok)}.badge.soon{background:#1e3a5f;color:var(--acc)}
`;

function questionJS() {
  return `
function answer(btn, qi, oi, correct){
  const qdiv=document.getElementById('q'+qi);
  if(qdiv.dataset.done) return;
  qdiv.dataset.done='1';
  const opts=qdiv.querySelectorAll('.opt');
  opts[correct].classList.add('correct');
  if(oi!==correct) btn.classList.add('wrong');
  qdiv.querySelector('.expl').style.display='block';
  window.__score=(window.__score||0)+(oi===correct?1:0);
  window.__answered=(window.__answered||0)+1;
  const total=document.querySelectorAll('.qcard').length;
  if(window.__answered===total){
    const s=document.getElementById('score');
    s.textContent='Your score: '+window.__score+' / '+total+(window.__score>=total*0.7?' — on track. ':' — the full course covers every gap. ');
    s.scrollIntoView({behavior:'smooth'});
  }
}`;
}

function certPage(course, questions) {
  const qHtml = questions.map((q, qi) => `
  <div class="card qcard" id="q${qi}">
    <div class="meta">Question ${qi + 1} of ${questions.length}${q.domain ? ' · ' + esc(q.domain) : ''}</div>
    <div class="q">${esc(q.question)}</div>
    ${q.options.map((o, oi) => `<button class="opt" onclick="answer(this,${qi},${oi},${q.correct_index})">${'ABCD'[oi]}. ${esc(o)}</button>`).join('')}
    <div class="expl">${esc(q.explanation || q.why_correct || '')}</div>
  </div>`).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Free ${esc(course.name)} Practice Test — ${questions.length} Real Exam-Style Questions</title>
<meta name="description" content="Free ${esc(course.name)} practice questions with detailed explanations. Test yourself before the real exam.">
<style>${CSS}</style></head><body><div class="wrap">
<header><h1><a href="index.html">TechNuggets Academy</a></h1>
<p class="sub">Free ${esc(course.name)} practice test — ${questions.length} exam-style questions with explanations. No sign-up.</p></header>
${qHtml}
<div class="score" id="score"></div>
<div class="cta">
  <strong>Ready for the real thing?</strong>
  <p>The full course has ${course.live ? 'two full-length practice tests, ' : ''}video lessons for every exam domain, hands-on labs and detailed answer explanations.</p>
  <a href="${course.udemy}" rel="sponsored">${course.live ? 'Get the full course on Udemy →' : 'See the full course on Udemy →'}</a>
</div>
<footer>Questions © TechNuggets Academy (Aseem Mankotia). Course links may be referral links.
Not affiliated with or endorsed by the certification vendor. <a href="index.html">All free practice tests</a></footer>
</div><script>${questionJS()}</script></body></html>`;
}

function indexPage(cards) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Free AI Certification Practice Tests — AWS, ISACA, IAPP, CompTIA, Databricks, NVIDIA</title>
<meta name="description" content="Free practice questions with explanations for the top AI certifications: AWS AIF-C01, SCS-C03, AIP-C01, IAPP AIGP, ISACA AAIR, CompTIA SecAI+, Databricks GenAI Engineer, NVIDIA NCA-GENL.">
<style>${CSS}</style></head><body><div class="wrap">
<header><h1>TechNuggets Academy</h1>
<p class="sub">Free practice tests for the AI certifications employers actually ask for — real exam-style questions with explanations, no sign-up.</p></header>
${cards}
<footer>© TechNuggets Academy (Aseem Mankotia). Course links may be referral links. Not affiliated with or endorsed by any certification vendor.</footer>
</div></body></html>`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const cards = [];
for (const c of COURSES) {
  const stateFile = path.join(ROOT, 'generated', c.slug, 'state.json');
  if (!fs.existsSync(stateFile)) { console.log(`skip ${c.slug}: no state`); continue; }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const qs = pickQuestions(state);
  if (qs.length < 8) { console.log(`skip ${c.slug}: only ${qs.length} usable questions`); continue; }
  fs.writeFileSync(path.join(OUT, `${c.page}.html`), certPage(c, qs));
  cards.push(`<div class="card"><h2>${esc(c.name)}<span class="badge ${c.live ? 'live' : 'soon'}">${c.live ? 'Course live' : 'Course in review'}</span></h2>
  <p>${esc(c.tagline)}</p><a class="go" href="${c.page}.html">Take the free ${qs.length}-question practice test →</a></div>`);
  console.log(`✅ ${c.page}.html (${qs.length} questions)`);
}
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(cards.join('\n')));
console.log(`✅ index.html (${cards.length} certs)\n→ ${OUT}`);
