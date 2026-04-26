#!/usr/bin/env node
/**
 * archive.js — Course archive builder
 *
 * Usage:
 *   node archive.js                       # archive current course
 *   node archive.js --course-id=12345     # archive specific course
 *   npm run archive
 *
 * Requires course-data-export.json in project root.
 * Generate it from the app: Settings → Export Course Data for Archive
 */

// ── Load .env ──────────────────────────────────────────────────────────────────
;(function loadEnv() {
  try {
    require('fs').readFileSync('.env', 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=\s][^=]*)=(.*)/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch {}
})();

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Config ─────────────────────────────────────────────────────────────────────
const RENDER_DIR  = path.join(__dirname, 'render', 'chapters');
const EXPORTS_DIR = path.join(__dirname, 'exports');

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

function formatDate(date = new Date()) {
  return date.toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0];
}

function formatDateReadable(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fileSize(bytes) {
  if (bytes < 1024)            return `${bytes}B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3)      return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

// ── Load course data ───────────────────────────────────────────────────────────

function loadCourseData(courseIdArg) {
  const exportFile = path.join(__dirname, 'course-data-export.json');

  if (!fs.existsSync(exportFile)) {
    console.error('❌ course-data-export.json not found.');
    console.error('   1. Open the app: http://localhost:8080');
    console.error('   2. Go to Settings tab');
    console.error('   3. Click "Export Course Data for Archive"');
    console.error('   4. Move the downloaded file to the project root');
    console.error('   5. Re-run: node archive.js');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

  if (courseIdArg && String(data.id) !== String(courseIdArg)) {
    console.error(`❌ Course ID mismatch. Found: ${data.id}, requested: ${courseIdArg}`);
    process.exit(1);
  }

  return data;
}

// ── Content generators ─────────────────────────────────────────────────────────

function generateArchiveReadme(courseData, timestamp) {
  const { course_title, course_subtitle, difficulty, chapters = [], id } = courseData;
  return `# ${course_title}
> ${course_subtitle || ''}

**Archived:** ${formatDateReadable()}
**Course ID:** ${id || 'N/A'}
**Difficulty:** ${difficulty || 'N/A'}
**Chapters:** ${chapters.length}

## 📁 Archive Contents

\`\`\`
├── README.md
├── metadata/
│   ├── curriculum.json          # Full course structure
│   └── manifest.json            # Archive manifest
├── videos/                      # Rendered chapter MP4s
├── scripts/                     # Chapter scripts (.txt)
├── slides/                      # Slide PNGs per chapter
├── materials/
│   ├── practice-questions/
│   ├── flashcards/
│   ├── cheat-sheets/
│   ├── exam-prep/
│   └── labs/                    # Code examples + READMEs
├── practice-tests/              # Tests + answer keys
├── render-configs/              # JSON inputs for re-rendering
└── thumbnails/
\`\`\`

## 📺 Chapters

${chapters.map(ch => `${ch.number}. **${ch.title}**  \n   ${ch.subtitle || ''}`).join('\n')}

## 🔄 Re-rendering a Chapter

\`\`\`bash
cp render-configs/chapter-01-render-input.json \\
   ~/course-pipeline/render/chapters/chapter-01/course-render-input.json
cd ~/course-pipeline && npm run render:1
\`\`\`

---
*Archived with TechNuggets Academy Course Pipeline*
*Archive date: ${timestamp}*
`;
}

function generateLabReadme(chapter, examples) {
  return `# Lab: ${chapter.title}

## Files
${examples.map(ex => `- \`${ex.filename}\` — ${ex.title || ex.filename}`).join('\n')}

## Expected Output
${examples[0]?.expected_output || 'See code files'}

