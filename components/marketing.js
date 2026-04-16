/**
 * marketing.js — Tab 5: 📈 Marketing
 * Course Thumbnail Generator, Title & SEO, Description Generator,
 * Community & Engagement, Launch Strategy.
 */

import { getSettings, getCurriculum } from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function eh(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function lget(key) { return localStorage.getItem(key) || ''; }
function lset(key, v) { localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v)); }
function lgetJSON(key) { try { return JSON.parse(lget(key)); } catch { return null; } }

async function callClaude(apiKey, { system, user, maxTokens = 1800 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || res.statusText);
  }
  const d = await res.json();
  return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

function parseJSON(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]+?)```/) || text.match(/(\[[\s\S]+\]|\{[\s\S]+\})/);
  if (!m) throw new Error('No JSON found in Claude response.');
  return JSON.parse(m[1]);
}

// ── Storage keys ───────────────────────────────────────────────────────────────

const MK = {
  thumbConcepts:    'mkt_thumb_concepts',
  thumbChapter:     'mkt_thumb_chapter',
  playlistTitles:   'mkt_playlist_titles',
  chapterTitles:    'mkt_chapter_titles',
  seoKeywords:      'mkt_seo_keywords',
  playlistDesc:     'mkt_playlist_desc',
  chapterDescs:     'mkt_chapter_descs',
  launchComment:    'mkt_launch_comment',
  chapterComments:  'mkt_chapter_comments',
  tweet:            'mkt_tweet',
  checklist:        'mkt_checklist',
  redditPosts:      'mkt_reddit_posts',
};

// ── Badge helper ───────────────────────────────────────────────────────────────

function setBadge(el, state) {
  if (!el) return;
  const map = {
    ready:      { text: '✅ Ready',        color: '#16a34a' },
    generating: { text: '🔄 Generating…', color: '#d97706' },
    none:       { text: '⬜ Not generated', color: '#9ca3af' },
  };
  const s = map[state] || map.none;
  el.textContent = s.text;
  el.style.color  = s.color;
}

// ── Collapsible toggle ─────────────────────────────────────────────────────────

function wireCollapse(container, id) {
  const hdr     = container.querySelector(`#mkt-${id}-hdr`);
  const body    = container.querySelector(`#mkt-${id}-body`);
  const chevron = container.querySelector(`#mkt-${id}-chev`);
  if (!hdr || !body) return;
  hdr.style.cursor = 'pointer';
  let open = true;
  hdr.addEventListener('click', () => {
    open = !open;
    body.style.display    = open ? '' : 'none';
    if (chevron) chevron.textContent = open ? '▾' : '▸';
  });
}

// ── Textarea copy ─────────────────────────────────────────────────────────────

function wireCopy(container, btnId, targetId) {
  const btn = container.querySelector(`#${btnId}`);
  const ta  = container.querySelector(`#${targetId}`);
  if (!btn || !ta) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(ta.value).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
}

// ── Section HTML builder ───────────────────────────────────────────────────────

function sectionHtml(id, icon, title, badgeId, bodyHtml) {
  return `
    <div class="mkt-section">
      <div class="mkt-section-hdr" id="mkt-${id}-hdr">
        <span class="mkt-section-icon">${icon}</span>
        <span class="mkt-section-title">${title}</span>
        <span class="mkt-badge" id="${badgeId}">⬜ Not generated</span>
        <span class="mkt-chev" id="mkt-${id}-chev">▾</span>
      </div>
      <div class="mkt-section-body" id="mkt-${id}-body">
        ${bodyHtml}
      </div>
    </div>`;
}

// ── Main render ────────────────────────────────────────────────────────────────

export function renderMarketing(container) {
  mount(container);
  window.addEventListener('curriculum-updated', () => mount(container));

  container._setVideoData = () => mount(container);
}

