#!/usr/bin/env bash
#
# apply-to-site.sh — apply the TechNuggets rebrand to a generated site folder.
#
# Idempotent: safe to re-run after every pipeline run until the changes are pushed
# upstream into the generator (see README.md section 5).
#
#   Usage:  ./apply-to-site.sh [path-to-site-folder]
#   Default target: ~/course-pipeline/site
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE="${1:-$HOME/course-pipeline/site}"
OLD_DOMAIN="aseemmankotia.github.io"
NEW_DOMAIN="technuggets.academy"

[ -d "$SITE" ] || { echo "error: site folder not found: $SITE" >&2; exit 1; }
[ -f "$SITE/index.html" ] || { echo "error: $SITE has no index.html — wrong folder?" >&2; exit 1; }

cd "$SITE"
echo "==> target: $SITE"

# ---------------------------------------------------------------- 1. stylesheet
if [ -f style.css ] && ! cmp -s style.css "$HERE/style.css"; then
  mkdir -p _backup
  cp -p style.css "_backup/style.css.$(date +%Y%m%d%H%M%S)"
  echo "    previous style.css saved to _backup/ (exclude this dir when publishing)"
fi
cp "$HERE/style.css" style.css
echo "==> style.css installed"

# -------------------------------------------------------------------- 2. assets
cp "$HERE/assets/icon.svg"      icon.svg
cp "$HERE/assets/logo.svg"      logo.svg
cp "$HERE/assets/logo-dark.svg" logo-dark.svg
cp "$HERE/assets/og-image.png"  og-image.png
echo "==> brand assets installed (icon.svg is required by the CSS watermarks)"

# --------------------------------------------------------------- 3. domain move
# canonical, og:url, sitemap, robots
sed -i.tmp "s#https://${OLD_DOMAIN}#https://${NEW_DOMAIN}#g" ./*.html sitemap.xml robots.txt 2>/dev/null || true
rm -f ./*.tmp sitemap.xml.tmp robots.txt.tmp
echo "==> domain rewritten to ${NEW_DOMAIN}"

# ------------------------------------------------------- 4. social + icon meta
# og:image -> og-image.png, plus twitter card tags (guarded: only if not already done)
for f in ./*.html; do
  if ! grep -q 'twitter:card' "$f"; then
    perl -0pi -e "s{<meta property=\"og:image\" content=\"https://\Q${NEW_DOMAIN}\E/icon-512\.png\">}"\
"{<meta property=\"og:image\" content=\"https://${NEW_DOMAIN}/og-image.png\">\n"\
"<meta name=\"twitter:card\" content=\"summary_large_image\">\n"\
"<meta name=\"twitter:image\" content=\"https://${NEW_DOMAIN}/og-image.png\">}" "$f"
  fi
  # svg favicon alongside the png one
  if ! grep -q 'image/svg+xml' "$f"; then
    perl -0pi -e 's{<link rel="icon" type="image/png" href="icon-192\.png">}'\
'{<link rel="icon" type="image/svg\+xml" href="icon.svg">\n<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">}' "$f"
  fi
done
# brand theme colour
perl -0pi -e 's{<meta name="theme-color" content="#0f172a">}{<meta name="theme-color" content="#F59E0B">}g' ./*.html
# logo.png is 600x150 (4:1) — the old 200x34 box reserved the wrong shape
perl -0pi -e 's{width="200" height="34"}{width="200" height="50"}g' ./*.html
echo "==> social, favicon, theme-colour and logo-dimension meta applied"

# --------------------------------------------------------------------- 5. CNAME
echo "${NEW_DOMAIN}" > CNAME
echo "==> CNAME written (${NEW_DOMAIN}) — DNS must resolve BEFORE this is published"

# ---------------------------------------------------------------- 6. verify
echo
echo "==> verification"
set +e
python3 - <<'PY2'
import re, glob, os
pages = sorted(glob.glob('*.html'))
miss = {(f, l) for f in pages
        for l in re.findall(r'href="([a-z0-9\-\.]+\.html)"', open(f).read())
        if not os.path.exists(l)}
srcs = {s for f in pages
        for s in re.findall(r'(?:src|href)="([a-z0-9\-\.]+\.(?:png|svg|ico|css|js))"', open(f).read())}
gone = [s for s in sorted(srcs) if not os.path.exists(s)]
stale = [f for f in pages + ['sitemap.xml', 'robots.txt']
         if os.path.exists(f) and 'aseemmankotia.github.io' in open(f).read()]
print(f"    pages ................. {len(pages)}")
print(f"    broken internal links . {sorted(miss) or 'NONE'}")
print(f"    missing assets ........ {gone or 'NONE'}")
print(f"    stale domain refs ..... {stale or 'NONE'}")
raise SystemExit(1 if (miss or gone or stale) else 0)
PY2
RESULT=$?
set -e

if [ "$RESULT" -ne 0 ]; then
  echo
  echo "!!  VERIFICATION FAILED — fix the items listed above before publishing."
  exit 1
fi

echo
echo "==> done, all checks clean."
echo "    Remember: DNS must resolve before this is published (README.md section 6)."