## Challenge
${examples[0]?.challenge || 'Modify the code to extend the functionality.'}
`;
}

function generateAnswerKey(test, testNum) {
  if (typeof test === 'string') {
    return `# Practice Test ${testNum} — Answer Key\n\n${test}`;
  }
  const questions = test.questions || [];
  let md = `# Practice Test ${testNum} — Answer Key\n\n`;
  md += `| Q | Answer | Domain | Difficulty |\n|---|--------|--------|------------|\n`;
  questions.forEach((q, i) => {
    md += `| ${i + 1} | ${q.correct || q.answer || '-'} | ${q.domain || '-'} | ${q.difficulty || '-'} |\n`;
  });
  return md;
}

// ── Main archive builder ───────────────────────────────────────────────────────

async function createArchive(courseData) {
  let archiver;
  try { archiver = require('archiver'); }
  catch {
    console.error('❌ archiver package not installed. Run: npm install archiver');
    process.exit(1);
  }

  const {
    course_title,
    course_subtitle,
    difficulty,
    chapters = [],
    scripts  = {},
    materials = {},
    practice_tests = [],
  } = courseData;

  const timestamp   = formatDate();
  const slug        = slugify(course_title);
  const archiveName = `${timestamp}_${slug}`;
  const zipPath     = path.join(EXPORTS_DIR, `${archiveName}.zip`);

  if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  console.log('\n📦 Course Archive Builder');
  console.log('='.repeat(52));
  console.log(`Course:   ${course_title}`);
  console.log(`Chapters: ${chapters.length}`);
  console.log(`Output:   ${zipPath}`);
  console.log('='.repeat(52));

  const output  = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);

  let totalFiles = 0;
  let totalSize  = 0;
  const manifest = {
    archive_created:        formatDateReadable(),
    archive_name:           archiveName,
    course_title,
    course_subtitle,
    difficulty,
    total_chapters:         chapters.length,
    contents:               {},
  };

  function add(content, name) {
    archive.append(content, { name: `${archiveName}/${name}` });
    totalFiles++;
  }

  function addFile(filePath, name) {
    const stats = fs.statSync(filePath);
    archive.file(filePath, { name: `${archiveName}/${name}` });
    totalFiles++;
    return stats.size;
  }

  // ── 1. Metadata ──────────────────────────────────────────────────────────────
  console.log('\n📋 Course metadata…');
  add(JSON.stringify(courseData, null, 2), 'metadata/curriculum.json');
  add(generateArchiveReadme(courseData, timestamp), 'README.md');
  manifest.contents.metadata = ['curriculum.json', 'README.md'];
  console.log('   ✓ curriculum.json + README.md');

  // ── 2. Chapter scripts ────────────────────────────────────────────────────────
  console.log('\n📝 Chapter scripts…');
  manifest.contents.scripts = [];
  for (const ch of chapters) {
    const n          = ch.number;
    const padded     = String(n).padStart(2, '0');
    const script     = scripts[n] || scripts[String(n)];
    if (script) {
      const fname = `chapter-${padded}-script.txt`;
      add(script, `scripts/${fname}`);
      manifest.contents.scripts.push(fname);
      console.log(`   ✓ ${fname}`);
    } else {
      console.log(`   ⚠ Chapter ${n}: no script`);
    }
  }

  // ── 3. Rendered videos ────────────────────────────────────────────────────────
  console.log('\n🎬 Rendered videos…');
  manifest.contents.videos = [];
  for (const ch of chapters) {
    const n      = ch.number;
    const padded = String(n).padStart(2, '0');
    const candidates = [
      path.join(RENDER_DIR, `chapter-${padded}`, `chapter-${padded}-final.mp4`),
      path.join(__dirname, `chapter-${padded}-final.mp4`),
      path.join(os.homedir(), 'Downloads', `chapter-${padded}-final.mp4`),
    ];
    let found = false;
    for (const vp of candidates) {
      if (fs.existsSync(vp)) {
        const fname = `chapter-${padded}-${slugify(ch.title)}.mp4`;
        const sz    = addFile(vp, `videos/${fname}`);
        totalSize  += sz;
        manifest.contents.videos.push({ file: fname, size: fileSize(sz), chapter: n, title: ch.title });
        console.log(`   ✓ ${fname} (${fileSize(sz)})`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`   ⚠ Chapter ${n}: video not found`);
  }

  // ── 4. Slides ────────────────────────────────────────────────────────────────
  console.log('\n🖼  Slide PNGs…');
  manifest.contents.slides = [];
  for (const ch of chapters) {
    const padded   = String(ch.number).padStart(2, '0');
    const slideDir = path.join(RENDER_DIR, `chapter-${padded}`, 'slides');
    if (fs.existsSync(slideDir)) {
      const pngs = fs.readdirSync(slideDir).filter(f => f.endsWith('.png'));
      for (const f of pngs) addFile(path.join(slideDir, f), `slides/chapter-${padded}/${f}`);
      manifest.contents.slides.push({ chapter: ch.number, count: pngs.length });
      console.log(`   ✓ Chapter ${ch.number}: ${pngs.length} slides`);
    }
  }

  // ── 5. Materials ─────────────────────────────────────────────────────────────
  console.log('\n📚 Materials…');
  manifest.contents.materials = {};
  const matTypes = [
    { key: 'questions',     folder: 'practice-questions', suffix: 'questions.md'      },
    { key: 'flashcards',    folder: 'flashcards',         suffix: 'flashcards.md'     },
    { key: 'cheatsheet',    folder: 'cheat-sheets',       suffix: 'cheatsheet.md'     },
    { key: 'exam_questions',folder: 'exam-prep',          suffix: 'exam-questions.md' },
  ];

  for (const ch of chapters) {
    const n      = ch.number;
    const padded = String(n).padStart(2, '0');
    let matAdded = false;

    for (const { key, folder, suffix } of matTypes) {
      const content = materials[`ch${n}_${key}`] || materials[`ch${n}_${key}`];
      if (content) {
        const fname = `chapter-${padded}-${suffix}`;
        add(content, `materials/${folder}/${fname}`);
        if (!manifest.contents.materials[folder]) manifest.contents.materials[folder] = [];
        manifest.contents.materials[folder].push(fname);
        matAdded = true;
      }
    }

    // Code examples / labs
    const codeRaw = materials[`ch${n}_code`];
    if (codeRaw) {
      try {
        const examples = typeof codeRaw === 'string' ? JSON.parse(codeRaw) : codeRaw;
        const labSlug  = `lab-${padded}-${slugify(ch.title)}`;
        for (const ex of examples) {
          if (ex.filename && ex.code != null) {
            add(ex.code, `materials/labs/${labSlug}/${ex.filename}`);
          }
        }
        add(generateLabReadme(ch, examples), `materials/labs/${labSlug}/README.md`);
        matAdded = true;
      } catch { console.warn(`   ⚠ Chapter ${n}: code parse error`); }
    }

    if (matAdded) console.log(`   ✓ Chapter ${n}: materials added`);
  }

  // ── 6. Practice tests ─────────────────────────────────────────────────────────
  console.log('\n📝 Practice tests…');
  manifest.contents.practice_tests = [];
  for (let i = 0; i < practice_tests.length; i++) {
    const test = practice_tests[i];
    if (!test) continue;
    const n = i + 1;
    const body = typeof test === 'string' ? test : JSON.stringify(test, null, 2);
    add(body,                       `practice-tests/practice-test-${n}.md`);
    add(generateAnswerKey(test, n), `practice-tests/answer-key-${n}.md`);
    manifest.contents.practice_tests.push(`practice-test-${n}.md`);
    console.log(`   ✓ Practice test ${n} + answer key`);
  }

  // ── 7. Render configs ─────────────────────────────────────────────────────────
  console.log('\n⚙️  Render configs…');
  manifest.contents.render_configs = [];
  for (const ch of chapters) {
    const padded = String(ch.number).padStart(2, '0');
    const cfgPath = path.join(RENDER_DIR, `chapter-${padded}`, 'course-render-input.json');
    if (fs.existsSync(cfgPath)) {
      addFile(cfgPath, `render-configs/chapter-${padded}-render-input.json`);
      manifest.contents.render_configs.push(`chapter-${padded}-render-input.json`);
    }
  }
  console.log(`   ✓ ${manifest.contents.render_configs.length} render configs`);

  // ── 8. Thumbnails ─────────────────────────────────────────────────────────────
  console.log('\n🖼  Thumbnails…');
  manifest.contents.thumbnails = [];
  const thumbDir = path.join(__dirname, 'thumbnails');
  if (fs.existsSync(thumbDir)) {
    const thumbs = fs.readdirSync(thumbDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    for (const t of thumbs) { addFile(path.join(thumbDir, t), `thumbnails/${t}`); manifest.contents.thumbnails.push(t); }
    console.log(`   ✓ ${thumbs.length} thumbnails`);
  }

  // ── 9. Promo videos ──────────────────────────────────────────────────────────
  console.log('\n🎬 Promo videos…');
  manifest.contents.promo = [];
  const promoDir   = path.join(__dirname, 'render', 'promo');
  const promoFiles = ['welcome-promo.mp4', 'welcome-promo-short.mp4', 'promo-script.txt'];
  for (const file of promoFiles) {
    const filePath = path.join(promoDir, file);
    if (fs.existsSync(filePath)) {
      addFile(filePath, `promo/${file}`);
      manifest.contents.promo.push(file);
      console.log(`   ✓ promo/${file}`);
    }
  }
  if (!manifest.contents.promo.length) console.log('   (no promo files yet — run: npm run promo)');

  // ── 11. Manifest ─────────────────────────────────────────────────────────────
  manifest.total_files           = totalFiles;
  manifest.total_video_size      = fileSize(totalSize);
  manifest.chapters_with_video   = manifest.contents.videos?.length || 0;
  manifest.chapters_without_video = chapters.length - (manifest.contents.videos?.length || 0);
  add(JSON.stringify(manifest, null, 2), 'metadata/manifest.json');

  // ── Finalize ──────────────────────────────────────────────────────────────────
  archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const zipSz = fileSize(archive.pointer());
      console.log('\n' + '='.repeat(52));
      console.log('✅ Archive complete!');
      console.log('='.repeat(52));
      console.log(`📦 File:    ${zipPath}`);
      console.log(`📊 Size:    ${zipSz}`);
      console.log(`📁 Files:   ${totalFiles}`);
      console.log(`🎬 Videos:  ${manifest.chapters_with_video}/${chapters.length} chapters`);
      if (manifest.chapters_without_video > 0) {
        console.log(`⚠️  Missing: ${manifest.chapters_without_video} videos`);
      }
      console.log('='.repeat(52));
      console.log('\nTo extract:');
      console.log(`  unzip "${zipPath}" -d ~/Desktop/`);
      console.log('\nTo list contents:');
      console.log(`  unzip -l "${zipPath}"`);
      resolve({ zipPath, zipSz, totalFiles, manifest });
    });
    output.on('error', reject);
    archive.on('error', reject);
  });
}

// ── Entry point ────────────────────────────────────────────────────────────────

async function main() {
  const args        = process.argv.slice(2);
  const courseIdArg = args.find(a => a.startsWith('--course-id='))?.split('=')[1];

  const courseData = loadCourseData(courseIdArg);
  console.log(`\n📚 Archiving: ${courseData.course_title}`);
  console.log(`   ${courseData.chapters?.length || 0} chapters`);

  try {
    await createArchive(courseData);
  } catch (e) {
    console.error('\n❌ Archive failed:', e.message);
    process.exit(1);
  }
}

main();