function mount(container) {
  const cur = getCurriculum();

  if (!cur) {
    container.innerHTML = `
      <div class="card">
        <h2>📈 Marketing</h2>
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>Generate a curriculum first, then come back here to build all your marketing assets.</p>
        </div>
      </div>`;
    return;
  }

  const chapterOptions = cur.chapters.map(ch =>
    `<option value="${ch.number}">Ch ${ch.number}: ${esc(ch.title)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="mkt-header">
        <h2>📈 Marketing — ${esc(cur.course_title)}</h2>
        <p class="mkt-sub">${cur.chapters.length} chapters &nbsp;·&nbsp; ${esc(cur.category || 'Online Course')}</p>
      </div>

      <div class="btn-group" style="margin-bottom:24px;">
        <button class="btn btn-primary" id="mkt-gen-all">🚀 Generate All Marketing Assets</button>
      </div>

      <div id="mkt-status" style="margin-bottom:16px;"></div>

      <!-- ── 1. Thumbnail Generator ─────────────────────────────────────────── -->
      ${sectionHtml('thumb', '🖼️', 'Course Thumbnail Generator', 'mkt-thumb-badge', `
        <div class="form-row">
          <div class="form-group">
            <label>Style</label>
            <select id="mkt-thumb-style">
              <option>Bold text + dark background</option>
              <option>Light gradient + accent colour</option>
              <option>Split layout (instructor + text)</option>
              <option>Minimal flat design</option>
            </select>
          </div>
          <div class="form-group">
            <label>Per-chapter focus</label>
            <select id="mkt-thumb-chapter">${chapterOptions}</select>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" id="mkt-thumb-playlist-btn">Generate Playlist Template</button>
          <button class="btn btn-secondary" id="mkt-thumb-chapter-btn">Generate Chapter Concept</button>
        </div>
        <div id="mkt-thumb-out" class="mkt-output-wrap" style="display:none;"></div>
      `)}

      <!-- ── 2. Title & SEO ─────────────────────────────────────────────────── -->
      ${sectionHtml('seo', '🔍', 'Title & SEO', 'mkt-seo-badge', `
        <div class="form-row single">
          <div class="form-group">
            <label>Per-chapter title formula override (optional)</label>
            <input type="text" id="mkt-seo-formula" placeholder="e.g. [Chapter N] {topic} — {outcome} | Course Name" />
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" id="mkt-seo-titles-btn">Generate Playlist Titles (A/B)</button>
          <button class="btn btn-secondary" id="mkt-seo-chapter-btn">Generate All Chapter Titles</button>
          <button class="btn btn-secondary" id="mkt-seo-kw-btn">Research SEO Keywords</button>
        </div>
        <div id="mkt-seo-out" class="mkt-output-wrap" style="display:none;"></div>
      `)}

      <!-- ── 3. Description Generator ──────────────────────────────────────── -->
      ${sectionHtml('desc', '📝', 'Description Generator', 'mkt-desc-badge', `
        <div class="form-row">
          <div class="form-group">
            <label>Instructor name</label>
            <input type="text" id="mkt-desc-instructor" placeholder="Aseem" />
          </div>
          <div class="form-group">
            <label>CTA link (course URL / landing page)</label>
            <input type="text" id="mkt-desc-link" placeholder="https://…" />
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" id="mkt-desc-playlist-btn">Generate Playlist Description</button>
          <button class="btn btn-secondary" id="mkt-desc-chapters-btn">Generate All Chapter Descriptions</button>
        </div>
        <div id="mkt-desc-out" class="mkt-output-wrap" style="display:none;"></div>
      `)}

      <!-- ── 4. Community & Engagement ────────────────────────────────────── -->
      ${sectionHtml('engage', '💬', 'Community & Engagement', 'mkt-engage-badge', `
        <div class="btn-group">
          <button class="btn btn-secondary" id="mkt-engage-launch-btn">Pinned Launch Comment</button>
          <button class="btn btn-secondary" id="mkt-engage-comments-btn">Per-Chapter Pinned Comments</button>
          <button class="btn btn-secondary" id="mkt-engage-tweet-btn">Completion Tweet / Post</button>
        </div>
        <div id="mkt-engage-out" class="mkt-output-wrap" style="display:none;"></div>
      `)}

      <!-- ── 5. Launch Strategy ─────────────────────────────────────────────── -->
      ${sectionHtml('launch', '🚀', 'Launch Strategy', 'mkt-launch-badge', `
        <div class="btn-group">
          <button class="btn btn-secondary" id="mkt-launch-checklist-btn">Generate Launch Checklist</button>
          <button class="btn btn-secondary" id="mkt-launch-reddit-btn">Generate Reddit / Community Posts</button>
        </div>
        <div id="mkt-launch-out" class="mkt-output-wrap" style="display:none;"></div>
      `)}

    </div>

    <style>
      .mkt-header { margin-bottom: 8px; }
      .mkt-sub    { color: var(--muted); font-size: .9rem; margin-top: 2px; margin-bottom: 0; }
      .mkt-section {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: 12px;
        overflow: hidden;
      }
      .mkt-section-hdr {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: var(--surface2);
        user-select: none;
      }
      .mkt-section-icon  { font-size: 1.15rem; }
      .mkt-section-title { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: .95rem; flex: 1; }
      .mkt-badge  { font-size: .8rem; color: #9ca3af; }
      .mkt-chev   { color: var(--muted); font-size: .85rem; }
      .mkt-section-body  { padding: 16px; }
      .mkt-output-wrap {
        margin-top: 16px;
        border-top: 1px solid var(--border);
        padding-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .mkt-output-block { display: flex; flex-direction: column; gap: 6px; }
      .mkt-output-label { font-size: .8rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
      .mkt-output-block textarea {
        width: 100%; min-height: 90px; resize: vertical;
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        padding: 10px; font-family: 'DM Sans', sans-serif; font-size: .9rem;
        background: var(--surface); color: var(--text); line-height: 1.5;
      }
      .mkt-output-block textarea.tall { min-height: 160px; }
      .mkt-copy-btn {
        align-self: flex-end;
        background: none; border: 1px solid var(--border);
        border-radius: var(--radius-sm); padding: 4px 12px;
        font-size: .82rem; cursor: pointer; color: var(--muted);
        transition: background .15s, color .15s;
      }
      .mkt-copy-btn:hover { background: var(--surface2); color: var(--text); }
      .mkt-chapter-list { display: flex; flex-direction: column; gap: 12px; }
      .mkt-chapter-item {
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        padding: 10px 12px;
      }
      .mkt-chapter-item h4 { font-size: .88rem; margin-bottom: 6px; color: var(--primary); }
      .mkt-chapter-item textarea {
        width: 100%; min-height: 70px; resize: vertical;
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        padding: 8px; font-size: .88rem; background: var(--surface);
        color: var(--text); line-height: 1.5; font-family: 'DM Sans', sans-serif;
      }
    </style>
  `;

  wireCollapse(container, 'thumb');
  wireCollapse(container, 'seo');
  wireCollapse(container, 'desc');
  wireCollapse(container, 'engage');
  wireCollapse(container, 'launch');

  bindAll(container, cur);
  restoreAll(container, cur);
}

// ── Restore saved data ────────────────────────────────────────────────────────

function restoreAll(container, cur) {
  const thumbConcepts = lgetJSON(MK.thumbConcepts);
  if (thumbConcepts) {
    renderThumbPlaylist(container, thumbConcepts);
    setBadge(container.querySelector('#mkt-thumb-badge'), 'ready');
  }

  const playlistTitles = lgetJSON(MK.playlistTitles);
  const chapterTitles  = lgetJSON(MK.chapterTitles);
  const seoKeywords    = lgetJSON(MK.seoKeywords);
  if (playlistTitles || chapterTitles || seoKeywords) {
    renderSeoOut(container, cur, playlistTitles, chapterTitles, seoKeywords);
    setBadge(container.querySelector('#mkt-seo-badge'), 'ready');
  }

  const playlistDesc  = lget(MK.playlistDesc);
  const chapterDescs  = lgetJSON(MK.chapterDescs);
  if (playlistDesc || chapterDescs) {
    renderDescOut(container, cur, playlistDesc, chapterDescs);
    setBadge(container.querySelector('#mkt-desc-badge'), 'ready');
  }

  const launchComment   = lget(MK.launchComment);
  const chapterComments = lgetJSON(MK.chapterComments);
  const tweet           = lget(MK.tweet);
  if (launchComment || chapterComments || tweet) {
    renderEngageOut(container, cur, launchComment, chapterComments, tweet);
    setBadge(container.querySelector('#mkt-engage-badge'), 'ready');
  }

  const checklist   = lgetJSON(MK.checklist);
  const redditPosts = lgetJSON(MK.redditPosts);
  if (checklist || redditPosts) {
    renderLaunchOut(container, cur, checklist, redditPosts);
    setBadge(container.querySelector('#mkt-launch-badge'), 'ready');
  }
}

// ── Bind all buttons ──────────────────────────────────────────────────────────

function bindAll(container, cur) {
  const on = (id, fn) => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('click', fn);
  };

  on('mkt-gen-all', () => genAll(container, cur));

  // Thumbnail
  on('mkt-thumb-playlist-btn', () => genThumbPlaylist(container, cur));
  on('mkt-thumb-chapter-btn',  () => genThumbChapter(container, cur));

  // SEO
  on('mkt-seo-titles-btn',  () => genPlaylistTitles(container, cur));
  on('mkt-seo-chapter-btn', () => genChapterTitles(container, cur));
  on('mkt-seo-kw-btn',      () => genSeoKeywords(container, cur));

  // Descriptions
  on('mkt-desc-playlist-btn', () => genPlaylistDesc(container, cur));
  on('mkt-desc-chapters-btn', () => genChapterDescs(container, cur));

  // Engagement
  on('mkt-engage-launch-btn',    () => genLaunchComment(container, cur));
  on('mkt-engage-comments-btn',  () => genChapterComments(container, cur));
  on('mkt-engage-tweet-btn',     () => genTweet(container, cur));

  // Launch
  on('mkt-launch-checklist-btn', () => genChecklist(container, cur));
  on('mkt-launch-reddit-btn',    () => genRedditPosts(container, cur));
}

