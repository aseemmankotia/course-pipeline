/**
 * app.js — TechNuggets Academy Course Pipeline
 * Tab routing, settings tab, global helpers.
 */

import { renderCurriculum } from './components/curriculum.js';
import { renderChapter }    from './components/chapter.js';
import { renderSlides }     from './components/slides.js';
import { renderPublish }    from './components/publish.js';
import { renderMarketing }  from './components/marketing.js';
import { renderMaterials }  from './components/materials.js';

// ── Settings ──────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'course_settings';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch { return {}; }
}

function saveSettings(obj) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
}

// ── Curriculum helpers (used across components) ───────────────────────────────

const CURRICULUM_KEY = 'course_curriculum';

export function getCurriculum() {
  try { return JSON.parse(localStorage.getItem(CURRICULUM_KEY) || 'null'); }
  catch { return null; }
}

export function saveCurriculum(data) {
  localStorage.setItem(CURRICULUM_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('curriculum-updated', { detail: data }));
}

export function getChapterData(n) {
  try {
    const raw = localStorage.getItem(`course_chapter_${n}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveChapterData(n, data) {
  localStorage.setItem(`course_chapter_${n}`, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('chapter-updated', { detail: { n, ...data } }));
}

// ── Tab routing ───────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
}

// ── Settings tab renderer ─────────────────────────────────────────────────────

function renderSettings(container) {
  const s = getSettings();

  container.innerHTML = `
    <div class="card">
      <h2>⚙️ Settings</h2>

      <div class="settings-section">
        <div class="settings-label">🤖 AI Providers</div>
        <p style="font-size:.82rem;color:var(--muted);margin:4px 0 12px;">
          Claude (Anthropic) is the primary AI. When Claude hits a credit/balance error,
          Gemini Flash is used automatically as a fallback.
        </p>
        <div class="form-row">
          <div class="form-group">
            <label>Anthropic API Key <span style="font-size:.75rem;color:var(--muted);">(primary)</span></label>
            <input type="password" id="st-claude-key" placeholder="sk-ant-..." value="${esc(s.claudeApiKey || '')}" />
          </div>
          <div class="form-group">
            <label>Google Gemini API Key <span style="font-size:.75rem;color:var(--muted);">(fallback)</span></label>
            <input type="password" id="st-gemini-key" placeholder="AIza…" value="${esc(s.geminiApiKey || '')}" />
            <div style="font-size:.76rem;color:var(--muted);margin-top:4px;">
              Free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent);">aistudio.google.com</a>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" id="st-ai-test-btn" style="font-size:.82rem;padding:5px 14px;">🤖 Test AI providers</button>
          <span id="st-ai-test-status" style="font-size:.82rem;color:var(--muted);"></span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">▶️ YouTube Data API v3</div>
        <div class="form-row">
          <div class="form-group">
            <label>Client ID</label>
            <input type="password" id="st-yt-client-id" placeholder="…apps.googleusercontent.com" value="${esc(s.youtubeClientId || '')}" />
          </div>
          <div class="form-group">
            <label>Client Secret</label>
            <input type="password" id="st-yt-client-secret" placeholder="GOCSPX-…" value="${esc(s.youtubeClientSecret || '')}" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>OAuth Token (auto-saved after auth)</label>
            <input type="password" id="st-yt-token" placeholder="Paste token or authenticate via Publish tab" value="${esc(s.youtubeToken || '')}" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">🎭 HeyGen Avatar (for reference)</div>
        <div class="form-row">
          <div class="form-group">
            <label>Avatar ID</label>
            <input type="text" id="st-heygen-avatar-id" placeholder="Your HeyGen avatar ID" value="${esc(s.heygenAvatarId || '')}" />
          </div>
          <div class="form-group">
            <label>Voice ID</label>
            <input type="text" id="st-heygen-voice-id" placeholder="Your HeyGen voice ID" value="${esc(s.heygenVoiceId || '')}" />
          </div>
        </div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">
          Export avatar videos from HeyGen as <code>heygen-chapter-NN.mp4</code> and place them in
          <code>render/chapters/chapter-NN/</code> or <code>~/Downloads/</code> before rendering.
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">🎓 Course Defaults</div>
        <div class="form-row">
          <div class="form-group">
            <label>Academy Name</label>
            <input type="text" id="st-academy-name" placeholder="TechNuggets Academy" value="${esc(s.academyName || 'TechNuggets Academy')}" />
          </div>
          <div class="form-group">
            <label>Default Audience</label>
            <select id="st-audience">
              ${['Complete beginner','Some experience','Intermediate developer']
                .map(a => `<option ${s.defaultAudience === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>Default Course Depth</label>
            <select id="st-depth">
              ${['Quick start (4-6 chapters)','Standard course (8-10 chapters)','Deep dive (12-15 chapters)']
                .map(d => `<option ${s.defaultDepth === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">📚 Materials Generation</div>
        <div class="form-row">
          <div class="form-group">
            <label>Code Examples Language</label>
            <select id="st-course-language">
              ${['Python','JavaScript','TypeScript','Java','Go','Rust','C#','None (no code examples)']
                .map(l => `<option ${(s.courseLanguage || 'Python') === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>GitHub Repo Name Template</label>
            <input type="text" id="st-github-repo-template" placeholder="course-{slug}" value="${esc(s.githubRepoTemplate || 'course-{slug}')}" />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">🐙 GitHub Materials Repository</div>
        <div class="form-row">
          <div class="form-group">
            <label>GitHub Username</label>
            <input type="text" id="st-github-username" placeholder="aseemmankotia" value="${esc(s.githubUsername || '')}" />
          </div>
          <div class="form-group">
            <label>Personal Access Token <span style="font-size:.75rem;color:var(--muted);">(repo scope needed)</span></label>
            <input type="password" id="st-github-token" placeholder="ghp_…" value="${esc(s.githubToken || '')}" />
            <div style="font-size:.76rem;color:var(--muted);margin-top:4px;">
              <a href="https://github.com/settings/tokens" target="_blank" style="color:var(--accent);">Get token at github.com/settings/tokens</a> · needs <code>repo</code> scope
            </div>
          </div>
        </div>
        ${s.githubToken && s.githubUsername ? `
        <div style="font-size:.82rem;color:#16a34a;margin-top:4px;">
          ✅ Will create: <code>github.com/${esc(s.githubUsername)}/course-{slug}</code>
        </div>` : `
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">
          ⚠️ Add username + token to enable one-click GitHub publishing from the Materials tab.
        </div>`}
      </div>

      <div id="settings-status"></div>
      <div class="btn-group">
        <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
      </div>

      <div class="settings-section">
        <div class="settings-label">🔗 Course URLs</div>
        <p style="font-size:.82rem;color:var(--muted);margin:4px 0 12px;">
          These URLs are embedded in promo videos and exported with course data.
          Run <code>npm run promo:url -- --url=&lt;udemy-url&gt;</code> or set them here.
        </p>
        <div class="form-row">
          <div class="form-group">
            <label>Udemy Course URL</label>
            <input type="url" id="st-udemy-url" placeholder="https://www.udemy.com/course/your-course/"
              value="${esc(localStorage.getItem('courseUdemyUrl') || '')}" />
          </div>
          <div class="form-group">
            <label>Coursera Course URL <span style="font-size:.75rem;color:var(--muted);">(optional)</span></label>
            <input type="url" id="st-coursera-url" placeholder="https://www.coursera.org/learn/your-course"
              value="${esc(localStorage.getItem('courseCourseraUrl') || '')}" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label>YouTube Playlist URL <span style="font-size:.75rem;color:var(--muted);">(optional)</span></label>
            <input type="url" id="st-youtube-url" placeholder="https://www.youtube.com/playlist?list=..."
              value="${esc(localStorage.getItem('courseYoutubeUrl') || '')}" />
          </div>
        </div>
      </div>

      <div class="settings-section" style="margin-top:20px;">
        <div class="settings-label">📦 Course Archive</div>
        <p style="font-size:.83rem;color:var(--muted);margin-bottom:10px;">
          Export all course data (scripts, materials, practice tests) to a JSON file,
          then run <code>node archive.js</code> to build a dated ZIP archive.
        </p>
        <button class="btn btn-secondary" id="export-course-data-btn">
          📤 Export Course Data for Archive
        </button>
        <div id="export-status" style="margin-top:8px;font-size:.82rem;color:var(--muted);"></div>
        <div id="export-instructions" style="display:none;margin-top:10px;padding:12px;
          background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);
          font-size:.82rem;line-height:1.8;">
          <strong>After downloading:</strong>
          <ol style="margin:6px 0 0 16px;">
            <li>Move file to project root:
              <code>mv ~/Downloads/course-data-export.json ~/course-pipeline/</code></li>
            <li>Run: <code>node archive.js</code>  or  <code>npm run archive</code></li>
            <li>Find ZIP in <code>exports/</code> folder</li>
          </ol>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#st-ai-test-btn').addEventListener('click', async () => {
    const btn      = container.querySelector('#st-ai-test-btn');
    const statusEl = container.querySelector('#st-ai-test-status');
    btn.disabled   = true;
    btn.textContent = 'Testing…';
    statusEl.textContent = '';

    const claudeKey  = container.querySelector('#st-claude-key').value.trim();
    const geminiKey  = container.querySelector('#st-gemini-key').value.trim();
    const results    = [];

    if (claudeKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Say "ok".' }],
          }),
        });
        results.push(res.ok ? '✅ Claude' : `❌ Claude (${res.status})`);
      } catch { results.push('❌ Claude (network error)'); }
    } else {
      results.push('⬜ Claude (no key)');
    }

    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say "ok".' }] }], generationConfig: { maxOutputTokens: 8 } }),
          }
        );
        results.push(res.ok ? '✅ Gemini' : `❌ Gemini (${res.status})`);
      } catch { results.push('❌ Gemini (network error)'); }
    } else {
      results.push('⬜ Gemini (no key)');
    }

    statusEl.textContent = results.join('  ·  ');
    statusEl.style.color = results.some(r => r.startsWith('✅')) ? '#16a34a' : '#dc2626';
    btn.disabled    = false;
    btn.textContent = '🤖 Test AI providers';
  });

  container.querySelector('#export-course-data-btn').addEventListener('click', () =>
    exportCourseData(container));

  container.querySelector('#save-settings-btn').addEventListener('click', () => {
    const updated = {
      claudeApiKey:      container.querySelector('#st-claude-key').value.trim(),
      geminiApiKey:      container.querySelector('#st-gemini-key').value.trim(),
      youtubeClientId:   container.querySelector('#st-yt-client-id').value.trim(),
      youtubeClientSecret: container.querySelector('#st-yt-client-secret').value.trim(),
      youtubeToken:      container.querySelector('#st-yt-token').value.trim(),
      heygenAvatarId:     container.querySelector('#st-heygen-avatar-id').value.trim(),
      heygenVoiceId:      container.querySelector('#st-heygen-voice-id').value.trim(),
      academyName:          container.querySelector('#st-academy-name').value.trim() || 'TechNuggets Academy',
      defaultAudience:      container.querySelector('#st-audience').value,
      defaultDepth:         container.querySelector('#st-depth').value,
      courseLanguage:       container.querySelector('#st-course-language').value,
      githubRepoTemplate:   container.querySelector('#st-github-repo-template').value.trim() || 'course-{slug}',
      githubUsername:       container.querySelector('#st-github-username').value.trim(),
      githubToken:          container.querySelector('#st-github-token').value.trim(),
    };
    saveSettings(updated);

    // Course URLs stored as standalone keys (not in settings blob) so promo-render.js can read them via export
    const udemyUrl   = container.querySelector('#st-udemy-url').value.trim();
    const courseraUrl = container.querySelector('#st-coursera-url').value.trim();
    const youtubeUrl = container.querySelector('#st-youtube-url').value.trim();
    if (udemyUrl)    localStorage.setItem('courseUdemyUrl',    udemyUrl);    else localStorage.removeItem('courseUdemyUrl');
    if (courseraUrl) localStorage.setItem('courseCourseraUrl', courseraUrl); else localStorage.removeItem('courseCourseraUrl');
    if (youtubeUrl)  localStorage.setItem('courseYoutubeUrl',  youtubeUrl);  else localStorage.removeItem('courseYoutubeUrl');
    const el = container.querySelector('#settings-status');
    el.innerHTML = `<div class="status-bar success">✓ Settings saved.</div>`;
    setTimeout(() => { el.innerHTML = ''; }, 2500);
  });
}

// ── Export course data for archive ────────────────────────────────────────────

async function exportCourseData(container) {
  const btn      = container.querySelector('#export-course-data-btn');
  const statusEl = container.querySelector('#export-status');

  btn.disabled    = true;
  btn.textContent = '⏳ Exporting…';
  statusEl.textContent = 'Collecting course data…';

  try {
    const curriculum = getCurriculum();
    if (!curriculum) throw new Error('No curriculum found — generate a course first.');

    const id       = curriculum.id;
    const chapters = curriculum.chapters || [];

    const exportData = {
      ...curriculum,
      export_date:    new Date().toISOString(),
      export_version: '1.0',
      scripts:        {},
      materials:      {},
      practice_tests: [],
    };

    // Scripts (stored inside chapter data)
    chapters.forEach(ch => {
      const d = JSON.parse(localStorage.getItem(`course_chapter_${ch.number}`) || 'null');
      if (d?.script) exportData.scripts[ch.number] = d.script;
    });

    // Materials
    const matTypes = ['questions', 'flashcards', 'cheatsheet', 'code', 'exam_questions'];
    chapters.forEach(ch => {
      matTypes.forEach(type => {
        const val = localStorage.getItem(`course_materials_${id}_ch${ch.number}_${type}`);
        if (val) exportData.materials[`ch${ch.number}_${type}`] = val;
      });
    });

    // Practice tests
    [1, 2].forEach(n => {
      const raw = localStorage.getItem(`course_practice_test_${id}_${n}`);
      if (raw) {
        try { exportData.practice_tests.push(JSON.parse(raw)); }
        catch { exportData.practice_tests.push(raw); }
      }
    });

    // Course platform URLs
    const udemyUrl   = localStorage.getItem('courseUdemyUrl')    || '';
    const courseraUrl = localStorage.getItem('courseCourseraUrl') || '';
    const ytPlaylist = localStorage.getItem('courseYoutubeUrl')  || '';
    if (udemyUrl)    exportData.udemy_url    = udemyUrl;
    if (courseraUrl) exportData.coursera_url = courseraUrl;
    if (ytPlaylist)  exportData.youtube_url  = ytPlaylist;

    // YouTube video IDs (if uploaded)
    chapters.forEach(ch => {
      const videoId = JSON.parse(localStorage.getItem(`course_chapter_${ch.number}`) || 'null')?.videoId;
      if (videoId) {
        exportData.youtube_video_ids = exportData.youtube_video_ids || {};
        exportData.youtube_video_ids[ch.number] = videoId;
      }
    });

    const scriptCount   = Object.keys(exportData.scripts).length;
    const materialCount = Object.keys(exportData.materials).length;
    const testCount     = exportData.practice_tests.length;

    statusEl.textContent = `Found: ${scriptCount} scripts, ${materialCount} material files, ${testCount} practice tests`;

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'course-data-export.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);

    statusEl.textContent = `✅ Exported! (${(json.length / 1024).toFixed(0)}KB) — move file to project root then run: node archive.js`;
    statusEl.style.color = '#16a34a';
    container.querySelector('#export-instructions').style.display = 'block';

  } catch (e) {
    statusEl.textContent = `❌ Export failed: ${e.message}`;
    statusEl.style.color = '#dc2626';
  }

  btn.disabled    = false;
  btn.textContent = '📤 Export Course Data for Archive';
}

// ── Script generation shared helpers ─────────────────────────────────────────

export const TOKENS_BY_DURATION = { 10: 3000, 15: 4500, 20: 6000, 25: 7500, 30: 9000 };

const CHAPTER_SYSTEM_PROMPT = `You are an expert tech educator creating video scripts for online courses. Your teaching style is:
- Clear and encouraging, never condescending
- Uses simple analogies before technical terms
- Builds confidence with small wins
- Speaks directly to the viewer using you
- Celebrates progress
- Makes complex things feel achievable

Voice: conversational, enthusiastic, patient. Occasional light humor.
Never use markdown formatting or bracketed stage directions in the spoken text.

CRITICAL: Always write a complete script with a proper ending.
Never stop mid-sentence or mid-section.
The script MUST end with:
1. A recap of 3 key things learned
2. A subscribe and like CTA
3. A preview of the next chapter
4. A sign-off ("See you in the next one!")

If you are running long, condense the middle sections rather than omitting the ending.`;

export async function generateFullScript(userMsg, apiKey, maxTokens, customSystemPrompt) {
  const systemPrompt = customSystemPrompt || CHAPTER_SYSTEM_PROMPT;

  // Use window.callAI if available (handles Gemini fallback automatically)
  if (typeof window.callAI === 'function') {
    const result = await window.callAI({
      prompt:       userMsg,
      systemPrompt,
      maxTokens:    maxTokens || 4096,
      action:       'chapter_script',
    });
    let fullScript = result.text;

    // If script was cut off (Gemini doesn't support multi-turn continuation),
    // check for ending and append a closing if missing
    const hasEnding =
      fullScript.toLowerCase().includes('subscribe') ||
      fullScript.toLowerCase().includes('next chapter') ||
      fullScript.toLowerCase().includes('see you');

    if (!hasEnding) {
      try {
        const closing = await window.callAI({
          prompt: 'Complete the script now with just the closing recap, subscribe CTA, and sign-off. Keep it brief.',
          systemPrompt,
          maxTokens: 1000,
          action:    'chapter_script_closing',
        });
        fullScript += '\n' + closing.text;
      } catch { /* best-effort */ }
    }

    return fullScript;
  }

  // Fallback: direct Anthropic multi-turn loop (ai-client.js not loaded)
  let fullScript = '';
  let continueGenerating = true;
  let attempt = 0;
  const maxAttempts = 3;

  while (continueGenerating && attempt < maxAttempts) {
    attempt++;

    const messages = attempt === 1
      ? [{ role: 'user', content: userMsg }]
      : [
          { role: 'user', content: userMsg },
          { role: 'assistant', content: fullScript },
          {
            role: 'user',
            content: 'Continue the script exactly from where you left off. Do not repeat anything. Do not add any headers or preamble. Just continue naturally until the complete ending including the subscribe CTA and sign-off.',
          },
        ];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
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
        system: systemPrompt,
        messages,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`API error (${resp.status}): ${err?.error?.message || resp.statusText}`);
    }

    const data = await resp.json();
    const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    fullScript += (attempt > 1 ? '\n' : '') + text;

    if (data.stop_reason === 'end_turn') {
      continueGenerating = false;
    } else if (data.stop_reason === 'max_tokens') {
      console.log(`Script truncated at attempt ${attempt}, continuing…`);
    } else {
      continueGenerating = false;
    }
  }

  // Force a closing CTA if the script ended without one
  const hasEnding =
    fullScript.toLowerCase().includes('subscribe') ||
    fullScript.toLowerCase().includes('next chapter') ||
    fullScript.toLowerCase().includes('see you');

  if (!hasEnding) {
    const finalResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMsg },
          { role: 'assistant', content: fullScript },
          {
            role: 'user',
            content: 'Complete the script now with just the closing recap, subscribe CTA, and sign-off. Keep it brief.',
          },
        ],
      }),
    });

    if (finalResp.ok) {
      const finalData = await finalResp.json();
      const finalText = (finalData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      fullScript += '\n' + finalText;
    }
  }

  return fullScript;
}

// ── Boot ──────────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
  const panels = {
    curriculum: document.querySelector('#tab-curriculum'),
    chapters:   document.querySelector('#tab-chapters'),
    render:     document.querySelector('#tab-render'),
    publish:    document.querySelector('#tab-publish'),
    marketing:  document.querySelector('#tab-marketing'),
    materials:  document.querySelector('#tab-materials'),
    settings:   document.querySelector('#tab-settings'),
  };

  renderCurriculum(panels.curriculum, () => switchTab('chapters'));
  renderChapter(panels.chapters);
  renderSlides(panels.render);
  renderPublish(panels.publish);
  renderMarketing(panels.marketing);
  renderMaterials(panels.materials);
  renderSettings(panels.settings);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});
