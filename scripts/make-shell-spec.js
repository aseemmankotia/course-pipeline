#!/usr/bin/env node
/**
 * make-shell-spec.js — emit exports/<slug>/shell-spec.json: everything needed
 * to build the Udemy course shell in ONE consistent browser pass (Udemy has no
 * public course-authoring API). Consumed by the Claude-in-Chrome publish flow.
 *
 * Sourced from generated/<slug>/udemy-listing.md (title, subtitle, compliant
 * description, objectives, requirements, who-for, chapter titles) + the course
 * config (level, price hint) + on-disk artifacts (card, practice-test CSVs).
 *
 * Usage: node scripts/make-shell-spec.js --slug=<slug>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/make-shell-spec.js --slug=<slug>'); process.exit(1); }
const slug = args.slug;

const listingPath = path.join(ROOT, 'generated', slug, 'udemy-listing.md');
if (!fs.existsSync(listingPath)) { console.error(`❌ ${path.relative(ROOT, listingPath)} not found — run assemble first.`); process.exit(1); }
const md = fs.readFileSync(listingPath, 'utf8');
const cfg = (() => {
  for (const f of fs.readdirSync(path.join(ROOT, 'course-configs'))) {
    if (!f.endsWith('.json')) continue;
    try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'course-configs', f), 'utf8')); if (c.slug === slug) return c; } catch {}
  }
  return {};
})();

const blocks = md.split(/\n(?=##\s)/);
const section = name => {
  const nl = name.toLowerCase();
  for (const b of blocks) {
    const h = b.match(/^##\s+(.+)/);
    if (h && h[1].trim().toLowerCase().startsWith(nl)) return b.replace(/^##[^\n]*\n/, '').trim();
  }
  return '';
};
const bullets = txt => txt.split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(l => l && !l.startsWith('<!--'));

// --- description -> HTML paragraphs (strip the reviewer HTML comment) ---
const descRaw = section('Description').replace(/<!--[\s\S]*?-->/g, '').trim();
const paras = descRaw.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
const descriptionHtml = paras.map(p => `<p>${p}</p>`).join('');

// --- level / topic mapping ---
const LEVEL = { beginner: 'Beginner Level', intermediate: 'Intermediate Level', advanced: 'Expert Level', expert: 'Expert Level' };
const level = LEVEL[(cfg.difficulty || '').toLowerCase()] || 'All Levels';
const TOPIC = { 'amazon web services': 'Amazon AWS', aws: 'Amazon AWS', microsoft: 'Microsoft Azure',
  'google cloud': 'Google Cloud', nvidia: 'NVIDIA Certification', comptia: 'CompTIA', isaca: 'ISACA',
  iapp: 'AI Governance', databricks: 'Databricks', salesforce: 'Salesforce', anthropic: 'Claude' };
const vlow = (cfg.exam_vendor || '').toLowerCase();
const topic = Object.entries(TOPIC).find(([k]) => vlow.includes(k))?.[1] || (cfg.exam_code || 'IT Certification');

// --- price tier hint from exam difficulty/cost ---
const cost = cfg.exam_cost_usd || 0;
const priceTier = /expert|advanced/i.test(cfg.difficulty || '') ? '$129.99'
  : cost >= 300 ? '$109.99' : cost >= 150 ? '$109.99' : '$99.99';

// --- chapter titles from the Course structure block ---
const chapters = bullets(section('Course structure').replace(/^\d+\.\s*/gm, '- '))
  .map(l => l.replace(/\s*\(\d+\s*min\).*$/, '').trim());

// --- artifacts on disk ---
const card = `exports/course-images/${slug}-card-notext.png`;
const csvDir = path.join(ROOT, 'exports', 'practice-test-csvs');
const csvs = fs.existsSync(csvDir) ? fs.readdirSync(csvDir).filter(f => f.startsWith(slug + '-test') && f.endsWith('.csv')) : [];
const videosDir = path.join(ROOT, 'exports', slug, 'videos');
const videos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4')).sort() : [];

const titleLine = section('Title').split('\n').map(s => s.trim()).filter(Boolean)[0] || cfg.cert_name || slug;
const subtitle = section('Subtitle').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';

const spec = {
  slug, courseId: null,
  examCode: cfg.exam_code, examVendor: cfg.exam_vendor,
  title: titleLine.slice(0, 60),
  subtitle: subtitle.slice(0, 120),
  descriptionHtml,
  objectives: bullets(section("What you'll learn")).slice(0, 8),
  requirements: bullets(section('Requirements')),
  whoFor: section('Who this course is for').replace(/\s+/g, ' ').trim(),
  category: 'IT & Software', subcategory: 'IT Certifications', level, topic, language: 'English (US)',
  priceTier,
  cardImage: card,
  curriculum: chapters,
  practiceTests: [
    { title: 'Practice Test 1: Full-Length Exam Simulation', durationMin: /advanced|expert/i.test(cfg.difficulty || '') ? 60 : 65, passPercent: 70, randomize: true, csv: csvs.find(c => /test1/.test(c)) || null },
    { title: 'Practice Test 2: Full-Length Exam Simulation', durationMin: /advanced|expert/i.test(cfg.difficulty || '') ? 60 : 65, passPercent: 70, randomize: true, csv: csvs.find(c => /test2/.test(c)) || null },
  ],
  videos,
  complianceChecked: true,
};

const outDir = path.join(ROOT, 'exports', slug);
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'shell-spec.json');
fs.writeFileSync(out, JSON.stringify(spec, null, 2));
console.log(`✅ wrote ${path.relative(ROOT, out)}`);
console.log(`   title(${spec.title.length}): ${spec.title}`);
console.log(`   level=${level} · topic=${topic} · price=${priceTier} · chapters=${chapters.length} · objectives=${spec.objectives.length} · videos=${videos.length} · csvs=${csvs.length}`);
