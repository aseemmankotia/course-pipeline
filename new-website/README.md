# new-website — TechNuggets Academy rebrand handoff

**Read this file first. It is written for another agent picking up this work.**

Prepared 2026-08-14. The rebrand has been applied in **two** places:

1. `~/course-pipeline/site` — the current output, so it is correct right now.
2. `~/course-pipeline/scripts/build-practice-site.js` — the **generator**, so it stays
   correct after the next run. This is the one that matters.

What remains is verifying a generator run and publishing. Both are described below.

---

## 1. The one fact that matters most

**`~/course-pipeline/site` is the source of truth for the website. The GitHub repo
`aseemmankotia/aseemmankotia.github.io` is a stale publish target.**

At the time of writing:

| | local `site/` | GitHub repo |
|---|---|---|
| HTML pages | 176 | 153 |
| Image assets | all present | **none** |
| `style.css` | has `.brandbar` / `.hero` / `.trust` / `.vchip` | missing them |

The live site renders unstyled and has four 404s **purely because the repo is behind**,
not because anything is broken. `index.html` in the repo references `logo.png`,
`favicon.ico`, `icon-192.png`, `apple-touch-icon.png` and `icon-512.png`, none of which
exist there.

Do **not** start work from the repo. Start from `site/`, or better, from whatever
generates it.

Publishing is: copy `site/` → repo working tree → commit → push.

---

## 2. Brand

Source assets live in `~/course-pipeline/brand` (see its own README). The mark is a
faceted amber hexagon — nugget plus cert-badge — with a white knowledge spark.

| Token | Hex | Use |
|---|---|---|
| Nugget amber | `#F59E0B` | primary mark, CTA fill, chip accent |
| Amber deep | `#B45309` | links, CTA gradient start, mark outline |
| Amber light | `#FBBF24` | highlights, CTA gradient end |
| Ember | `#7C2D12` | urgency text, CTA button label |
| Ink navy | `#0F172A` | headings, body text, secondary button |
| Slate | `#475569` | supporting copy |

Surfaces are **warm** neutral — `--bg #FCFAF6`, `--line #E7E3DA`. The previous palette
used cool slate (`#f8fafc` / `#e2e8f0`), and amber reads muddy against cool grey. If you
change surfaces, keep them warm.

Typography is Inter with a system fallback, declared in `--font`.

---

## 3. What is in this folder

```
new-website/
  README.md            this file — start here
  generator.patch      unified diff of the build-practice-site.js changes
  build-practice-site.js.ORIGINAL.bak   pre-rebrand generator, for rollback
  style.css            drop-in replacement for site/style.css
  apply-to-site.sh     idempotent; applies everything below to a site/ folder
  LINK-AUDIT.md        verified link-checking results, and how to re-run them
  assets/
    icon.svg           square nugget mark — REQUIRED by the CSS watermarks
    logo.svg           horizontal lockup, light backgrounds
    logo-dark.svg      horizontal lockup, dark backgrounds
    og-image.png       1200x630 social share card
```

Quick start:

```bash
cd ~/course-pipeline/new-website
./apply-to-site.sh                 # defaults to ~/course-pipeline/site
```

It is idempotent and ends with a pass/fail verification. It has **already been run** —
`site/` is currently in the rebranded state. Re-run it after any pipeline run, until the
changes are pushed upstream into the generator (section 5).

---

## 4. What was changed, and why

### 4.1 `style.css` — full replacement

Rewritten as a token-based system. **It keeps every class the generator emits**, so no
HTML changes are required for the visual rebrand:

`.wrap` `.brandbar` `header`/`h1` `.sub` `.hero` `.chip` `.facts` `.fact` `.cta-row`
`.urgency` `.btn` `.enroll` `.course` `.practice` `.ghost` `.trust` `.card` `.vchip`
`.actions` `.qcard` `.q` `.opt` `.correct` `.wrong` `.expl` `.meta` `.score` `.gaps`
`.cta` `.strike` `.price` `.code` `.faq` `.domains` `.badge` `.live` `.soon` `.deal`
`footer`

Two consequences worth understanding before you edit it:

- **The hero moved from dark navy to light amber.** That forced `.btn.ghost` (was white
  translucent) to become solid ink navy, and `.urgency` (was `#fdba74`) to become ember
  `#7C2D12`. Both were designed for a dark background and would be invisible on the new
  one. If you ever revert the hero to dark, revert those two together.
