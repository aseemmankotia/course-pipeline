/**
 * publish.js — Tab 4: YouTube Playlist Publisher + Landing Page Generator
 */

import { getSettings, getCurriculum, getChapterData, saveChapterData } from '../app.js';

// ── Module-level state (survives remounts within the session) ─────────────────
let _chapterFiles = {};   // { [chapterNum]: File }
let _playlistId   = null; // cached playlist ID

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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;">Chapter Upload Queue</h3>
        <button id="reset-statuses-btn"
          style="font-size:.78rem;color:#e94560;background:none;border:none;cursor:pointer;padding:4px 8px;">
          ↺ Reset false statuses
        </button>
      </div>
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

  // Per-chapter file pickers
  container.querySelectorAll('.ch-file-input').forEach(input => {
    input.addEventListener('change', () => {
      const chNum  = Number(input.dataset.ch);
      const file   = input.files[0];
      if (!file) return;
      _chapterFiles[chNum] = file;
      const labelEl   = container.querySelector(`#file-label-${chNum}`);
      const uploadBtn = container.querySelector(`.ch-upload-btn[data-ch="${chNum}"]`);
      if (labelEl)   labelEl.textContent = `✅ ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
      if (uploadBtn) uploadBtn.disabled = false;
    });
  });

  // Per-chapter upload buttons
  container.querySelectorAll('.ch-upload-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chNum = Number(btn.dataset.ch);
      uploadSingleChapter(chNum, container, cur, s);
    });
  });

  // Reset false statuses
  container.querySelector('#reset-statuses-btn')?.addEventListener('click', () =>
    resetAllStatuses(container, cur));
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(s) {
  if (!s.youtubeClientId || !s.youtubeClientSecret || !s.youtubeToken) {
    throw new Error('YouTube credentials incomplete — add Client ID, Client Secret and Refresh Token in ⚙ Settings.');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     s.youtubeClientId,
      client_secret: s.youtubeClientSecret,
      refresh_token: s.youtubeToken,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || res.statusText}`);
  }
  return data.access_token;
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
    const accessToken = await refreshAccessToken(s);

    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

    // Cache playlist ID for this course
    _playlistId = playlistId;
    localStorage.setItem('course_playlist_' + slugify(cur.course_title), playlistId);

    statusEl.innerHTML = `
      <div class="status-bar success">
        ✓ Playlist created!
        <a href="${playlistUrl}" target="_blank" rel="noopener"
          style="color:var(--accent);margin-left:8px;">Open playlist ↗</a>
      </div>`;

    // Enable upload button
    const uploadBtn = container.querySelector('#upload-all-btn');
    uploadBtn.disabled = false;
    uploadBtn.addEventListener('click', () =>
      uploadAllChapters(container, cur, s, playlistId, academy, statusEl));

  } catch (err) {
    statusEl.innerHTML = `<div class="status-bar error">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📋 Create Playlist';
  }
}

// ── Real YouTube upload (resumable) ───────────────────────────────────────────

async function uploadChapter(ch, videoFile, accessToken, playlistId, academy, cur, privacy) {
  const metadata = {
    snippet: {
      title:       `${cur.course_title} | Chapter ${ch.number}: ${ch.title}`,
      description: buildChapterDescription(cur, ch, playlistId || '', academy),
      tags:        buildChapterTags(cur, ch),
      categoryId:  '27', // Education
    },
    status: {
      privacyStatus:             privacy || 'public',
      selfDeclaredMadeForKids:   false,
    },
  };

  // Step 1: Initiate resumable upload session
  const initResp = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method:  'POST',
      headers: {
        'Authorization':          `Bearer ${accessToken}`,
        'Content-Type':           'application/json',
        'X-Upload-Content-Type':  'video/mp4',
        'X-Upload-Content-Length': String(videoFile.size),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResp.ok) {
    const err = await initResp.json().catch(() => ({}));
    throw new Error(`Upload init failed (${initResp.status}): ${err?.error?.message || initResp.statusText}`);
  }

  const uploadUrl = initResp.headers.get('Location');
  if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

  // Step 2: Upload the video file
  console.log(`[publish] Uploading Chapter ${ch.number} — ${(videoFile.size / 1024 / 1024).toFixed(1)}MB`);
  const uploadResp = await fetch(uploadUrl, {
    method:  'PUT',
    headers: {
      'Content-Type':   'video/mp4',
      'Content-Length': String(videoFile.size),
    },
    body: videoFile,
  });

  if (!uploadResp.ok) {
    throw new Error(`Video upload failed (${uploadResp.status}): ${uploadResp.statusText}`);
  }

  const uploadData = await uploadResp.json();
  const videoId = uploadData.id;
  if (!videoId) throw new Error('No video ID returned from YouTube');
  console.log(`[publish] ✅ Chapter ${ch.number} uploaded: ${videoId}`);

  // Step 3: Add to playlist (non-fatal if it fails)
  if (playlistId) {
    await addToPlaylist(videoId, playlistId, ch.number, accessToken);
  }

  return videoId;
}

async function addToPlaylist(videoId, playlistId, position, accessToken) {
  const resp = await fetch(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          position: position - 1,
          resourceId: { kind: 'youtube#video', videoId },
        },
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.warn('[publish] Playlist add failed:', err?.error?.message || resp.statusText);
    // Don't throw — video uploaded successfully even if playlist add fails
  } else {
    console.log(`[publish] Added to playlist at position ${position}`);
  }
}

// ── Upload a single chapter (per-chapter button handler) ──────────────────────

async function uploadSingleChapter(chNum, container, cur, s) {
  const file = _chapterFiles[chNum];
  if (!file) {
    alert('Please select an MP4 file first.');
    return;
  }

  const ch         = cur.chapters.find(c => c.number === chNum);
  const btn        = container.querySelector(`.ch-upload-btn[data-ch="${chNum}"]`);
  const statusEl   = container.querySelector(`#status-${chNum}`);
  const pubStatus  = container.querySelector('#pub-status');
  const academy    = container.querySelector('#pub-academy')?.value.trim() || s.academyName || 'TechNuggets Academy';
  const privacy    = container.querySelector('#pub-privacy')?.value || 'public';
  const playlistId = _playlistId ||
    localStorage.getItem('course_playlist_' + slugify(cur.course_title)) || '';

  if (btn)     { btn.disabled = true; btn.textContent = '⏳ Uploading…'; }
  if (statusEl) statusEl.textContent = 'Uploading…';

  try {
    const accessToken = await refreshAccessToken(s);
    const videoId     = await uploadChapter(ch, file, accessToken, playlistId, academy, cur, privacy);

    // Only mark published after confirmed video ID
    saveChapterData(chNum, {
      ...(getChapterData(chNum) || {}),
      status:  'published',
      videoId,
    });

    if (statusEl) {
      statusEl.innerHTML =
        `✅ Published <a href="https://youtube.com/watch?v=${videoId}" target="_blank"
          style="color:#e94560;font-size:.75rem;margin-left:4px;">▶ View</a>`;
    }
    if (btn) btn.textContent = '✅ Done';

  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ Failed'; statusEl.style.color = '#e94560'; }
    if (btn)      { btn.textContent = '↺ Retry'; btn.disabled = false; }
    if (pubStatus) {
      pubStatus.innerHTML = `<div class="status-bar error">Chapter ${chNum} upload failed: ${esc(err.message)}</div>`;
    }
    console.error(`[publish] Chapter ${chNum} upload error:`, err);
  }
}

// ── Upload all chapters sequentially ─────────────────────────────────────────

async function uploadAllChapters(container, cur, s, playlistId, academy, statusEl) {
  const uploadBtn = container.querySelector('#upload-all-btn');

  const renderedChapters = cur.chapters.filter(ch =>
    ['rendered', 'published'].includes(getChapterData(ch.number)?.status));

  // Check all chapters have files selected
  const missing = renderedChapters.filter(ch => !_chapterFiles[ch.number]);
  if (missing.length > 0) {
    statusEl.innerHTML = `<div class="status-bar warning">
      ⚠ Please select MP4 files for: ${missing.map(c => `Chapter ${c.number}`).join(', ')}
    </div>`;
    return;
  }

  uploadBtn.disabled = true;
  statusEl.innerHTML = `<div class="status-bar info"><span class="loader"></span> Uploading ${renderedChapters.length} chapters…</div>`;

  let published = 0;
  for (const ch of renderedChapters) {
    await uploadSingleChapter(ch.number, container, cur, s);
    published++;
    if (published < renderedChapters.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  statusEl.innerHTML = `<div class="status-bar success">🎉 ${published} chapter${published !== 1 ? 's' : ''} uploaded to YouTube!</div>`;
  uploadBtn.disabled = false;
}

// ── Reset falsely-published statuses ─────────────────────────────────────────

function resetAllStatuses(container, cur) {
  cur.chapters.forEach(ch => {
    const d = getChapterData(ch.number);
    // Reset only chapters marked published without a confirmed videoId
    if (d?.status === 'published' && !d?.videoId) {
      saveChapterData(ch.number, { ...(d || {}), status: 'rendered' });
    }
    const statusEl = container.querySelector(`#status-${ch.number}`);
    if (statusEl) {
      const newStatus = getChapterData(ch.number)?.status || 'not_started';
      const d2 = getChapterData(ch.number);
      const ytLink = d2?.videoId
        ? ` <a href="https://youtube.com/watch?v=${d2.videoId}" target="_blank" style="color:#e94560;font-size:.75rem;">▶ View</a>`
        : '';
      statusEl.innerHTML = ({
        not_started: 'No script',
        generating:  'Generating…',
        ready:       'Script ready',
        rendered:    'Ready to upload',
        published:   '✅ Published',
      }[newStatus] || '—') + ytLink;
      statusEl.style.color = '';
    }
    const btn = container.querySelector(`.ch-upload-btn[data-ch="${ch.number}"]`);
    if (btn && !_chapterFiles[ch.number]) btn.disabled = true;
  });
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
  const d        = getChapterData(ch.number);
  const status   = d?.status || 'not_started';
  const videoId  = d?.videoId || '';
  const hasFile  = !!_chapterFiles[ch.number];
  const fileName = hasFile ? _chapterFiles[ch.number].name : '';
  const fileMB   = hasFile ? ((_chapterFiles[ch.number].size / 1024 / 1024).toFixed(1)) + 'MB' : '';

  const statusLabel = {
    not_started: 'No script',
    generating:  'Generating…',
    ready:       'Script ready',
    rendered:    'Ready to upload',
    published:   '✅ Published',
  }[status] || '—';

  const ytLink = videoId
    ? `<a href="https://youtube.com/watch?v=${videoId}" target="_blank"
         style="color:#e94560;font-size:.75rem;margin-left:4px;">▶ View</a>`
    : '';

  return `
    <div class="upload-row" id="upload-row-${ch.number}"
      style="display:flex;align-items:center;gap:10px;padding:8px 0;
             border-bottom:1px solid var(--border);flex-wrap:wrap;">
      <div class="chapter-num"
        style="width:26px;height:26px;font-size:.75rem;flex-shrink:0;
               border-radius:50%;background:var(--accent);color:#fff;
               display:flex;align-items:center;justify-content:center;font-weight:700;">
        ${ch.number}
      </div>
      <div style="flex:1;min-width:120px;font-size:.85rem;font-weight:500;">
        ${esc(ch.title)}
      </div>

      <label style="cursor:pointer;font-size:.75rem;color:var(--muted);white-space:nowrap;
        padding:4px 9px;border:1px solid var(--border);border-radius:4px;
        background:var(--surface2);display:flex;align-items:center;gap:4px;">
        <input type="file" accept="video/mp4" data-ch="${ch.number}"
          class="ch-file-input" style="display:none;">
        <span id="file-label-${ch.number}">
          ${hasFile ? `✅ ${fileName} (${fileMB})` : '📁 Select MP4'}
        </span>
      </label>

      <button class="btn btn-secondary ch-upload-btn" data-ch="${ch.number}"
        style="font-size:.75rem;padding:4px 10px;white-space:nowrap;"
        ${hasFile ? '' : 'disabled'}>
        ⬆ Upload
      </button>

      <span id="status-${ch.number}"
        style="font-size:.78rem;color:var(--muted);white-space:nowrap;min-width:100px;text-align:right;">
        ${statusLabel}${ytLink}
      </span>
    </div>
  `;
}

// ── Post pinned promo comment with course URL ─────────────────────────────────

export async function postPinnedPromoComment(videoId, accessToken, courseData) {
  const udemyUrl =
    courseData?.udemy_url ||
    localStorage.getItem('courseUdemyUrl') ||
    '';

  if (!udemyUrl) {
    console.log('[publish] No Udemy URL set — skipping pinned comment');
    return null;
  }

  const commentText = [
    `🎓 Enroll in the full course: ${udemyUrl}`,
    '',
    `📚 ${courseData?.course_title || 'Full Course'} — includes practice tests, cheat sheets, and hands-on labs.`,
    '',
    '✅ Use code YOUTUBE for a discount!',
  ].join('\n');

  // Post the comment
  const postResp = await fetch(
    'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: {
            snippet: { textOriginal: commentText },
          },
        },
      }),
    }
  );

  if (!postResp.ok) {
    const err = await postResp.json().catch(() => ({}));
    console.warn('[publish] Promo comment failed:', err?.error?.message || postResp.statusText);
    return null;
  }

  const commentData  = await postResp.json();
  const commentId    = commentData?.snippet?.topLevelComment?.id;
  console.log(`[publish] Promo comment posted: ${commentId}`);

  // Attempt to pin — requires moderator permission; non-fatal if it fails
  if (commentId) {
    try {
      const pinResp = await fetch(
        `https://www.googleapis.com/youtube/v3/comments?part=snippet`,
        {
          method:  'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            id: commentId,
            snippet: { moderationStatus: 'published', pinnedCommentId: commentId },
          }),
        }
      );
      if (pinResp.ok) {
        console.log('[publish] Promo comment pinned');
      } else {
        console.log('[publish] Pin skipped (requires channel moderator access)');
      }
    } catch { /* pin is best-effort */ }
  }

  return commentId;
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
