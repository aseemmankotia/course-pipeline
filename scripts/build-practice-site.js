#!/usr/bin/env node
/**
 * build-practice-site.js — generate a static free-practice-test site from the
 * question banks in generated/<slug>/state.json.
 *
 * The site is the top of the marketing funnel: free questions per cert with
 * real explanations, then a coupon-powered link to the full Udemy course.
 * Sales through referral/coupon links carry a 97% instructor share vs 37%
 * organic, so every student this site converts is worth ~2.6x an organic one.
 *
 * Output: site/
 *   index.html, style.css, quiz.js
 *   <page>.html                       — 12-question mixed test per cert
 *   <page>-<domain-slug>.html         — 6-question per-domain pages (live certs, long-tail SEO)
 *   sitemap.xml, robots.txt
 *
 * Conversion features:
 *   - coupon CTA (code + discounted price) on live-cert pages
 *   - score-gated reveal: on completion, shows missed-domain gaps + coupon highlight
 *
 * NOTE: coupons expire monthly (Udemy 31-day custom-price coupons). When
 * refreshing coupons, update the `coupon` fields below and rebuild + redeploy.
 *
 * Usage: node scripts/build-practice-site.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site');
const SITE_URL = 'https://aseemmankotia.github.io';

// slug -> { file, name, tagline, udemy (referral if live, plain if in review), badge }
const COURSES = [
  { slug: 'aws-certified-ai-practitioner-aif-c01', name: 'AWS Certified AI Practitioner (AIF-C01)',
    tagline: 'Foundational AWS AI/ML and generative AI', page: 'aws-aif-c01',
    udemy: 'https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?referralCode=003B046A1F6935BDE16F', live: true,
    coupon: { code: 'FREETEST33', price: '$17.99', list: '$54.99', expires: 'August 22',
      url: 'https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?couponCode=FREETEST33' } },
  { slug: 'iapp-aigp-ai-governance', name: 'IAPP AI Governance Professional (AIGP)',
    tagline: 'EU AI Act, NIST AI RMF, ISO/IEC 42001', page: 'iapp-aigp',
    udemy: 'https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?referralCode=0B6A80F71D9FCB827C55', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'August 22',
      url: 'https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?couponCode=FREETEST33' } },
  { slug: 'aws-genai-developer-aip-c01', name: 'AWS Certified GenAI Developer (AIP-C01)',
    tagline: 'Bedrock, RAG and production GenAI on AWS', page: 'aws-aip-c01',
    udemy: 'https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?referralCode=25D9BA793B6B69835FCB', live: true,
    coupon: { code: 'FREETEST33', price: '$17.99', list: '$54.99', expires: 'August 22',
      url: 'https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?couponCode=FREETEST33' } },
  { slug: 'comptia-secai-plus-cy0-001', name: 'CompTIA SecAI+ (CY0-001)',
    tagline: 'AI security: MITRE ATLAS, OWASP LLM Top 10', page: 'comptia-secai',
    udemy: 'https://www.udemy.com/course/comptia-secai-cy0-001-certification-fast-track/?referralCode=0051CB797C361B6638DD', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'August 23',
      url: 'https://www.udemy.com/course/comptia-secai-cy0-001-certification-fast-track/?couponCode=FREETEST33' } },
  { slug: 'aws-security-specialty-scs-c03', name: 'AWS Certified Security – Specialty (SCS-C03)',
    tagline: 'IAM, detection, data protection and AI guardrails', page: 'aws-scs-c03',
    udemy: 'https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/?referralCode=DB55717A7CE2D886873D', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$119.99', expires: 'August 23',
      url: 'https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/?couponCode=FREETEST33' } },
  { slug: 'isaca-aair-ai-risk', name: 'ISACA Advanced in AI Risk (AAIR)',
    tagline: 'Enterprise AI risk programs and governance', page: 'isaca-aair',
    udemy: 'https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/?referralCode=2D84313C4CEA3D1FAAD9', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'August 23',
      url: 'https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/?couponCode=FREETEST33' } },
  { slug: 'databricks-genai-engineer-associate', name: 'Databricks Certified GenAI Engineer Associate',
    tagline: 'Vector Search, MLflow, Model Serving and RAG', page: 'databricks-genai',
    udemy: 'https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/?referralCode=8DE765A37F8FA8316910', live: true,
    coupon: { code: 'FREETEST33', price: '$66.99', list: '$199.99', expires: 'August 23',
      url: 'https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/?couponCode=FREETEST33' } },
  { slug: 'nvidia-nca-genl-generative-ai-llms', name: 'NVIDIA Generative AI & LLMs (NCA-GENL)',
    tagline: 'Transformers, prompt engineering and the NVIDIA stack', page: 'nvidia-nca-genl',
    udemy: 'https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/?referralCode=8B242DD8B0A1E0E31860', live: true,
    coupon: { code: 'FREETEST33', price: '$17.99', list: '$54.99', expires: 'August 23',
      url: 'https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/?couponCode=FREETEST33' } },
  // Week-5 launches — live on Udemy, added to the funnel 2026-07-29. FREETEST33
  // coupons + referral links added 2026-08-01 (weekly marketing check).
  { slug: 'salesforce-agentforce-specialist', name: 'Salesforce Agentforce Specialist',
    tagline: 'Agentforce agents, Prompt Builder and Data Cloud grounding', page: 'salesforce-agentforce',
    udemy: 'https://www.udemy.com/course/salesforce-agentforce-specialist-exam-focused-preparation/?referralCode=932FEB83A87411DC2DE8', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$199.99', expires: 'September 1',
      url: 'https://www.udemy.com/course/salesforce-agentforce-specialist-exam-focused-preparation/?couponCode=FREETEST33' } },
  { slug: 'anthropic-claude-developer-foundations', name: 'Claude Certified Developer (CCDV-F)',
    tagline: 'Building, deploying and evaluating apps with Claude', page: 'claude-ccdv-f',
    udemy: 'https://www.udemy.com/course/claude-certified-developer-ccdv-f-complete-exam-prep/?referralCode=8AFA75B665B80C410125', live: true,
    coupon: { code: 'FREETEST33', price: '$17.99', list: '$54.99', expires: 'September 1',
      url: 'https://www.udemy.com/course/claude-certified-developer-ccdv-f-complete-exam-prep/?couponCode=FREETEST33' } },
  // Week-6 go-lives — found live on Udemy 2026-08-02 (weekly marketing check).
  // FREETEST33 coupons + referral links created same day, expire September 2.
  { slug: 'comptia-security-plus-sy0-701', name: 'CompTIA Security+ (SY0-701)',
    tagline: 'Security concepts, threats and SecOps for SY0-701', page: 'sy0-701',
    udemy: 'https://www.udemy.com/course/comptia-security-sy0-701-exam-focused-prep/?referralCode=2E09250951BA6C33C873', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/comptia-security-sy0-701-exam-focused-prep/?couponCode=FREETEST33' } },
  { slug: 'aws-solutions-architect-associate-saa-c04', name: 'AWS Certified Solutions Architect – Associate (SAA-C04)',
    tagline: 'Secure, resilient and cost-optimized AWS architectures', page: 'saa-c04',
    udemy: 'https://www.udemy.com/course/aws-saa-c04-exam-prep-solutions-architect-associate/?referralCode=1F2F34A5C4485414A399', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/aws-saa-c04-exam-prep-solutions-architect-associate/?couponCode=FREETEST33' } },
  { slug: 'microsoft-ai-300-mlops-genaiops-2026', name: 'Microsoft MLOps Engineer Associate (AI-300)',
    tagline: 'MLOps infrastructure and model lifecycle on Azure', page: 'ai-300',
    udemy: 'https://www.udemy.com/course/ai-300-mlops-genaiops-engineer-exam-preparation/?referralCode=E77DA0B8890568F118C6', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$129.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/ai-300-mlops-genaiops-engineer-exam-preparation/?couponCode=FREETEST33' } },
  { slug: 'google-cloud-generative-ai-leader-2026', name: 'Google Cloud Generative AI Leader',
    tagline: 'GenAI fundamentals and Google Cloud\'s GenAI stack', page: 'generative-ai-leader',
    udemy: 'https://www.udemy.com/course/google-cloud-generative-ai-leader-exam-prep-2026/?referralCode=F008FA2B73A7485FF710', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$99.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/google-cloud-generative-ai-leader-exam-prep-2026/?couponCode=FREETEST33' } },
  { slug: 'nvidia-ncp-aio-ai-operations-2026', name: 'NVIDIA AI Operations Professional (NCP-AIO)',
    tagline: 'Deploying and administering NVIDIA AI infrastructure', page: 'ncp-aio',
    udemy: 'https://www.udemy.com/course/ncp-aio-nvidia-ai-operations-professional-certification/?referralCode=DE36F0D7F6A6C9C92CD8', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$199.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/ncp-aio-nvidia-ai-operations-professional-certification/?couponCode=FREETEST33' } },
  { slug: 'microsoft-ai-103-azure-ai-apps-agents-2026', name: 'Microsoft Azure AI Apps & Agents Developer (AI-103)',
    tagline: 'Azure AI apps, agents and generative AI solutions', page: 'ai-103',
    udemy: 'https://www.udemy.com/course/ai-103-azure-ai-apps-agents-developer-certification/?referralCode=A5946EF37692CED37B08', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 2',
      url: 'https://www.udemy.com/course/ai-103-azure-ai-apps-agents-developer-certification/?couponCode=FREETEST33' } },  { slug: 'nvidia-nca-ads-accelerated-data-science-2026', name: "NVIDIA-Certified Associate: Accelerated Data Science",
    tagline: "GPU-Accelerated Data Manipulation and Preparation, ETL and Scalable GPU Pipelines", page: 'nca-ads',
    udemy: 'https://www.udemy.com/course/nca-ads-nvidia-accelerated-data-science-exam-prep/?referralCode=9B6E2B7FF4CF980A7994', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$99.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/nca-ads-nvidia-accelerated-data-science-exam-prep/?couponCode=FREETEST33' } },
  { slug: 'nvidia-ncp-ousd-openusd-development-2026', name: "NVIDIA-Certified Professional: OpenUSD Development",
    tagline: "OpenUSD Fundamentals and Data Modeling, Composition and Composition Arcs", page: 'ncp-ousd',
    udemy: 'https://www.udemy.com/course/ncp-ousd-nvidia-openusd-development-certification-prep/?referralCode=23DC329290344BD82776', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/ncp-ousd-nvidia-openusd-development-certification-prep/?couponCode=FREETEST33' } },
  { slug: 'aipmm-cdpm-certified-digital-product-manager-2026', name: "AIPMM Certified Digital Product Manager",
    tagline: "Digital Product Management Foundations, Customer Discovery, JTBD, and Design Thinking", page: 'cdpm',
    udemy: 'https://www.udemy.com/course/aipmm-cdpm-exam-prep-digital-product-management/?referralCode=10284AA60F904C506094', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/aipmm-cdpm-exam-prep-digital-product-management/?couponCode=FREETEST33' } },
  { slug: 'aipmm-cpm-certified-product-manager-2026', name: "AIPMM Certified Product Manager",
    tagline: "Product Management Foundations and the ProdBOK Life Cycle, Market Research and Competitive Analysis", page: 'cpm',
    udemy: 'https://www.udemy.com/course/aipmm-cpm-certified-product-manager-exam-prep/?referralCode=07EDCD4FC46B47DCCF21', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/aipmm-cpm-certified-product-manager-exam-prep/?couponCode=FREETEST33' } },
  { slug: 'nvidia-ncp-aai-agentic-ai-2026', name: "NVIDIA-Certified Professional: Agentic AI",
    tagline: "Agent Design and Cognition, Orchestration and Multi-Agent Systems", page: 'ncp-aai',
    udemy: 'https://www.udemy.com/course/nvidia-ncp-aai-agentic-ai-certification-prep/?referralCode=5696EF5C81591EBA8CB8', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$129.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/nvidia-ncp-aai-agentic-ai-certification-prep/?couponCode=FREETEST33' } },
  { slug: 'nvidia-ncp-genl-generative-ai-llm-2026', name: "NVIDIA-Certified Professional: Generative AI and LLMs",
    tagline: "LLM Foundations and Architecture, Prompt Engineering and Adaptation", page: 'ncp-genl',
    udemy: 'https://www.udemy.com/course/ncp-genl-nvidia-generative-ai-llms-cert-prep/?referralCode=45A462FCEE67660749E1', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$129.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/ncp-genl-nvidia-generative-ai-llms-cert-prep/?couponCode=FREETEST33' } },
  { slug: 'aws-machine-learning-engineer-associate-mla-c01', name: "AWS Certified Machine Learning Engineer - Associate",
    tagline: "Data Preparation for Machine Learning (ML), ML Model Development", page: 'mla-c01',
    udemy: 'https://www.udemy.com/course/aws-certified-ml-engineer-associate-mla-c01-prep/?referralCode=63AA3C5B6CCFB916DCAB', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$109.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/aws-certified-ml-engineer-associate-mla-c01-prep/?couponCode=FREETEST33' } },
  { slug: 'google-cloud-professional-ml-engineer-2026', name: "Google Cloud Professional Machine Learning Engineer",
    tagline: "Architecting low-code AI solutions, Collaborating to manage data and models", page: 'professional-ml-engineer',
    udemy: 'https://www.udemy.com/course/google-cloud-professional-ml-engineer-exam-prep/?referralCode=3A86432A198744ED2F33', live: true,
    coupon: { code: 'FREETEST33', price: '$34.99', list: '$129.99', expires: 'September 7',
      url: 'https://www.udemy.com/course/google-cloud-professional-ml-engineer-exam-prep/?couponCode=FREETEST33' } },

];

const N_QUESTIONS = 12;
const N_DOMAIN_QUESTIONS = 6;

const validQ = q => Array.isArray(q.options) && q.options.length === 4 &&
  Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3;

// pool questions by domain from a given test prefix
function poolByDomain(state, prefix) {
  const byDomain = {};
  for (const k of Object.keys(state.tests || {})) {
    if (!k.startsWith(prefix)) continue;
    for (const q of state.tests[k] || []) {
      if (!validQ(q)) continue;
      (byDomain[q.domain || 'General'] = byDomain[q.domain || 'General'] || []).push(q);
    }
  }
  return byDomain;
}

// pick questions spread across domains, deterministically (t1 pool)
function pickQuestions(state) {
  const byDomain = poolByDomain(state, 't1');
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

const domainLabel = d => String(d || '').replace(/^Domain \d+:\s*/i, '').replace(/\s*\(\d+%?\)\s*$/,'').trim();
const slugify = s => domainLabel(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

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
.cta .strike{text-decoration:line-through;opacity:.7}
.cta .code{background:rgba(255,255,255,.18);border:1px dashed #fff;border-radius:6px;padding:2px 8px;font-weight:700}
.score{font-size:1.1rem;font-weight:700;margin:18px 0 6px}
.gaps{display:none;background:var(--card);border-radius:12px;padding:16px 20px;margin:10px 0;color:var(--dim);font-size:.95rem}
.gaps strong{color:var(--txt)}
.domains{margin:26px 0}.domains a{display:inline-block;margin:4px 8px 4px 0;color:var(--acc);text-decoration:none;font-size:.9rem}
footer{color:var(--dim);font-size:.8rem;margin-top:44px;border-top:1px solid #1e293b;padding-top:16px}
footer a{color:var(--dim)}
.badge{display:inline-block;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px;vertical-align:middle}
.badge.live{background:#052e16;color:var(--ok)}.badge.soon{background:#1e3a5f;color:var(--acc)}
.badge.deal{background:#450a0a;color:#fca5a5}
`;

// shared quiz behavior: per-domain miss tracking + score-gated gap/coupon reveal
const QUIZ_JS = `
function answer(btn, qi, oi, correct){
  const qdiv=document.getElementById('q'+qi);
  if(qdiv.dataset.done) return;
  qdiv.dataset.done='1';
  const opts=qdiv.querySelectorAll('.opt');
  opts[correct].classList.add('correct');
  if(oi!==correct){btn.classList.add('wrong');
    const d=qdiv.dataset.domain||'General';
    window.__missed=window.__missed||{}; window.__missed[d]=(window.__missed[d]||0)+1;}
  qdiv.querySelector('.expl').style.display='block';
  window.__score=(window.__score||0)+(oi===correct?1:0);
  window.__answered=(window.__answered||0)+1;
  const total=document.querySelectorAll('.qcard').length;
  if(window.__answered===total) finish(total);
}
function finish(total){
  const s=document.getElementById('score');
  const pass=window.__score>=total*0.7;
  s.textContent='Your score: '+window.__score+' / '+total+(pass?' — on track.':' — below the 70% bar most exams set.');
  const g=document.getElementById('gaps');
  if(g){
    const missed=Object.entries(window.__missed||{}).sort((a,b)=>b[1]-a[1]);
    let html='';
    if(missed.length){
      html='<strong>Where you lost points:</strong> '+missed.map(m=>m[0].replace(/^Domain \\d+:\\s*/i,'')+' ('+m[1]+')').join(', ')+'. ';
      html+='The full course has a dedicated chapter, lab and practice-test coverage for each of these.';
    } else {
      html='<strong>Perfect score.</strong> The two full-length timed practice tests in the course are the natural next step.';
    }
    const c=g.dataset.coupon;
    if(c) html+=' Use code <strong>'+c+'</strong> at checkout — the link below applies it automatically.';
    g.innerHTML=html; g.style.display='block';
  }
  s.scrollIntoView({behavior:'smooth'});
}`;

function head(title, desc, canonicalPath) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE_URL}/${canonicalPath}">
<link rel="stylesheet" href="style.css"></head><body><div class="wrap">`;
}

function ctaBlock(course) {
  if (course.coupon) {
    const c = course.coupon;
    return `<div class="cta">
  <strong>Ready for the real thing?</strong>
  <p>Full course: two full-length practice tests, video lessons for every exam domain, hands-on labs and detailed explanations.</p>
  <p><span class="strike">${c.list}</span> <strong>${c.price}</strong> with code <span class="code">${c.code}</span> — valid through ${c.expires}.</p>
  <a href="${c.url}" rel="sponsored">Get the full course for ${c.price} →</a>
</div>`;
  }
  return `<div class="cta">
  <strong>Ready for the real thing?</strong>
  <p>The full course has ${course.live ? 'two full-length practice tests, ' : ''}video lessons for every exam domain, hands-on labs and detailed answer explanations.</p>
  <a href="${course.udemy}" rel="sponsored">${course.live ? 'Get the full course on Udemy →' : 'See the full course on Udemy →'}</a>
</div>`;
}

function questionsHtml(questions) {
  return questions.map((q, qi) => `
  <div class="card qcard" id="q${qi}" data-domain="${esc(q.domain || 'General')}">
    <div class="meta">Question ${qi + 1} of ${questions.length}${q.domain ? ' · ' + esc(q.domain) : ''}</div>
    <div class="q">${esc(q.question)}</div>
    ${q.options.map((o, oi) => `<button class="opt" onclick="answer(this,${qi},${oi},${q.correct_index})">${'ABCD'[oi]}. ${esc(o)}</button>`).join('')}
    <div class="expl">${esc(q.explanation || q.why_correct || '')}</div>
  </div>`).join('\n');
}

const footerHtml = `<footer>Questions © TechNuggets Academy (Aseem Mankotia). Course links may be referral links.
Not affiliated with or endorsed by the certification vendor. <a href="index.html">All free practice tests</a></footer>
</div><script src="quiz.js"></script></body></html>`;

function certPage(course, questions, domainPages) {
  const domainsNav = domainPages.length
    ? `<div class="domains"><span class="meta">More free practice by exam domain:</span><br>${
        domainPages.map(dp => `<a href="${dp.file}">${esc(dp.label)} →</a>`).join('')}</div>`
    : '';
  return head(
    `Free ${esc(course.name)} Practice Test — ${questions.length} Real Exam-Style Questions`,
    `Free ${esc(course.name)} practice questions with detailed explanations. Test yourself before the real exam.`,
    `${course.page}.html`) + `
<header><h1><a href="index.html">TechNuggets Academy</a></h1>
<p class="sub">Free ${esc(course.name)} practice test — ${questions.length} exam-style questions with explanations. No sign-up.</p></header>
${questionsHtml(questions)}
<div class="score" id="score"></div>
<div class="gaps" id="gaps"${course.coupon ? ` data-coupon="${course.coupon.code}"` : ''}></div>
${ctaBlock(course)}
${domainsNav}
${footerHtml}`;
}

function domainPage(course, domain, questions, file) {
  const label = domainLabel(domain);
  return head(
    `Free ${esc(label)} Practice Questions — ${esc(course.name)}`,
    `${questions.length} free ${esc(label)} practice questions with explanations for the ${esc(course.name)} exam.`,
    file) + `
<header><h1><a href="index.html">TechNuggets Academy</a></h1>
<p class="sub">Free ${esc(course.name)} practice — ${questions.length} questions on <strong>${esc(label)}</strong>, with explanations. No sign-up.
<a href="${course.page}.html" style="color:var(--acc)">Full ${questions.length >= N_QUESTIONS ? '' : '12-question '}mixed test →</a></p></header>
${questionsHtml(questions)}
<div class="score" id="score"></div>
<div class="gaps" id="gaps"${course.coupon ? ` data-coupon="${course.coupon.code}"` : ''}></div>
${ctaBlock(course)}
${footerHtml}`;
}

function indexPage(cards) {
  return head(
    'Free AI Certification Practice Tests — AWS, ISACA, IAPP, CompTIA, Databricks, NVIDIA',
    'Free practice questions with explanations for the top AI certifications: AWS AIF-C01, SCS-C03, AIP-C01, IAPP AIGP, ISACA AAIR, CompTIA SecAI+, Databricks GenAI Engineer, NVIDIA NCA-GENL.',
    '') + `
<header><h1>TechNuggets Academy</h1>
<p class="sub">Free practice tests for the AI certifications employers actually ask for — real exam-style questions with explanations, no sign-up.</p></header>
${cards}
<footer>© TechNuggets Academy (Aseem Mankotia). Course links may be referral links. Not affiliated with or endorsed by any certification vendor.</footer>
</div></body></html>`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'style.css'), CSS.trim() + '\n');
fs.writeFileSync(path.join(OUT, 'quiz.js'), QUIZ_JS.trim() + '\n');

const cards = [];
const sitemapPaths = [''];
const INCLUDE_ALL = process.argv.includes('--all'); // in-review certs have dead Udemy links until approved
for (const c of COURSES) {
  if (!c.live && !INCLUDE_ALL) { console.log(`skip ${c.slug}: course in review (use --all to include)`); continue; }
  const stateFile = path.join(ROOT, 'generated', c.slug, 'state.json');
  if (!fs.existsSync(stateFile)) { console.log(`skip ${c.slug}: no state`); continue; }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const qs = pickQuestions(state);
  if (qs.length < 8) { console.log(`skip ${c.slug}: only ${qs.length} usable questions`); continue; }

  // per-domain long-tail pages (live certs only, drawn from t2 so they don't duplicate the main page)
  const domainPages = [];
  if (c.live) {
    const t2 = poolByDomain(state, 't2');
    for (const d of Object.keys(t2)) {
      if (t2[d].length < N_DOMAIN_QUESTIONS) continue;
      const file = `${c.page}-${slugify(d)}.html`;
      const dq = t2[d].slice(0, N_DOMAIN_QUESTIONS);
      fs.writeFileSync(path.join(OUT, file), domainPage(c, d, dq, file));
      domainPages.push({ file, label: domainLabel(d) });
      sitemapPaths.push(file);
      console.log(`  ✅ ${file} (${dq.length} questions)`);
    }
  }

  fs.writeFileSync(path.join(OUT, `${c.page}.html`), certPage(c, qs, domainPages));
  sitemapPaths.push(`${c.page}.html`);
  const deal = c.coupon ? `<span class="badge deal">${c.coupon.price} coupon</span>` : '';
  cards.push(`<div class="card"><h2>${esc(c.name)}<span class="badge ${c.live ? 'live' : 'soon'}">${c.live ? 'Course live' : 'Course in review'}</span>${deal}</h2>
  <p>${esc(c.tagline)}</p><a class="go" href="${c.page}.html">Take the free ${qs.length}-question practice test →</a></div>`);
  console.log(`✅ ${c.page}.html (${qs.length} questions, ${domainPages.length} domain pages)`);
}
if (!INCLUDE_ALL) {
  const pending = COURSES.filter(c => !c.live).map(c => c.name.replace(/ \(.*\)$/, ''));
  if (pending.length) cards.push(`<div class="card"><h2>${pending.length} more certs on the way</h2><p>${esc(pending.join(', '))} practice tests go live here as each course completes Udemy review.</p></div>`);
}
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(cards.join('\n')));

// sitemap + robots
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemapPaths.map(p => `  <url><loc>${SITE_URL}/${p}</loc><changefreq>weekly</changefreq><priority>${p === '' ? '1.0' : p.includes('-') && !COURSES.some(c => p === c.page + '.html') ? '0.7' : '0.9'}</priority></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`✅ index.html (${cards.length} certs) + sitemap.xml + robots.txt\n→ ${OUT}`);
