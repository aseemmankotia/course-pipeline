# TechNuggets Academy — Course Pipeline

Browser-based pipeline for creating full multi-chapter tutorial courses for YouTube.

## Workflow

```
📚 Curriculum → ✏️ Chapters → 🎬 Render → 📤 Publish
```

1. **Curriculum** — Enter a topic, pick depth (4-15 chapters), Claude designs the full curriculum with chapter breakdown, concepts, hands-on exercises, and quiz questions.
2. **Chapters** — Generate a video script per chapter. Edit in-browser, make shorter/longer, mark as ready.
3. **Render** — Download `course-render-input.json` per chapter, run `npm run render:chapter` to produce `chapter-N-title.mp4` via Puppeteer + FFmpeg.
4. **Publish** — Create a YouTube playlist, upload chapters in order with auto-generated titles/descriptions, generate a course landing page.

## Setup

```bash
git clone https://github.com/aseemmankotia/course-pipeline.git
cd course-pipeline
npm install

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

Open `index.html` in a browser (or `npm start` on Mac).

## Requirements

- **Browser**: Chrome/Edge/Firefox (ES modules, localStorage)
- **Node.js** ≥ 18: for rendering chapters
- **ffmpeg**: `brew install ffmpeg`
- **Anthropic API key**: for curriculum + script generation (primary)
- **Google Gemini API key**: optional fallback (free tier available)

## AI Provider Setup

The pipeline uses **Claude (Anthropic)** as the primary AI for curriculum design, script generation, materials, and marketing. When Claude hits a credit or balance error, **Gemini Flash (Google)** is used automatically — no manual intervention needed.

### Anthropic (Claude) — primary
1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key → paste into ⚙️ Settings → **Anthropic API Key**

### Google Gemini — fallback
1. Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Paste into ⚙️ Settings → **Google Gemini API Key**
3. Gemini Flash activates automatically on Anthropic balance/credit errors, or if no Claude key is configured

Click **🤖 Test AI providers** in Settings to verify both keys are working.

## Rendering a Chapter

1. In the **Render** tab, click **Render** next to a chapter with a ready script
2. `course-render-input.json` downloads automatically
3. Place your HeyGen avatar MP4 in the project root as `heygen-chapter-N.mp4`
4. Run:

```bash
npm run render:chapter
# → chapter-01-what-is-kubernetes.mp4
```

## Batch Rendering

Download render input files from the Render tab for each chapter, saving them as `course-render-input-1.json`, `course-render-input-2.json`, etc.

```bash
npm run render:all
# → chapter-01-*.mp4, chapter-02-*.mp4, ...
```

## Project Structure

```
course-pipeline/
├── index.html              # App entry point
├── styles.css              # Udemy-inspired light theme
├── app.js                  # Tab routing + settings
├── components/
│   ├── curriculum.js       # Step 1: curriculum generator
│   ├── chapter.js          # Step 2: chapter script editor
│   ├── slides.js           # Step 3: render UI
│   └── publish.js          # Step 4: YouTube publish + landing page
├── render/
│   ├── course-render.js    # Node.js: Puppeteer + FFmpeg per chapter
│   ├── course-render-all.js # Node.js: batch render all chapters
│   ├── slides/             # Generated slide PNGs (gitignored)
│   └── temp/               # FFmpeg temp files (gitignored)
├── docs/courses/           # Generated landing pages (gitignored)
├── .env.example
└── package.json
```

## Slide Types

| Type | Description |
|------|-------------|
| `chapter_title` | Dark navy hero, chapter number, progress dots |
| `concept` | White bg, red-pink accent bullets |
| `code` | Light gray code block, JetBrains Mono, language badge |
| `live_code` | Dark Jupyter-aesthetic cell with animated typing + output (dataframe / text / plot / error) |
| `analogy` | Split pane: everyday thing ↔ technical concept |
| `diagram` | Mermaid.js with light theme, red-pink primary nodes |
| `quiz` | 4-option MCQ, correct answer highlighted |
| `chapter_summary` | Key takeaway + next chapter preview |

## Color Palette

| Name | Hex |
|------|-----|
| Background | `#ffffff` |
| Primary (navy) | `#1a1a2e` |
| Accent (red-pink) | `#e94560` |
| Secondary | `#16213e` |
| Text | `#2d2d2d` |
| Muted | `#6b7280` |

## API Keys Needed

| Key | Where to get |
|-----|-------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| YouTube Client ID/Secret | Google Cloud Console → YouTube Data API v3 |
| HeyGen Avatar/Voice ID | app.heygen.com |

---

TechNuggets Academy by Aseem Mankotia