// ── Generate all ──────────────────────────────────────────────────────────────

async function genAll(container, cur) {
  const btn = container.querySelector('#mkt-gen-all');
  const status = container.querySelector('#mkt-status');
  btn.disabled = true;
  btn.textContent = '⏳ Generating all assets…';

  const steps = [
    ['Thumbnail concepts',       () => genThumbPlaylist(container, cur)],
    ['Playlist title A/B',       () => genPlaylistTitles(container, cur)],
    ['Chapter titles',           () => genChapterTitles(container, cur)],
    ['SEO keywords',             () => genSeoKeywords(container, cur)],
    ['Playlist description',     () => genPlaylistDesc(container, cur)],
    ['Chapter descriptions',     () => genChapterDescs(container, cur)],
    ['Launch comment',           () => genLaunchComment(container, cur)],
    ['Chapter comments',         () => genChapterComments(container, cur)],
    ['Completion tweet',         () => genTweet(container, cur)],
    ['Launch checklist',         () => genChecklist(container, cur)],
    ['Community posts',          () => genRedditPosts(container, cur)],
  ];

  for (const [label, fn] of steps) {
    status.innerHTML = `<div class="status-bar" style="background:var(--surface2);color:var(--text);">⏳ Generating ${label}…</div>`;
    try { await fn(); } catch (e) { console.warn(label, e); }
    await new Promise(r => setTimeout(r, 400));
  }

  status.innerHTML = `<div class="status-bar success">✅ All marketing assets generated!</div>`;
  btn.disabled = false;
  btn.textContent = '🚀 Generate All Marketing Assets';
  setTimeout(() => { status.innerHTML = ''; }, 4000);
}

