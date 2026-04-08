/**
 * publish.js — Tab 4: YouTube Playlist Publisher + Landing Page Generator
 */

import { getSettings, getCurriculum, getChapterData, saveChapterData } from '../app.js';

// ── Public render ─────────────────────────────────────────────────────────────

export function renderPublish(container) {
  mountPublish(container);
  window.addEventListener('curriculum-updated', () => mountPublish(container));
  window.addEventListener('chapter-updated',    () => mountPublish(container));
}

function mountPublish(container) {
  const cur = getCurriculum();

  if (!cur) {
    container.innerHTML = `
      <div class="card">
        <h2>📤 Publish</h2>
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>Generate a curriculum and render chapters first.</p>
        </div>
      </div>`;
    return;
  }

  const s = getSettings();
  const renderedChapters = cur.chapters.filter(ch =>
    ['rendered','published'].includes(getChapterData(ch.number)?.status));

  container.innerHTML = `
    <div class="card">
      <h2>📤 Publish to YouTube</h2>

      ${!s.youtubeToken ? `
        <div class="status-bar warning" style="margin-bottom:16px;">
          ⚠ No YouTube token — authenticate first or paste a token in ⚙ Settings.
        </div>` : `
        <div class="status-bar success" style="margin-bottom:16px;">
          ✓ YouTube authenticated
        </div>`}

      <div class="form-row">
        <div class="form-group">
          <label>Playlist Privacy</label>
          <select id="pub-privacy">
            <option>public</option>
            <option>unlisted</option>
            <option>private</option>
          </select>
        </div>
        <div class="form-group">
          <label>Academy Name</label>
          <input type="text" id="pub-academy" value="${esc(s.academyName || 'TechNuggets Academy')}" />
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="create-playlist-btn"
          ${!s.youtubeToken || !renderedChapters.length ? 'disabled' : ''}>
          📋 Create Playlist
        </button>
        <button class="btn btn-secondary" id="upload-all-btn" disabled>
          ⬆ Upload All Chapters
        </button>
        <button class="btn btn-outline" id="gen-landing-btn">
          🌐 Generate Landing Page
        </button>
      </div>

      <div id="pub-status"></div>
    </div>

    <div class="card">
      <h3>Chapter Upload Queue</h3>
      <div class="upload-queue">
        ${cur.chapters.map(ch => uploadRowHtml(ch)).join('')}
      </div>
    </div>

    <div id="landing-preview"></div>
  `;

  const statusEl = container.querySelector('#pub-status');

  container.querySelector('#create-playlist-btn').addEventListener('click', () =>
    createPlaylist(container, cur, s, statusEl));

  container.querySelector('#gen-landing-btn').addEventListener('click', () =>
    generateLandingPage(container, cur, s));
}

// ── Playlist creation ─────────────────────────────────────────────────────────

async function createPlaylist(container, cur, s, statusEl) {
  const privacy = container.querySelector('#pub-privacy').value;
  const academy = container.querySelector('#pub-academy').value.trim();
  const btn     = container.querySelector('#create-playlist-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span><span>Creating playlist…</span>';
  statusEl.innerHTML = `<div class="status-bar info"><span class="loader"></span> Creating YouTube playlist…</div>`;

  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.youtubeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: cur.course_title,
            description: [
              cur.course_description || '',
              '',
              `Course by ${academy}`,
              '',
              'Skills: ' + (cur.skills_learned || []).join(', '),
            ].join('\n'),
            tags: buildCourseTags(cur),
          },
          status: { privacyStatus: privacy },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`YouTube API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }

    const playlist = await res.json();
    const playlistId  = playlist.id;
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    statusEl.innerHTML = `
      <div class="status-bar success">
        ✓ Playlist created!
        <a href="${playlistUrl}" target="_blank" rel="noopener"
          style="color:var(--accent);margin-left:8px;">Open playlist ↗</a>
      </div>`;

    // Enable upload button, store playlist ID
    const uploadBtn = container.querySelector('#upload-all-btn');
    uploadBtn.disabled = false;
    uploadBtn.dataset.playlistId = playlistId;
    uploadBtn.addEventListener('click', () =>
      uploadAllChapters(container, cur, s, playlistId, academy, statusEl));

  } catch (err) {
    statusEl.innerHTML = `<div class="status-bar error">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📋 Create Playlist';
  }
}

// ── Upload chapters ───────────────────────────────────────────────────────────

