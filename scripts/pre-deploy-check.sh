#!/bin/bash
set -euo pipefail

echo "🚀 Course Pipeline — Pre-deployment checks"
echo "==========================================="

# ── Run tests ────────────────────────────────────────────────────────────────
echo ""
echo "📋 Running test suite..."
npm test
echo "✅ Tests passed"

# ── Check required files ─────────────────────────────────────────────────────
echo ""
echo "📁 Checking required files..."

FILES=(
  "index.html"
  "app.js"
  "styles.css"
  "package.json"
  "components/curriculum.js"
  "components/chapter.js"
  "components/slides.js"
  "components/publish.js"
  "render/course-render.js"
  "render/course-render-all.js"
)

ALL_OK=true
for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "  ✅ $FILE"
  else
    echo "  ❌ Missing: $FILE"
    ALL_OK=false
  fi
done

if [ "$ALL_OK" = false ]; then
  echo ""
  echo "❌ One or more required files are missing. Fix before deploying."
  exit 1
fi

# ── Check .env ───────────────────────────────────────────────────────────────
echo ""
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found."
  echo "   Copy .env.example to .env and add your API keys before running locally."
else
  echo "✅ .env exists"
fi

# ── Check node_modules ───────────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "⚠️  Warning: node_modules not found. Run 'npm install' first."
else
  echo "✅ node_modules installed"
fi

echo ""
echo "✅ All pre-deployment checks passed — safe to deploy! 🚀"