// ── Section helpers ───────────────────────────────────────────────────────────

function getApiKey() {
  const s = getSettings();
  if (!s.claudeApiKey) throw new Error('Claude API key not set — add it in ⚙ Settings.');
  return s.claudeApiKey;
}

function showErr(el, msg) {
  el.innerHTML = `<div class="status-bar" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;">${eh(msg)}</div>`;
  el.style.display = '';
}

// ── 1. Thumbnail ──────────────────────────────────────────────────────────────

async function genThumbPlaylist(container, cur) {
  const badge  = container.querySelector('#mkt-thumb-badge');
  const out    = container.querySelector('#mkt-thumb-out');
  const style  = container.querySelector('#mkt-thumb-style')?.value || 'Bold text + dark background';
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating thumbnail concepts…</div>';

  try {
    const apiKey = getApiKey();
    const chapterLines = cur.chapters.map(ch => `- Ch ${ch.number}: ${ch.title}`).join('\n');
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube thumbnail strategist for online courses. Output valid JSON only.',
      user: `Design 3 thumbnail concept variations for this course playlist.

Course: "${cur.course_title}"
Category: ${cur.category || 'Technology'}
Chapters:
${chapterLines}
Style preference: ${style}

Return a JSON array of 3 objects:
[
  {
    "variation": "A",
    "headline": "bold 3-5 word text for thumbnail",
    "subtext": "optional smaller line",
    "visual": "describe the visual layout/background/elements",
    "colors": "primary and accent color suggestion",
    "rationale": "why this works for the audience"
  }
]`,
      maxTokens: 1200,
    });
    const concepts = parseJSON(text);
    lset(MK.thumbConcepts, concepts);
    renderThumbPlaylist(container, concepts);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genThumbChapter(container, cur) {
  const badge   = container.querySelector('#mkt-thumb-badge');
  const out     = container.querySelector('#mkt-thumb-out');
  const chNum   = parseInt(container.querySelector('#mkt-thumb-chapter')?.value || '1', 10);
  const ch      = cur.chapters.find(c => c.number === chNum);
  if (!ch) return;
  const style   = container.querySelector('#mkt-thumb-style')?.value || 'Bold text + dark background';

  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating chapter thumbnail concept…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube thumbnail strategist. Output valid JSON only.',
      user: `Design 3 thumbnail concept variations for this individual course chapter.

Course: "${cur.course_title}"
Chapter ${ch.number}: ${ch.title}
Subtitle: ${ch.subtitle || ''}
Key takeaway: ${ch.key_takeaway || ''}
Style preference: ${style}

Return JSON array of 3 objects with fields: variation, headline, subtext, visual, colors, rationale.`,
      maxTokens: 1000,
    });
    const concepts = parseJSON(text);
    lset(MK.thumbChapter, { chapterNum: chNum, concepts });
    renderThumbChapter(container, ch, concepts);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

function renderThumbPlaylist(container, concepts) {
  const out = container.querySelector('#mkt-thumb-out');
  if (!out) return;
  out.style.display = '';
  out.innerHTML = `
    <div class="mkt-output-label">Playlist Thumbnail Concepts</div>
    ${concepts.map(c => `
      <div class="mkt-chapter-item">
        <h4>Variation ${c.variation} — "${eh(c.headline)}"</h4>
        ${c.subtext ? `<p style="font-size:.85rem;margin-bottom:6px;color:var(--muted);">Subtext: <em>${eh(c.subtext)}</em></p>` : ''}
        <p style="font-size:.85rem;margin-bottom:4px;"><strong>Visual:</strong> ${eh(c.visual)}</p>
        <p style="font-size:.85rem;margin-bottom:4px;"><strong>Colors:</strong> ${eh(c.colors)}</p>
        <p style="font-size:.85rem;color:var(--muted);">${eh(c.rationale)}</p>
      </div>
    `).join('')}`;
}

function renderThumbChapter(container, ch, concepts) {
  const out = container.querySelector('#mkt-thumb-out');
  if (!out) return;
  out.style.display = '';
  out.innerHTML = `
    <div class="mkt-output-label">Chapter ${ch.number} Thumbnail Concepts</div>
    ${concepts.map(c => `
      <div class="mkt-chapter-item">
        <h4>Variation ${c.variation} — "${eh(c.headline)}"</h4>
        ${c.subtext ? `<p style="font-size:.85rem;margin-bottom:6px;color:var(--muted);">Subtext: <em>${eh(c.subtext)}</em></p>` : ''}
        <p style="font-size:.85rem;margin-bottom:4px;"><strong>Visual:</strong> ${eh(c.visual)}</p>
        <p style="font-size:.85rem;margin-bottom:4px;"><strong>Colors:</strong> ${eh(c.colors)}</p>
        <p style="font-size:.85rem;color:var(--muted);">${eh(c.rationale)}</p>
      </div>
    `).join('')}`;
}

// ── 2. SEO & Titles ────────────────────────────────────────────────────────────