async function uploadAllChapters(container, cur, s, playlistId, academy, statusEl) {
  const uploadBtn = container.querySelector('#upload-all-btn');
  uploadBtn.disabled = true;

  const renderedChapters = cur.chapters.filter(ch =>
    ['rendered','published'].includes(getChapterData(ch.number)?.status));

  statusEl.innerHTML = `
    <div class="status-bar info">
      <span class="loader"></span> Uploading ${renderedChapters.length} chapters…
    </div>`;

  let published = 0;

  for (const ch of renderedChapters) {
    const rowEl = container.querySelector(`#upload-row-${ch.number}`);
    if (rowEl) {
      rowEl.querySelector('.upload-status').innerHTML =
        `<span class="loader" style="width:12px;height:12px;border-width:2px;"></span> Uploading…`;
    }

    try {
      const title = `${cur.course_title} | Chapter ${ch.number}: ${ch.title}`;
      const desc  = buildChapterDescription(cur, ch, playlistId, academy);

      // In a real implementation this would use the YouTube resumable upload API.
      // Since file access requires the desktop app / Electron context, we show
      // a status indicating the video needs to be uploaded manually with these details.
      const uploadDetails = { title, description: desc, playlistId, tags: buildChapterTags(cur, ch) };

      saveChapterData(ch.number, {
        ...(getChapterData(ch.number) || {}),
        status: 'published',
        uploadDetails,
      });

      if (rowEl) {
        rowEl.querySelector('.upload-status').innerHTML =
          `<span style="color:var(--accent);">📤 Details ready</span>`;
        rowEl.querySelector('.upload-progress-bar').style.width = '100%';
      }

      published++;
    } catch (err) {
      if (rowEl) {
        rowEl.querySelector('.upload-status').innerHTML =
          `<span style="color:#dc2626;">✗ Error</span>`;
      }
    }
  }

  statusEl.innerHTML = `
    <div class="status-bar success">
      🎉 ${published} chapter${published !== 1 ? 's' : ''} marked as published.
      Upload each <code>chapter-N-*.mp4</code> to the playlist with the generated titles &amp; descriptions.
    </div>`;
}

// ── Landing page generator ────────────────────────────────────────────────────