- **Legacy compatibility vars are retained** — `--acc`, `--cta`, `--cta-h`, `--txt`,
  `--dim`, `--vendor` still exist and are remapped to brand values, because generated
  pages contain inline `style="color:var(--acc)"` and `<style>:root{--vendor:#FF9900}</style>`.
  Do not delete them.

### 4.2 Logos placed via CSS, not markup — deliberate

The nugget appears in three places through CSS only:

- `.hero::after` — watermark, top right, 10% opacity
- `.cta::after` — watermark, bottom left, 13% opacity
- `footer::before` — 32px mark above the footer text

**This was intentional.** The pipeline regenerates the HTML, so anything written into
those files gets erased on the next run. Styling survives. If you add logos to the
generator templates later, remove the CSS versions to avoid doubling up.

All of this depends on `icon.svg` sitting next to `style.css` in the published root.

### 4.3 Domain move to `technuggets.academy`

Applied across all 176 pages plus `sitemap.xml` and `robots.txt`:

- every `<link rel="canonical">` and `og:` URL rewritten off `aseemmankotia.github.io`
- `og:image` repointed from `icon-512.png` to `og-image.png`, and
  `twitter:card` / `twitter:image` added
- `theme-color` changed `#0f172a` → `#F59E0B`
- SVG favicon added alongside the PNG one
- `CNAME` file written containing `technuggets.academy`

### 4.4 Small correctness fix

The logo `<img>` carried `width="200" height="34"`, but `logo.png` is 600×150 — a 4:1
image. The reserved box was the wrong shape, causing layout shift on load. Corrected to
`width="200" height="50"`. **Fix this in the generator template too**, or it comes back.

---

## 5. The generator — already patched, needs one verification run

### 5.1 Where everything lives

`scripts/build-practice-site.js` (~670 lines) builds the whole site from the question
banks in `generated/<slug>/state.json`. Relevant parts, by their role:

| What | Where |
|---|---|
| `SITE_URL` constant | near the top — now `https://technuggets.academy` |
| `const CSS = \`...\`` | the entire stylesheet, written to `site/style.css` |
| `head(title, desc, canonicalPath, accent)` | the `<head>` block for every page |
| `brandbar()` | the logo bar at the top of every page |
| `copyBrand()` | copies assets out of `brand/` into `site/` |
| sitemap / robots / CNAME writes | near the bottom, after the page loop |

### 5.2 The critical fact

```js
if (require.main === module) {
  fs.rmSync(OUT, { recursive: true, force: true });   // <-- site/ is DELETED
  fs.mkdirSync(OUT, { recursive: true });
```

**Every run wipes `site/` completely and regenerates it.** Nothing hand-edited in
`site/` survives. That is why the changes had to go into the generator, and why
`apply-to-site.sh` is only a stopgap.

### 5.3 What was changed in the generator

See `generator.patch` for the exact diff. Six edits:

1. `SITE_URL` → `https://technuggets.academy`.
2. `const CSS` block replaced with the amber design system (this is the same content as
   `new-website/style.css`).
3. `head()` — SVG favicon added, `theme-color` → `#F59E0B`, `og:site_name` and `og:url`
   added, `og:image` moved from `icon-512.png` to `og-image.png`, `twitter:card` and
   `twitter:image` added.
4. `brandbar()` — `height="34"` → `height="50"` (the logo is 600×150, a 4:1 image; the
   old box was the wrong shape and caused layout shift).
5. `copyBrand()` — now also copies `technuggets-icon.svg` → `icon.svg`,
   the two horizontal SVG lockups, and `png/og-image.png` → `og-image.png`.
   **`icon.svg` is required** — the CSS uses it for the hero, CTA and footer marks.
6. A `CNAME` file is now written alongside `robots.txt`, derived from `SITE_URL`.

`og-image.png` was added to `brand/png/` so `copyBrand()` can find it.

### 5.4 What you need to do: run it once and verify

The patched generator passes `node --check`, but it has **not been executed** — the
remote file bridge used to make these edits cannot perform deletes, so `fs.rmSync` fails
there. It needs one run from a normal terminal on the Mac:

```bash
cd ~/course-pipeline
node scripts/build-practice-site.js
```

Then run the verification in section 7. Expect **176 pages, 0 broken links, 0 missing
assets, 0 stale domain references**, and these files present in `site/`:
`style.css icon.svg logo.svg logo-dark.svg logo.png og-image.png favicon.ico
icon-192.png icon-512.png apple-touch-icon.png CNAME quiz.js robots.txt sitemap.xml`.

To roll back:

```bash
cp ~/course-pipeline/new-website/build-practice-site.js.ORIGINAL.bak \
   ~/course-pipeline/scripts/build-practice-site.js
```