async function genPlaylistTitles(container, cur) {
  const badge = container.querySelector('#mkt-seo-badge');
  const out   = container.querySelector('#mkt-seo-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating playlist titles…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube SEO specialist. Output valid JSON only.',
      user: `Generate 5 A/B test title variations for this YouTube course playlist.

Course: "${cur.course_title}"
Category: ${cur.category || 'Technology'}
Chapters: ${cur.chapters.length}
Target audience: ${cur.target_audience || 'beginner developers'}

Rules:
- Keep under 70 characters
- Include year (${new Date().getFullYear()}) in at least 2 variants
- At least 1 should be curiosity-driven, 1 should be outcome-driven
- Include relevant keywords naturally

Return JSON array: [{ "title": "...", "type": "outcome|curiosity|keyword|social-proof|how-to", "chars": 50 }]`,
      maxTokens: 800,
    });
    const titles = parseJSON(text);
    lset(MK.playlistTitles, titles);
    const existing = lgetJSON(MK.chapterTitles);
    const existingKw = lgetJSON(MK.seoKeywords);
    renderSeoOut(container, cur, titles, existing, existingKw);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genChapterTitles(container, cur) {
  const badge   = container.querySelector('#mkt-seo-badge');
  const out     = container.querySelector('#mkt-seo-out');
  const formula = container.querySelector('#mkt-seo-formula')?.value.trim() || '';
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating chapter titles…</div>';

  try {
    const apiKey = getApiKey();
    const chapterLines = cur.chapters.map(ch =>
      `Ch ${ch.number}: ${ch.title} — ${ch.subtitle || ch.key_takeaway || ''}`
    ).join('\n');

    const text = await callClaude(apiKey, {
      system: 'You are a YouTube SEO specialist. Output valid JSON only.',
      user: `Generate optimized YouTube titles for each chapter of this course.

Course: "${cur.course_title}"
${formula ? `Title formula to follow: ${formula}` : 'Default formula: [Chapter N] Topic | Course Title'}

Chapters:
${chapterLines}

Return JSON array: [{ "number": 1, "title": "optimized YouTube title", "chars": 55 }]`,
      maxTokens: 1200,
    });
    const titles = parseJSON(text);
    lset(MK.chapterTitles, titles);
    const existingPl = lgetJSON(MK.playlistTitles);
    const existingKw = lgetJSON(MK.seoKeywords);
    renderSeoOut(container, cur, existingPl, titles, existingKw);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genSeoKeywords(container, cur) {
  const badge = container.querySelector('#mkt-seo-badge');
  const out   = container.querySelector('#mkt-seo-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Researching SEO keywords…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube SEO specialist. Output valid JSON only.',
      user: `Research YouTube SEO keywords for this online course.

Course: "${cur.course_title}"
Category: ${cur.category || 'Technology'}
Chapter topics: ${cur.chapters.map(c => c.title).join(', ')}

Return a JSON object:
{
  "primary": ["keyword1", "keyword2"],
  "secondary": ["keyword3", "keyword4"],
  "long_tail": ["full phrase 1", "full phrase 2"],
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "competitor_gap": "one sentence insight on keyword opportunity"
}`,
      maxTokens: 900,
    });
    const keywords = parseJSON(text);
    lset(MK.seoKeywords, keywords);
    const existingPl = lgetJSON(MK.playlistTitles);
    const existingCh = lgetJSON(MK.chapterTitles);
    renderSeoOut(container, cur, existingPl, existingCh, keywords);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

function renderSeoOut(container, cur, playlistTitles, chapterTitles, seoKeywords) {
  const out = container.querySelector('#mkt-seo-out');
  if (!out) return;
  out.style.display = '';
  let html = '';

  if (playlistTitles && playlistTitles.length) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Playlist Title Variations</div>
        ${playlistTitles.map((t, i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:.75rem;color:var(--muted);min-width:80px;">${eh(t.type||'')}</span>
            <input type="text" id="mkt-seo-pt-${i}" value="${esc(t.title)}" style="flex:1;border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font-size:.9rem;background:var(--surface);color:var(--text);" />
            <span style="font-size:.75rem;color:var(--muted);">${t.chars||t.title.length}ch</span>
          </div>
        `).join('')}
      </div>`;
  }

  if (chapterTitles && chapterTitles.length) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Chapter Titles</div>
        <div class="mkt-chapter-list">
          ${chapterTitles.map(t => `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:.8rem;color:var(--muted);min-width:30px;">Ch ${t.number}</span>
              <input type="text" id="mkt-seo-ct-${t.number}" value="${esc(t.title)}" style="flex:1;border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font-size:.88rem;background:var(--surface);color:var(--text);" />
              <span style="font-size:.75rem;color:var(--muted);">${t.chars||t.title.length}ch</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  if (seoKeywords) {
    const kw = seoKeywords;
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">SEO Keywords</div>
        ${kw.primary?.length ? `<p style="font-size:.85rem;margin-bottom:4px;"><strong>Primary:</strong> ${kw.primary.map(k => `<span style="background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:1px 6px;margin:2px;display:inline-block;">${eh(k)}</span>`).join('')}</p>` : ''}
        ${kw.secondary?.length ? `<p style="font-size:.85rem;margin-bottom:4px;"><strong>Secondary:</strong> ${kw.secondary.map(k => `<span style="background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:1px 6px;margin:2px;display:inline-block;">${eh(k)}</span>`).join('')}</p>` : ''}
        ${kw.long_tail?.length ? `<p style="font-size:.85rem;margin-bottom:4px;"><strong>Long-tail:</strong> ${kw.long_tail.map(k => `<span style="background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:1px 6px;margin:2px;display:inline-block;">${eh(k)}</span>`).join('')}</p>` : ''}
        ${kw.tags?.length ? `
          <div style="margin-top:6px;">
            <strong style="font-size:.85rem;">Tags (copy for all videos):</strong>
            <textarea id="mkt-seo-tags" rows="2" style="width:100%;margin-top:6px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-size:.85rem;background:var(--surface);color:var(--text);resize:vertical;">${esc(kw.tags.join(', '))}</textarea>
            <button class="mkt-copy-btn" id="mkt-copy-tags">Copy tags</button>
          </div>` : ''}
        ${kw.competitor_gap ? `<p style="font-size:.85rem;margin-top:8px;color:var(--muted);font-style:italic;">${eh(kw.competitor_gap)}</p>` : ''}
      </div>`;
  }

  out.innerHTML = html || '<p style="color:var(--muted);font-size:.9rem;">Generate titles or keywords above.</p>';

  wireCopy(container, 'mkt-copy-tags', 'mkt-seo-tags');
}

// ── 3. Descriptions ────────────────────────────────────────────────────────────

async function genPlaylistDesc(container, cur) {
  const badge      = container.querySelector('#mkt-desc-badge');
  const out        = container.querySelector('#mkt-desc-out');
  const instructor = container.querySelector('#mkt-desc-instructor')?.value.trim() || 'Aseem';
  const link       = container.querySelector('#mkt-desc-link')?.value.trim() || '';
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating playlist description…</div>';

  try {
    const apiKey = getApiKey();
    const chapterList = cur.chapters.map(ch => `• Chapter ${ch.number}: ${ch.title}`).join('\n');
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube channel manager creating course descriptions. Write compelling, SEO-friendly copy. No markdown.',
      user: `Write a YouTube playlist description for this online course.

Course: "${cur.course_title}"
Instructor: ${instructor}
Chapters:
${chapterList}
${link ? `Course link: ${link}` : ''}
Target audience: ${cur.target_audience || 'developers looking to level up'}

Structure:
1. Hook (1-2 sentences, what they'll achieve)
2. What you'll learn (bullet list of 5-6 key outcomes)
3. Who this is for
4. Chapter overview (short)
5. CTA to subscribe + link if provided

Keep under 5000 characters.`,
      maxTokens: 1400,
    });
    lset(MK.playlistDesc, text.trim());
    const existingDescs = lgetJSON(MK.chapterDescs);
    renderDescOut(container, cur, text.trim(), existingDescs);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genChapterDescs(container, cur) {
  const badge      = container.querySelector('#mkt-desc-badge');
  const out        = container.querySelector('#mkt-desc-out');
  const instructor = container.querySelector('#mkt-desc-instructor')?.value.trim() || 'Aseem';
  const link       = container.querySelector('#mkt-desc-link')?.value.trim() || '';
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating chapter descriptions…</div>';

  try {
    const apiKey = getApiKey();
    const chapterLines = cur.chapters.map(ch =>
      `Ch ${ch.number}: ${ch.title} — ${ch.key_takeaway || ch.subtitle || ''}`
    ).join('\n');
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube channel manager. Output valid JSON only.',
      user: `Write individual YouTube video descriptions for each chapter of this course.

Course: "${cur.course_title}"
Instructor: ${instructor}
${link ? `Playlist link: ${link}` : ''}

Chapters:
${chapterLines}

For each chapter write a ~200-word description with:
- Opening hook specific to the chapter topic
- 3-4 bullet points of what they'll learn
- CTA to like, comment, subscribe
- Link to playlist

Return JSON array: [{ "number": 1, "description": "full description text" }]`,
      maxTokens: 2000,
    });
    const descs = parseJSON(text);
    lset(MK.chapterDescs, descs);
    const existingPl = lget(MK.playlistDesc);
    renderDescOut(container, cur, existingPl, descs);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

function renderDescOut(container, cur, playlistDesc, chapterDescs) {
  const out = container.querySelector('#mkt-desc-out');
  if (!out) return;
  out.style.display = '';
  let html = '';

  if (playlistDesc) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Playlist Description</div>
        <textarea id="mkt-desc-pl-ta" class="tall">${esc(playlistDesc)}</textarea>
        <button class="mkt-copy-btn" id="mkt-desc-pl-copy">Copy</button>
      </div>`;
  }

  if (chapterDescs && chapterDescs.length) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Chapter Descriptions</div>
        <div class="mkt-chapter-list">
          ${chapterDescs.map(d => `
            <div class="mkt-chapter-item">
              <h4>Chapter ${d.number}: ${esc(cur.chapters.find(c => c.number === d.number)?.title || '')}</h4>
              <textarea id="mkt-desc-ch-${d.number}">${esc(d.description)}</textarea>
              <button class="mkt-copy-btn" id="mkt-desc-ch-copy-${d.number}" style="margin-top:4px;">Copy</button>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  out.innerHTML = html || '<p style="color:var(--muted);font-size:.9rem;">Generate descriptions above.</p>';

  wireCopy(container, 'mkt-desc-pl-copy', 'mkt-desc-pl-ta');
  if (chapterDescs) {
    chapterDescs.forEach(d => wireCopy(container, `mkt-desc-ch-copy-${d.number}`, `mkt-desc-ch-${d.number}`));
  }
}

// ── 4. Community & Engagement ─────────────────────────────────────────────────

async function genLaunchComment(container, cur) {
  const badge = container.querySelector('#mkt-engage-badge');
  const out   = container.querySelector('#mkt-engage-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating launch comment…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube community manager. Write engaging, authentic comments. No markdown.',
      user: `Write a pinned launch comment for the first video in this course playlist.

Course: "${cur.course_title}"
Number of chapters: ${cur.chapters.length}
Chapter list:
${cur.chapters.map(ch => `• Chapter ${ch.number}: ${ch.title}`).join('\n')}

The comment should:
- Welcome viewers warmly
- Explain the full playlist structure
- List timestamps or chapter links (use placeholder format: 0:00 Introduction)
- Ask a discussion question to drive comments
- Be under 2000 characters

Write the full comment text only.`,
      maxTokens: 900,
    });
    lset(MK.launchComment, text.trim());
    const existingCh = lgetJSON(MK.chapterComments);
    const existingTw = lget(MK.tweet);
    renderEngageOut(container, cur, text.trim(), existingCh, existingTw);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genChapterComments(container, cur) {
  const badge = container.querySelector('#mkt-engage-badge');
  const out   = container.querySelector('#mkt-engage-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating per-chapter comments…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube community manager. Output valid JSON only.',
      user: `Write a pinned comment for each chapter video in this course.

Course: "${cur.course_title}"
Chapters:
${cur.chapters.map(ch => `Ch ${ch.number}: ${ch.title} — key takeaway: ${ch.key_takeaway || ch.subtitle || ''}`).join('\n')}

Each comment should:
- Reference the specific chapter topic
- Include 2-3 key resource links or timestamps as placeholders
- Ask a chapter-specific discussion question
- Be under 500 characters

Return JSON array: [{ "number": 1, "comment": "full comment text" }]`,
      maxTokens: 2000,
    });
    const comments = parseJSON(text);
    lset(MK.chapterComments, comments);
    const existingLaunch = lget(MK.launchComment);
    const existingTw = lget(MK.tweet);
    renderEngageOut(container, cur, existingLaunch, comments, existingTw);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genTweet(container, cur) {
  const badge = container.querySelector('#mkt-engage-badge');
  const out   = container.querySelector('#mkt-engage-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating social posts…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a social media manager for a tech education brand. Write punchy, shareable posts. No markdown.',
      user: `Write 3 social media posts announcing this new online course.

Course: "${cur.course_title}"
Chapters: ${cur.chapters.length}
Topics: ${cur.chapters.slice(0, 5).map(c => c.title).join(', ')}${cur.chapters.length > 5 ? ', and more' : ''}

Write:
1. Twitter/X post (under 280 chars, punchy, with relevant hashtags)
2. LinkedIn post (professional, 3-4 sentences, value-focused)
3. Short Reddit announcement (1-2 sentences, community-friendly, no self-promo tone)

Separate each with ---`,
      maxTokens: 700,
    });
    lset(MK.tweet, text.trim());
    const existingLaunch = lget(MK.launchComment);
    const existingCh = lgetJSON(MK.chapterComments);
    renderEngageOut(container, cur, existingLaunch, existingCh, text.trim());
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

function renderEngageOut(container, cur, launchComment, chapterComments, tweet) {
  const out = container.querySelector('#mkt-engage-out');
  if (!out) return;
  out.style.display = '';
  let html = '';

  if (launchComment) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Pinned Launch Comment (Playlist Video)</div>
        <textarea id="mkt-engage-lc-ta" class="tall">${esc(launchComment)}</textarea>
        <button class="mkt-copy-btn" id="mkt-engage-lc-copy">Copy</button>
      </div>`;
  }

  if (chapterComments && chapterComments.length) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Per-Chapter Pinned Comments</div>
        <div class="mkt-chapter-list">
          ${chapterComments.map(c => `
            <div class="mkt-chapter-item">
              <h4>Chapter ${c.number}: ${esc(cur.chapters.find(ch => ch.number === c.number)?.title || '')}</h4>
              <textarea id="mkt-engage-cc-${c.number}">${esc(c.comment)}</textarea>
              <button class="mkt-copy-btn" id="mkt-engage-cc-copy-${c.number}" style="margin-top:4px;">Copy</button>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  if (tweet) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Social Media Posts</div>
        <textarea id="mkt-engage-tw-ta" class="tall">${esc(tweet)}</textarea>
        <button class="mkt-copy-btn" id="mkt-engage-tw-copy">Copy all</button>
      </div>`;
  }

  out.innerHTML = html || '<p style="color:var(--muted);font-size:.9rem;">Generate engagement content above.</p>';

  wireCopy(container, 'mkt-engage-lc-copy', 'mkt-engage-lc-ta');
  wireCopy(container, 'mkt-engage-tw-copy', 'mkt-engage-tw-ta');
  if (chapterComments) {
    chapterComments.forEach(c => wireCopy(container, `mkt-engage-cc-copy-${c.number}`, `mkt-engage-cc-${c.number}`));
  }
}

// ── 5. Launch Strategy ─────────────────────────────────────────────────────────

async function genChecklist(container, cur) {
  const badge = container.querySelector('#mkt-launch-badge');
  const out   = container.querySelector('#mkt-launch-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating launch checklist…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a YouTube growth strategist. Output valid JSON only.',
      user: `Create a comprehensive launch checklist for this online course on YouTube.

Course: "${cur.course_title}"
Chapters: ${cur.chapters.length}

Return a JSON object with phases:
{
  "pre_launch": [
    { "task": "task description", "priority": "high|medium|low", "timing": "7 days before" }
  ],
  "launch_day": [
    { "task": "...", "priority": "high", "timing": "launch day" }
  ],
  "post_launch": [
    { "task": "...", "priority": "medium", "timing": "first week" }
  ]
}`,
      maxTokens: 1200,
    });
    const checklist = parseJSON(text);
    lset(MK.checklist, checklist);
    const existingReddit = lgetJSON(MK.redditPosts);
    renderLaunchOut(container, cur, checklist, existingReddit);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

async function genRedditPosts(container, cur) {
  const badge = container.querySelector('#mkt-launch-badge');
  const out   = container.querySelector('#mkt-launch-out');
  setBadge(badge, 'generating');
  out.style.display = '';
  out.innerHTML = '<div class="status-bar" style="background:var(--surface2);color:var(--muted);">🔄 Generating community posts…</div>';

  try {
    const apiKey = getApiKey();
    const text = await callClaude(apiKey, {
      system: 'You are a community marketing expert for tech education. Output valid JSON only.',
      user: `Write Reddit and community forum posts to announce this free online course.

Course: "${cur.course_title}"
Topics covered: ${cur.chapters.map(c => c.title).join(', ')}
Target audience: ${cur.target_audience || 'developers and learners'}

Write posts for 3 subreddits/communities. Each should:
- Match community tone (no self-promo feel)
- Lead with value, not promotion
- Be concise (under 300 words each)
- Include a genuine question to spark discussion

Return JSON array:
[{
  "community": "r/learnprogramming",
  "title": "post title",
  "body": "full post body"
}]`,
      maxTokens: 1400,
    });
    const posts = parseJSON(text);
    lset(MK.redditPosts, posts);
    const existingChecklist = lgetJSON(MK.checklist);
    renderLaunchOut(container, cur, existingChecklist, posts);
    setBadge(badge, 'ready');
  } catch (e) {
    showErr(out, e.message);
    setBadge(badge, 'none');
  }
}

function renderLaunchOut(container, cur, checklist, redditPosts) {
  const out = container.querySelector('#mkt-launch-out');
  if (!out) return;
  out.style.display = '';
  let html = '';

  if (checklist) {
    const priorityColor = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };
    const renderPhase = (label, items) => {
      if (!items || !items.length) return '';
      return `
        <div style="margin-bottom:12px;">
          <div class="mkt-output-label" style="margin-bottom:8px;">${label}</div>
          ${items.map(item => `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
              <input type="checkbox" style="margin-top:3px;accent-color:var(--accent);" />
              <div style="flex:1;">
                <span style="font-size:.9rem;">${eh(item.task)}</span>
                <span style="font-size:.75rem;color:var(--muted);margin-left:8px;">${eh(item.timing||'')}</span>
              </div>
              <span style="font-size:.72rem;color:${priorityColor[item.priority]||'var(--muted)'};font-weight:600;text-transform:uppercase;">${eh(item.priority||'')}</span>
            </div>
          `).join('')}
        </div>`;
    };
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Launch Checklist</div>
        ${renderPhase('Pre-Launch', checklist.pre_launch)}
        ${renderPhase('Launch Day', checklist.launch_day)}
        ${renderPhase('Post-Launch', checklist.post_launch)}
      </div>`;
  }

  if (redditPosts && redditPosts.length) {
    html += `
      <div class="mkt-output-block">
        <div class="mkt-output-label">Community Posts</div>
        <div class="mkt-chapter-list">
          ${redditPosts.map((p, i) => `
            <div class="mkt-chapter-item">
              <h4>${eh(p.community)}</h4>
              <div style="font-size:.85rem;font-weight:600;margin-bottom:6px;">${eh(p.title)}</div>
              <textarea id="mkt-reddit-${i}" style="min-height:100px;">${esc(p.body)}</textarea>
              <button class="mkt-copy-btn" id="mkt-reddit-copy-${i}" style="margin-top:4px;">Copy</button>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  out.innerHTML = html || '<p style="color:var(--muted);font-size:.9rem;">Generate launch strategy above.</p>';

  if (redditPosts) {
    redditPosts.forEach((_, i) => wireCopy(container, `mkt-reddit-copy-${i}`, `mkt-reddit-${i}`));
  }
}
