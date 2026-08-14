#!/usr/bin/env node
/**
 * promo-all.js — Batch promo-video pipeline: render + upload Shorts for every course.
 *
 * Per course:
 *   1. Stage generated/<slug>/course-data-export.json → root (what promo-render reads)
 *   2. Generate the 60s promo script once (promo-render --preview), cache per-slug
 *   3. TTS the script → heygen-promo.mp4 (free edge-tts narration)
 *   4. Full render with --script-file + --audio-only → narrated 16:9 + 9:16 Shorts
 *   5. Move outputs to render/promo/<slug>-promo.mp4 / <slug>-short.mp4
 *
 * Special: the EU AI Act 45s urgency short (marketing/eu-ai-act-short-script.txt)
 * is rendered against the AIGP course as "eu-ai-act-aigp".
 *
 * Usage:
 *   node scripts/promo-all.js                     # render everything (skips done)
 *   node scripts/promo-all.js --slug=<slug>       # one course only
 *   node scripts/promo-all.js --force             # re-render even if output exists
 *   node scripts/promo-all.js --upload            # upload rendered Shorts of LIVE courses to YouTube (public)
 *   node scripts/promo-all.js --upload --privacy=unlisted   # review first, flip later with upload-short --publish
 *   node scripts/promo-all.js --upload --include-unpublished # also upload in-review courses (links 404 until live!)
 *
 * Rendering requires: ffmpeg, puppeteer, edge-tts (pip3 install edge-tts), ANTHROPIC_API_KEY.
 * Upload requires: client_secrets.json + youtube-token.json (node youtube-auth.js).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PROMO_DIR = path.join(ROOT, 'render', 'promo');
const SCRIPTS_DIR = path.join(PROMO_DIR, 'scripts');
fs.mkdirSync(SCRIPTS_DIR, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

// Course registry — keep in sync with scripts/build-practice-site.js.
// `live` gates uploads: in-review Udemy URLs 404 until the course is approved.
const COURSES = [
  { slug: 'aws-certified-ai-practitioner-aif-c01', short: 'AWS AI Practitioner (AIF-C01)',
    title: 'Pass the AWS AI Practitioner (AIF-C01) on your first try #Shorts',
    tags: 'aws,ai practitioner,aif-c01,certification,exam prep',
    udemy: 'https://www.udemy.com/course/aws-ai-practitioner-aif-c01-first-attempt-certification/?referralCode=003B046A1F6935BDE16F', live: true },
  { slug: 'iapp-aigp-ai-governance', short: 'IAPP AIGP',
    title: 'The AI certification employers want before August 2 (IAPP AIGP) #Shorts',
    tags: 'aigp,iapp,eu ai act,ai governance,certification',
    udemy: 'https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?referralCode=0B6A80F71D9FCB827C55', live: true },
  { slug: 'aws-genai-developer-aip-c01', short: 'AWS GenAI Developer (AIP-C01)',
    title: 'AWS GenAI Developer (AIP-C01): the new cert explained #Shorts',
    tags: 'aws,bedrock,generative ai,aip-c01,certification',
    udemy: 'https://www.udemy.com/course/aws-certified-genai-developer-aip-c01/?referralCode=25D9BA793B6B69835FCB', live: true },
  { slug: 'comptia-secai-plus-cy0-001', short: 'CompTIA SecAI+',
    title: 'CompTIA SecAI+ (CY0-001): AI security certification prep #Shorts',
    tags: 'comptia,secai,ai security,cy0-001,certification',
    udemy: 'https://www.udemy.com/course/comptia-secai-cy0-001-certification-fast-track/?referralCode=0051CB797C361B6638DD', live: true },
  { slug: 'aws-security-specialty-scs-c03', short: 'AWS Security Specialty (SCS-C03)',
    title: 'AWS Security Specialty SCS-C03: what changed in 2026 #Shorts',
    tags: 'aws,security specialty,scs-c03,certification',
    udemy: 'https://www.udemy.com/course/aws-certified-security-specialty-scs-c03-exam-prep/?referralCode=DB55717A7CE2D886873D', live: true },
  { slug: 'isaca-aair-ai-risk', short: 'ISACA AAIR',
    title: 'ISACA AAIR: the new advanced AI risk certification #Shorts',
    tags: 'isaca,aair,ai risk,certification,grc',
    udemy: 'https://www.udemy.com/course/isaca-aair-advanced-ai-risk-certification-prep/?referralCode=2D84313C4CEA3D1FAAD9', live: true },
  { slug: 'databricks-genai-engineer-associate', short: 'Databricks GenAI Engineer',
    title: 'Databricks GenAI Engineer Associate: pass it first try #Shorts',
    tags: 'databricks,genai engineer,rag,llm,certification',
    udemy: 'https://www.udemy.com/course/databricks-genai-engineer-associate-exam-prep/?referralCode=8DE765A37F8FA8316910', live: true },
  { slug: 'nvidia-nca-genl-generative-ai-llms', short: 'NVIDIA NCA-GENL',
    title: 'NVIDIA NCA-GENL: the entry GenAI cert nobody talks about #Shorts',
    tags: 'nvidia,nca-genl,generative ai,llm,certification',
    udemy: 'https://www.udemy.com/course/nvidia-nca-genl-generative-ai-llm-certification-prep/?referralCode=8B242DD8B0A1E0E31860', live: true },
  // 2026 refreshes of the three older live courses (URLs verified via Udemy API 2026-07-26).
  { slug: 'az-900-azure-fundamentals-refresh-2026', short: 'AZ-900 Azure Fundamentals (2026 refresh)',
    title: 'AZ-900 changed in January 2026 — what the exam covers now #Shorts',
    tags: 'azure,az-900,microsoft,cloud,certification,exam prep',
    udemy: 'https://www.udemy.com/course/azure-fundamentals-mastery-az-900-certification-journey/', live: true },
  { slug: 'nvidia-nca-aiio-refresh-2026', short: 'NVIDIA NCA-AIIO (2026 refresh)',
    title: 'NVIDIA NCA-AIIO: the AI infrastructure cert explained #Shorts',
    tags: 'nvidia,nca-aiio,ai infrastructure,ai operations,certification',
    udemy: 'https://www.udemy.com/course/mastering-nvidia-ai-infrastructure-operations-nca-aiio/', live: true },
  { slug: 'ai-901-azure-ai-fundamentals-refresh-2026', short: 'AI-901 Azure AI Fundamentals (2026 refresh)',
    title: 'AI-901 replaced AI-900 — the new Azure AI fundamentals cert #Shorts',
    tags: 'azure,ai-901,ai fundamentals,microsoft foundry,certification',
    udemy: 'https://www.udemy.com/course/ai-901-azure-ai-fundamentals-your-gateway-to-microsoft-ai/', live: true },
  // Week-5 launches — live on Udemy but were missing promo Shorts (added 2026-07-29).
  { slug: 'salesforce-agentforce-specialist', short: 'Salesforce Agentforce Specialist',
    title: 'Salesforce Agentforce Specialist: the new AI-agent cert #Shorts',
    tags: 'salesforce,agentforce,ai agents,certification,exam prep',
    udemy: 'https://www.udemy.com/course/salesforce-agentforce-specialist-exam-focused-preparation/?referralCode=932FEB83A87411DC2DE8', live: true },
  { slug: 'anthropic-claude-developer-foundations', short: 'Claude Certified Developer (CCDV-F)',
    title: 'Claude Certified Developer (CCDV-F): Anthropic’s new dev cert #Shorts',
    tags: 'claude,anthropic,ccdv-f,ai developer,certification',
    udemy: 'https://www.udemy.com/course/claude-certified-developer-ccdv-f-complete-exam-prep/?referralCode=8AFA75B665B80C410125', live: true },
  // Week-6 go-lives — found live on Udemy 2026-08-02 (weekly marketing check).
  { slug: 'comptia-security-plus-sy0-701', short: 'CompTIA Security+ (SY0-701)',
    title: 'CompTIA Security+ SY0-701: exam-focused prep in 60 seconds #Shorts',
    tags: 'comptia,security+,sy0-701,cybersecurity,certification,exam prep',
    udemy: 'https://www.udemy.com/course/comptia-security-sy0-701-exam-focused-prep/?referralCode=2E09250951BA6C33C873', live: true },
  { slug: 'aws-solutions-architect-associate-saa-c04', short: 'AWS Solutions Architect Associate (SAA-C04)',
    title: 'AWS SAA-C04: what changed for Solutions Architect Associate #Shorts',
    tags: 'aws,solutions architect,saa-c04,cloud,certification,exam prep',
    udemy: 'https://www.udemy.com/course/aws-saa-c04-exam-prep-solutions-architect-associate/?referralCode=1F2F34A5C4485414A399', live: true },
  { slug: 'microsoft-ai-300-mlops-genaiops-2026', short: 'Microsoft AI-300 MLOps Engineer',
    title: 'AI-300: Microsoft’s new MLOps & GenAIOps engineer cert #Shorts',
    tags: 'microsoft,azure,ai-300,mlops,genaiops,certification',
    udemy: 'https://www.udemy.com/course/ai-300-mlops-genaiops-engineer-exam-preparation/?referralCode=E77DA0B8890568F118C6', live: true },
  { slug: 'google-cloud-generative-ai-leader-2026', short: 'Google Cloud GenAI Leader',
    title: 'Google Cloud Generative AI Leader: the business GenAI cert #Shorts',
    tags: 'google cloud,generative ai,genai leader,certification,exam prep',
    udemy: 'https://www.udemy.com/course/google-cloud-generative-ai-leader-exam-prep-2026/?referralCode=F008FA2B73A7485FF710', live: true },
  { slug: 'nvidia-ncp-aio-ai-operations-2026', short: 'NVIDIA NCP-AIO',
    title: 'NCP-AIO: NVIDIA’s AI operations professional cert explained #Shorts',
    tags: 'nvidia,ncp-aio,ai operations,ai infrastructure,certification',
    udemy: 'https://www.udemy.com/course/ncp-aio-nvidia-ai-operations-professional-certification/?referralCode=DE36F0D7F6A6C9C92CD8', live: true },
  { slug: 'microsoft-ai-103-azure-ai-apps-agents-2026', short: 'Microsoft AI-103 Azure AI Apps & Agents',
    title: 'AI-103: build Azure AI apps & agents — the new dev cert #Shorts',
    tags: 'microsoft,azure,ai-103,ai agents,certification,exam prep',
    udemy: 'https://www.udemy.com/course/ai-103-azure-ai-apps-agents-developer-certification/?referralCode=A5946EF37692CED37B08', live: true },
];

// EU AI Act urgency short — pre-written script, rides on the AIGP course data.
const SPECIALS = [
  { slug: 'iapp-aigp-ai-governance', outName: 'eu-ai-act-aigp',
    scriptFile: 'marketing/eu-ai-act-short-script.txt', short: 'EU AI Act deadline (AIGP)',
    title: '11 days until the EU AI Act deadline. Most companies aren\'t ready. #Shorts',
    tags: 'eu ai act,ai governance,aigp,compliance,august 2',
    udemy: 'https://www.udemy.com/course/iapp-aigp-certification-eu-ai-act/?referralCode=0B6A80F71D9FCB827C55', live: true },  { slug: 'nvidia-ncp-aii-ai-infrastructure-professional-2026', short: "NVIDIA-Certified Professional: AI Infras",
    title: "NVIDIA-Certified Professional: AI Infrastructure: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,ncp-aii,certification,exam prep",
    udemy: 'https://www.udemy.com/course/ncp-aii-nvidia-ai-infrastructure-professional-prep/?referralCode=EEC8729A0880EB8DA3B9', live: true },
  { slug: 'nvidia-ncp-ads-accelerated-data-science-professional-2026', short: "NVIDIA-Certified Professional: Accelerat",
    title: "NVIDIA-Certified Professional: Accelerated Data Science: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,ncp-ads,certification,exam prep",
    udemy: 'https://www.udemy.com/course/ncp-ads-nvidia-accelerated-data-science-prep/?referralCode=DFA6E1D64C762E0C8F71', live: true },
  { slug: 'nvidia-nca-genm-generative-ai-multimodal-2026', short: "NVIDIA-Certified Associate: Generative A",
    title: "NVIDIA-Certified Associate: Generative AI Multimodal: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,nca-genm,certification,exam prep",
    udemy: 'https://www.udemy.com/course/nca-genm-nvidia-generative-ai-multimodal-exam-prep/?referralCode=979950D891544A0B1645', live: true },
  { slug: 'pmi-cpmai-managing-ai-2026', short: "PMI Certified Professional in Managing A",
    title: "PMI Certified Professional in Managing AI: exam-prep in 60 seconds #Shorts",
    tags: "pmi,pmi-cpmai,certification,exam prep",
    udemy: 'https://www.udemy.com/course/pmi-cpmai-certification-exam-prep-masterclass/', live: true },
  { slug: 'gsdc-certified-forward-deployed-engineer-2026', short: "GSDC Certified Forward Deployed Engineer",
    title: "GSDC Certified Forward Deployed Engineer: exam-prep in 60 seconds #Shorts",
    tags: "gsdc,cfde,certification,exam prep",
    udemy: 'https://www.udemy.com/course/gsdc-cfde-certification-forward-deployed-engineer-prep/', live: true },
  { slug: 'aws-data-engineer-associate-dea-c01-2026', short: "AWS Certified Data Engineer - Associate",
    title: "AWS Certified Data Engineer - Associate: exam-prep in 60 seconds #Shorts",
    tags: "amazon web services,dea-c01,certification,exam prep",
    udemy: 'https://www.udemy.com/course/aws-certified-data-engineer-associate-dea-c01-prep/', live: true },
  { slug: 'google-associate-cloud-engineer-2026', short: "Google Cloud Certified - Associate Cloud",
    title: "Google Cloud Certified - Associate Cloud Engineer: exam-prep in 60 seconds #Shorts",
    tags: "google cloud,associate cloud engineer,certification,exam prep",
    udemy: 'https://www.udemy.com/course/google-cloud-ace-associate-cloud-engineer-exam-prep/', live: true },

];

// moved out of SPECIALS (register-course.js had appended them to the wrong
// array, breaking --slug lookup; fixed 2026-08-08)
COURSES.push(
  { slug: 'nvidia-nca-ads-accelerated-data-science-2026', short: "NVIDIA-Certified Associate: Accelerated ",
    title: "NVIDIA-Certified Associate: Accelerated Data Science: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,nca-ads,certification,exam prep",
    udemy: 'https://www.udemy.com/course/nca-ads-nvidia-accelerated-data-science-exam-prep/?referralCode=9B6E2B7FF4CF980A7994', live: true },
  { slug: 'nvidia-ncp-ousd-openusd-development-2026', short: "NVIDIA-Certified Professional: OpenUSD D",
    title: "NVIDIA-Certified Professional: OpenUSD Development: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,ncp-ousd,certification,exam prep",
    udemy: 'https://www.udemy.com/course/ncp-ousd-nvidia-openusd-development-certification-prep/?referralCode=23DC329290344BD82776', live: true },
  { slug: 'aipmm-cdpm-certified-digital-product-manager-2026', short: "AIPMM Certified Digital Product Manager",
    title: "AIPMM Certified Digital Product Manager: exam-prep in 60 seconds #Shorts",
    tags: "aipmm,cdpm,certification,exam prep",
    udemy: 'https://www.udemy.com/course/aipmm-cdpm-exam-prep-digital-product-management/?referralCode=10284AA60F904C506094', live: true },
  { slug: 'aipmm-cpm-certified-product-manager-2026', short: "AIPMM Certified Product Manager",
    title: "AIPMM Certified Product Manager: exam-prep in 60 seconds #Shorts",
    tags: "aipmm,cpm,certification,exam prep",
    udemy: 'https://www.udemy.com/course/aipmm-cpm-certified-product-manager-exam-prep/?referralCode=07EDCD4FC46B47DCCF21', live: true },
  { slug: 'nvidia-ncp-aai-agentic-ai-2026', short: "NVIDIA-Certified Professional: Agentic A",
    title: "NVIDIA-Certified Professional: Agentic AI: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,ncp-aai,certification,exam prep",
    udemy: 'https://www.udemy.com/course/nvidia-ncp-aai-agentic-ai-certification-prep/?referralCode=5696EF5C81591EBA8CB8', live: true },
  { slug: 'nvidia-ncp-genl-generative-ai-llm-2026', short: "NVIDIA-Certified Professional: Generativ",
    title: "NVIDIA-Certified Professional: Generative AI and LLMs: exam-prep in 60 seconds #Shorts",
    tags: "nvidia,ncp-genl,certification,exam prep",
    udemy: 'https://www.udemy.com/course/ncp-genl-nvidia-generative-ai-llms-cert-prep/?referralCode=45A462FCEE67660749E1', live: true },
  { slug: 'aws-machine-learning-engineer-associate-mla-c01', short: "AWS Certified Machine Learning Engineer ",
    title: "AWS Certified Machine Learning Engineer - Associate: exam-prep in 60 seconds #Shorts",
    tags: "amazon web services,mla-c01,certification,exam prep",
    udemy: 'https://www.udemy.com/course/aws-certified-ml-engineer-associate-mla-c01-prep/?referralCode=63AA3C5B6CCFB916DCAB', live: true },
  { slug: 'google-cloud-professional-ml-engineer-2026', short: "Google Cloud Professional Machine Learni",
    title: "Google Cloud Professional Machine Learning Engineer: exam-prep in 60 seconds #Shorts",
    tags: "google cloud,professional ml engineer,certification,exam prep",
    udemy: 'https://www.udemy.com/course/google-cloud-professional-ml-engineer-exam-prep/?referralCode=3A86432A198744ED2F33', live: true },
);

function run(cmd, cmdArgs, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${label} failed (exit ${r.status})`);
}

function renderOne(course, { outName, scriptFile } = {}) {
  const name = outName || course.slug;
  const outPromo = path.join(PROMO_DIR, `${name}-promo.mp4`);
  const outShort = path.join(PROMO_DIR, `${name}-short.mp4`);
  if (!args.force && fs.existsSync(outShort)) {
    console.log(`⏭  ${name}: already rendered (${path.basename(outShort)}) — skipping`);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🎬 ${course.short}  (${name})`);
  console.log('='.repeat(60));

  // 1. Stage export
  const exportSrc = path.join(ROOT, 'generated', course.slug, 'course-data-export.json');
  if (!fs.existsSync(exportSrc)) throw new Error(`missing ${exportSrc}`);
  fs.copyFileSync(exportSrc, path.join(ROOT, 'course-data-export.json'));

  // 2. Script: pre-written (specials) or generate once and cache
  let scriptPath;
  if (scriptFile) {
    scriptPath = scriptFile; // relative to ROOT — promo-render resolves it
  } else {
    const cached = path.join(SCRIPTS_DIR, `${name}.txt`);
    if (!fs.existsSync(cached) || args.force) {
      run('node', ['render/promo-render.js', '--preview'], `generate promo script (${name})`);
      fs.copyFileSync(path.join(PROMO_DIR, 'promo-script.txt'), cached);
    } else {
      console.log(`   ✓ using cached script render/promo/scripts/${name}.txt`);
    }
    scriptPath = path.relative(ROOT, cached);
  }

  // 3. TTS narration → heygen-promo.mp4 (audio track promo-render picks up)
  const heygenPromo = path.join(ROOT, 'heygen-promo.mp4');
  if (fs.existsSync(heygenPromo)) fs.unlinkSync(heygenPromo); // never reuse another course's voice
  run('node', ['scripts/tts-generate.js', `--text-file=${scriptPath}`, '--out=heygen-promo.mp4'],
    `TTS narration (${name})`);

  // 4. Full render, reusing the same script so audio and slides match
  run('node', ['render/promo-render.js', `--script-file=${scriptPath}`, '--audio-only',
    `--url=${course.udemy}`], `render promo (${name})`);

  // 5. Move to stable names
  fs.renameSync(path.join(PROMO_DIR, 'welcome-promo.mp4'), outPromo);
  const shortSrc = path.join(PROMO_DIR, 'welcome-promo-short.mp4');
  if (fs.existsSync(shortSrc)) fs.renameSync(shortSrc, outShort);
  fs.unlinkSync(heygenPromo);
  console.log(`✅ ${name}: ${path.basename(outPromo)}${fs.existsSync(outShort) ? ' + ' + path.basename(outShort) : ''}`);
}

function uploadOne(course, { outName } = {}) {
  const name = outName || course.slug;
  const short = path.join(PROMO_DIR, `${name}-short.mp4`);
  if (!fs.existsSync(short)) { console.log(`⏭  ${name}: no rendered short — skipping upload`); return; }
  if (!course.live && !args['include-unpublished']) {
    console.log(`⏭  ${name}: course still in Udemy review (link would 404) — skipping upload`);
    return;
  }
  const marker = path.join(PROMO_DIR, `${name}-short.uploaded`);
  if (fs.existsSync(marker) && !args.force) {
    console.log(`⏭  ${name}: already uploaded (${fs.readFileSync(marker, 'utf8').trim()}) — skipping`);
    return;
  }
  run('node', ['scripts/upload-short.js',
    `--video=render/promo/${name}-short.mp4`,
    `--title=${course.title}`,
    `--udemy-url=${course.udemy}`,
    `--tags=${course.tags}`,
    `--privacy=${args.privacy || 'public'}`,
  ], `upload Short (${name})`);
  fs.writeFileSync(marker, new Date().toISOString() + '\n');
}

(async () => {
  const wanted = args.slug
    ? COURSES.filter(c => c.slug === args.slug)
    : COURSES;
  if (args.slug && wanted.length === 0) { console.error(`Unknown slug: ${args.slug}`); process.exit(1); }

  const specials = args.slug ? SPECIALS.filter(s => s.slug === args.slug) : SPECIALS;

  if (args.upload) {
    for (const c of wanted) uploadOne(c);
    for (const s of specials) uploadOne({ ...COURSES.find(c => c.slug === s.slug), ...s }, { outName: s.outName });
    console.log('\n✅ Upload pass complete.');
    return;
  }

  const failures = [];
  for (const c of wanted) {
    try { renderOne(c); } catch (e) { console.error(`❌ ${c.slug}: ${e.message}`); failures.push(c.slug); }
  }
  for (const s of specials) {
    const base = COURSES.find(c => c.slug === s.slug);
    try { renderOne({ ...base, ...s }, { outName: s.outName, scriptFile: s.scriptFile }); }
    catch (e) { console.error(`❌ ${s.outName}: ${e.message}`); failures.push(s.outName); }
  }

  console.log('\n' + '='.repeat(60));
  if (failures.length) console.log(`⚠ Done with failures: ${failures.join(', ')}`);
  else console.log('✅ All promos rendered.');
  console.log('Next: node scripts/promo-all.js --upload      (live courses → YouTube, public)');
  console.log('      node scripts/promo-all.js --upload --privacy=unlisted   (review first)');
  console.log('='.repeat(60));
})();