function generateLandingPage(container, cur, s) {
  const academy = container.querySelector('#pub-academy')?.value.trim() || s.academyName || 'TechNuggets Academy';
  const slug    = slugify(cur.course_title);
  const html    = buildLandingPageHtml(cur, academy);
  const blob    = new Blob([html], { type: 'text/html' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url;
  a.download = `${slug}.html`;
  a.click();
  URL.revokeObjectURL(url);

  const previewEl = container.querySelector('#landing-preview');
  previewEl.innerHTML = `
    <div class="card">
      <div class="status-bar success">
        ✓ Downloaded <strong>${slug}.html</strong>.
        Deploy to <code>docs/courses/${slug}/index.html</code> for GitHub Pages.
      </div>
    </div>`;
}

function buildLandingPageHtml(cur, academy) {
  const chapterItems = cur.chapters.map(ch => `
    <li style="padding:12px 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
      <span style="width:28px;height:28px;border-radius:50%;background:#e94560;color:#fff;
        display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;
        flex-shrink:0;">${ch.number}</span>
      <div>
        <div style="font-weight:600;color:#1a1a2e;">${esc(ch.title)}</div>
        <div style="font-size:.85rem;color:#6b7280;">${ch.subtitle || ''} · ${ch.duration_mins || 15} min</div>
      </div>
    </li>`).join('');

  const skillTags = (cur.skills_learned || []).map(s =>
    `<span style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;
      padding:4px 12px;font-size:.8rem;font-weight:600;color:#374151;">${esc(s)}</span>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cur.course_title)} — ${esc(academy)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#f9fafb;color:#2d2d2d;}
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:64px 24px;}
.hero-inner{max-width:780px;margin:0 auto;}
.badge{display:inline-block;background:rgba(233,69,96,.2);color:#e94560;border:1px solid rgba(233,69,96,.3);
  border-radius:20px;padding:4px 14px;font-size:.8rem;font-weight:600;margin-bottom:16px;}
h1{font-family:'Poppins',sans-serif;font-weight:800;font-size:2.4rem;line-height:1.2;margin-bottom:10px;}
.subtitle{font-size:1.1rem;opacity:.75;margin-bottom:24px;}
.meta-row{display:flex;gap:16px;flex-wrap:wrap;font-size:.875rem;opacity:.7;}
.enroll-btn{display:inline-block;margin-top:24px;background:#e94560;color:#fff;border-radius:8px;
  padding:13px 28px;font-weight:700;font-family:'Poppins',sans-serif;text-decoration:none;
  transition:background .15s;}
.enroll-btn:hover{background:#d63651;}
.section{max-width:780px;margin:0 auto;padding:48px 24px;}
.section h2{font-family:'Poppins',sans-serif;font-weight:700;font-size:1.4rem;color:#1a1a2e;margin-bottom:20px;}
.chapter-list{list-style:none;}
.skills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.instructor{display:flex;align-items:center;gap:16px;background:#fff;border:1px solid #e5e7eb;
  border-radius:12px;padding:24px;margin-top:20px;}
.instructor-avatar{width:56px;height:56px;border-radius:50%;background:#e94560;color:#fff;
  display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;
  font-weight:700;font-size:1.2rem;flex-shrink:0;}
footer{text-align:center;padding:32px 24px;color:#9ca3af;font-size:.85rem;
  border-top:1px solid #e5e7eb;margin-top:32px;}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-inner">
    <div class="badge">${esc(cur.difficulty || 'Beginner')} Course</div>
    <h1>${esc(cur.course_title)}</h1>
    <p class="subtitle">${esc(cur.course_subtitle || '')}</p>
    <div class="meta-row">
      <span>⏱ ${cur.estimated_hours || '?'}h total</span>
      <span>📚 ${cur.chapters.length} chapters</span>
      <span>🎓 ${esc(academy)}</span>
    </div>
    <a href="#" class="enroll-btn">▶ Watch on YouTube</a>
  </div>
</div>

<div class="section">
  <h2>About This Course</h2>
  <p style="color:#6b7280;line-height:1.7;">${esc(cur.course_description || '').replace(/\n/g,'<br>')}</p>

  <h2 style="margin-top:36px;">What You'll Learn</h2>
  <div class="skills">${skillTags}</div>

  ${cur.prerequisites?.length ? `
  <h2 style="margin-top:36px;">Prerequisites</h2>
  <ul style="color:#6b7280;font-size:.9rem;line-height:2;padding-left:18px;">
    ${cur.prerequisites.map(p => `<li>${esc(p)}</li>`).join('')}
  </ul>` : ''}

  <h2 style="margin-top:36px;">Course Chapters</h2>
  <ul class="chapter-list">${chapterItems}</ul>

  <h2 style="margin-top:36px;">Your Instructor</h2>
  <div class="instructor">
    <div class="instructor-avatar">A</div>
    <div>
      <div style="font-family:'Poppins',sans-serif;font-weight:700;color:#1a1a2e;font-size:1rem;">Aseem Mankotia</div>
      <div style="font-size:.875rem;color:#6b7280;">${esc(academy)} · Tech &amp; AI Content Creator</div>
      <div style="font-size:.825rem;color:#9ca3af;margin-top:4px;">
        Teaching complex tech concepts in plain English. Subscribe for weekly tutorials.
      </div>
    </div>
  </div>
</div>

<footer>
  © ${new Date().getFullYear()} ${esc(academy)} · Made with TechNuggets Course Pipeline
</footer>
</body>
</html>`;
}

// ── Upload row HTML ───────────────────────────────────────────────────────────

function uploadRowHtml(ch) {
  const d      = getChapterData(ch.number);
  const status = d?.status || 'not_started';
  const canUpload = status === 'rendered' || status === 'published';
  const statusLabel = {
    not_started: 'No script', generating: 'Generating…',
    ready: 'Script ready', rendered: 'Ready to upload', published: 'Published ✓',
  }[status] || '—';

  return `
    <div class="upload-row" id="upload-row-${ch.number}">
      <div class="chapter-num" style="width:28px;height:28px;font-size:.75rem;flex-shrink:0;">${ch.number}</div>
      <div class="title">${esc(ch.title)}</div>
      <span class="upload-status" style="font-size:.8rem;color:var(--muted);white-space:nowrap;">${statusLabel}</span>
      <div style="width:80px;">
        <div class="upload-progress">
          <div class="upload-progress-bar" style="width:${status === 'published' ? '100' : '0'}%;"></div>
        </div>
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildChapterDescription(cur, ch, playlistId, academy) {
  return [
    `${cur.course_title} | Chapter ${ch.number}: ${ch.title}`,
    '',
    ch.subtitle || '',
    '',
    '📚 Full course playlist: https://www.youtube.com/playlist?list=' + playlistId,
    '',
    'In this chapter:',
    ...(ch.concepts || []).map(c => `• ${c}`),
    '',
    ch.hands_on ? `🛠 Hands-on: ${ch.hands_on}` : '',
    ch.key_takeaway ? `💡 Key takeaway: ${ch.key_takeaway}` : '',
    '',
    `🎓 ${academy} — subscribe for weekly tech tutorials`,
    '',
    'Tags: ' + buildChapterTags(cur, ch).join(', '),
  ].filter(Boolean).join('\n');
}

function buildChapterTags(cur, ch) {
  return [
    ...(ch.concepts || []).slice(0, 5),
    cur.topic || cur.course_title,
    'tutorial', 'beginner', 'TechNuggets Academy',
  ].slice(0, 15);
}

function buildCourseTags(cur) {
  return [
    cur.topic || cur.course_title,
    ...(cur.skills_learned || []).slice(0, 5),
    'course', 'tutorial', 'TechNuggets Academy',
  ].slice(0, 15);
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
