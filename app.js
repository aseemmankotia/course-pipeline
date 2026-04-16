/**
 * app.js — TechNuggets Academy Course Pipeline
 * Tab routing, settings tab, global helpers.
 */

import { renderCurriculum } from './components/curriculum.js';
import { renderChapter }    from './components/chapter.js';
import { renderSlides }     from './components/slides.js';
import { renderPublish }    from './components/publish.js';
import { renderMarketing }  from './components/marketing.js';

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
        <div class="settings-label">🤖 Claude (Anthropic)</div>
        <div class="form-row single">
          <div class="form-group">
            <label>API Key</label>
            <input type="password" id="st-claude-key" placeholder="sk-ant-..." value="${esc(s.claudeApiKey || '')}" />
          </div>
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
        <div class="settings-label">🎭 HeyGen Avatar</div>
        <div class="form-row single">
          <div class="form-group">
            <label>API Key ${s.heygenApiKey ? '<span style="color:#16a34a;">✓</span>' : ''}</label>
            <input type="password" id="st-heygen-key" placeholder="HeyGen API key" value="${esc(s.heygenApiKey || '')}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Avatar ID ${s.heygenAvatarId ? '<span style="color:#16a34a;">✓</span>' : ''}</label>
            <input type="text" id="st-avatar-id" placeholder="avatar_…" value="${esc(s.heygenAvatarId || '')}" />
          </div>
          <div class="form-group">
            <label>Voice ID ${s.heygenVoiceId ? '<span style="color:#16a34a;">✓</span>' : ''}</label>
            <input type="text" id="st-voice-id" placeholder="voice_…" value="${esc(s.heygenVoiceId || '')}" />
          </div>
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

      <div id="settings-status"></div>
      <div class="btn-group">
        <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
      </div>
    </div>
  `;

  container.querySelector('#save-settings-btn').addEventListener('click', () => {
    const updated = {
      claudeApiKey:      container.querySelector('#st-claude-key').value.trim(),
      youtubeClientId:   container.querySelector('#st-yt-client-id').value.trim(),
      youtubeClientSecret: container.querySelector('#st-yt-client-secret').value.trim(),
      youtubeToken:      container.querySelector('#st-yt-token').value.trim(),
      heygenApiKey:      container.querySelector('#st-heygen-key').value.trim(),
      heygenAvatarId:    container.querySelector('#st-avatar-id').value.trim(),
      heygenVoiceId:     container.querySelector('#st-voice-id').value.trim(),
      academyName:       container.querySelector('#st-academy-name').value.trim() || 'TechNuggets Academy',
      defaultAudience:   container.querySelector('#st-audience').value,
      defaultDepth:      container.querySelector('#st-depth').value,
    };
    saveSettings(updated);
    const el = container.querySelector('#settings-status');
    el.innerHTML = `<div class="status-bar success">✓ Settings saved.</div>`;
    setTimeout(() => { el.innerHTML = ''; }, 2500);
  });
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

export async function generateFullScript(userMsg, apiKey, maxTokens) {
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
        system: CHAPTER_SYSTEM_PROMPT,
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
        system: CHAPTER_SYSTEM_PROMPT,
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
    settings:   document.querySelector('#tab-settings'),
  };

  renderCurriculum(panels.curriculum, () => switchTab('chapters'));
  renderChapter(panels.chapters);
  renderSlides(panels.render);
  renderPublish(panels.publish);
  renderMarketing(panels.marketing);
  renderSettings(panels.settings);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});