A pre-run copy of the site output is **not** kept automatically. Take one first if you
want a diff target:

```bash
cp -a ~/course-pipeline/site /tmp/site-before && node scripts/build-practice-site.js
diff -rq /tmp/site-before ~/course-pipeline/site | head -40
```

## 6. Publishing — DNS FIRST

**Order matters. Get this wrong and the site goes dark until DNS propagates.** The
`CNAME` file makes GitHub Pages redirect `aseemmankotia.github.io` to
`technuggets.academy`; if that domain does not resolve yet, there is nowhere to land.

### 6.1 DNS at the registrar

Apex `technuggets.academy` — four `A` records:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Optional but recommended, four `AAAA` records:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

`www` subdomain — one `CNAME`: `www.technuggets.academy` → `aseemmankotia.github.io`

Then repo **Settings → Pages → Custom domain** → `technuggets.academy` → Save, and tick
**Enforce HTTPS** once the certificate is issued (usually under an hour).

Verify before continuing:

```bash
dig technuggets.academy +short     # expect the four GitHub IPs
```

### 6.2 Push

```bash
cd /path/to/aseemmankotia.github.io
git pull
rsync -a --delete --exclude '.git' --exclude '_to_delete' --exclude '_backup' ~/course-pipeline/site/ .
git add -A
git status                     # expect ~23 new pages + all image assets + CNAME
git commit -m "Rebrand around TechNuggets logo; publish 176 pages; move to technuggets.academy"
git push
```

Note `--delete` will remove repo files absent from `site/`. Review `git status` before
committing the first time.

Also delete the leftover probe branch:

```bash
git push origin --delete rebrand-test-probe
```

### 6.3 A note for agents working in a cloud sandbox

`git push` to this repo is refused by the git proxy ("not in this session's authorized
repository set") unless the repo is attached as a session source at task start. The
GitHub connector has write access but its file API is text-only, so it cannot carry the
PNGs. Attach the repo as a source when starting the task, or push from the Mac.

---

## 7. Verification checks

Run from the site folder. All three should come back clean.

```bash
# broken internal links and missing assets
python3 - <<'PY'
import re, glob, os
miss = {(f, l) for f in glob.glob('*.html')
        for l in re.findall(r'href="([a-z0-9\-\.]+\.html)"', open(f).read())
        if not os.path.exists(l)}
srcs = {s for f in glob.glob('*.html')
        for s in re.findall(r'(?:src|href)="([a-z0-9\-\.]+\.(?:png|svg|ico|css|js))"', open(f).read())}
print('pages:', len(glob.glob('*.html')))
print('broken internal links:', sorted(miss) or 'NONE')
print('missing assets:', [s for s in sorted(srcs) if not os.path.exists(s)] or 'NONE')
PY

# no stale domain anywhere
grep -l 'aseemmankotia\.github\.io' *.html sitemap.xml robots.txt 2>/dev/null | wc -l   # expect 0

# every page carries the brand meta
ls *.html | wc -l
grep -l 'theme-color" content="#F59E0B"' *.html | wc -l                                  # expect equal
```

Last verified state: **176 pages, 0 broken internal links, 0 missing assets, 0 stale
domain references, sitemap covers every page.**

---

## 8. Open items

1. **Run the patched generator once and verify** (section 5.4). It is edited and
   syntax-checked but never executed.
2. **`site/_to_delete/`** holds `style.css.pre-rebrand.bak`, the previous stylesheet.
   Delete the folder before publishing, or exclude it (the rsync above already does).
3. **Email signup endpoint.** The *repo* copy of `index.html` has a subscribe form
   posting to `https://REPLACE-WITH-YOUR-HOST/subscribe`, which always fails. The local
   `site/index.html` has no subscribe block at all — decide whether the form should
   exist in the generated site, and if so wire a real endpoint.
4. **Coupon expiry text is hardcoded.** Pages say "Deal ends August 22" and
   "valid through August 22" in the hero, CTA and FAQ. Confirm the pipeline updates
   these, or they will go stale in public.
5. **Leftover remote branch** `rebrand-test-probe`.

---

## 9. Superseded work — ignore it

An earlier pass rebuilt the *repo* copy directly: 157 pages, four hand-written practice
tests for PMI CPMAI, GSDC CFDE, AWS DEA-C01 and Google Cloud ACE, delivered as a zip in
conversation. That was done before the local `site/` folder was found.

**The local folder wins.** It already contains those four tests — generated by the
pipeline, with better domain coverage — plus 19 domain sub-pages the repo version lacks.
Do not merge the zip.
