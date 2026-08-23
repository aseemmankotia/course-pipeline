#!/usr/bin/env python3
"""
make-question-clip.py — render a vertical 1080x1920 question clip for TikTok /
YouTube Shorts / Instagram Reels / Facebook Reels from an existing course question bank.

WHY THIS EXISTS
  The chapter renders in exports/<slug>/videos/ are 1280x720 landscape and ~16 min long,
  so they are the wrong source for vertical short-form (cropping a landscape slide to 9:16
  either letterboxes it or crops the content out). The question banks in
  generated/<slug>/state.json are the real asset: ~9,800 four-option questions across 48
  courses, each already tagged with its exam domain. This renders them natively vertical.

THE 5-BEAT FORMAT
  hook (3s) -> question (9s) -> countdown 3-2-1 (3s) -> answer (10s) -> CTA (5s)
  The countdown beat is the engagement mechanic: it converts passive viewers into
  commenters guessing an option, and drives rewatches. Comments + completion are the two
  strongest ranking signals on TikTok.

COMPLIANCE (same rules as the rest of the pipeline)
  Never promises an exam outcome. No "pass" / "guaranteed" / "first attempt" / "100%".
  Copy is asserted against a banned-phrase list at render time and the script exits
  non-zero rather than emit a violating clip.

USAGE
  python3 scripts/make-question-clip.py --slug=<slug>                 # 1 clip, best candidate
  python3 scripts/make-question-clip.py --slug=<slug> --count=5       # 5 clips
  python3 scripts/make-question-clip.py --slug=<slug> --index=12      # a specific question
  python3 scripts/make-question-clip.py --slug=<slug> --list          # show clip-ready candidates
  python3 scripts/make-question-clip.py --all --count=1               # 1 per course, every course
  python3 scripts/make-question-clip.py --slug=<slug> --frames-only   # PNGs, skip ffmpeg

Output: exports/clips/<slug>/<slug>-q<NNN>.mp4   (+ .json sidecar with the caption)
Requires: Pillow, ffmpeg.
"""

import os, sys, json, glob, math, random, colorsys, subprocess, shutil, textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- args
args = {}
for a in sys.argv[1:]:
    if a.startswith("--"):
        k, _, v = a[2:].partition("=")
        args[k] = v if v else True

SLUG      = args.get("slug")
DO_ALL    = bool(args.get("all"))
COUNT     = int(args.get("count", 1))
ONLY_IDX  = int(args["index"]) if args.get("index") not in (None, True) else None
LIST_ONLY = bool(args.get("list"))
FRAMES_ONLY = bool(args.get("frames-only"))
FPS       = 30

if not SLUG and not DO_ALL:
    print(__doc__)
    sys.exit(1)

# ---------------------------------------------------------------- brand
W, H = 1080, 1920

VENDOR_COLOR = {
    "amazon web services": "#FF9900", "aws": "#FF9900",
    "microsoft": "#0078D4", "google cloud": "#4285F4", "google": "#4285F4",
    "nvidia": "#76B900", "comptia": "#C8202F", "isaca": "#2E1A47",
    "iapp": "#0A66C2", "databricks": "#FF3621", "salesforce": "#00A1E0",
    "anthropic": "#D97757", "hashicorp": "#7B42BC", "pmi": "#0EA5E9",
    "aipmm": "#F59E0B", "gsdc": "#0EA5E9",
}
AMBER = (245, 158, 11)
INK_T, INK_B = (13, 18, 33), (6, 9, 18)
WHITE = (255, 255, 255)
MUTED = (148, 163, 184)
GREEN = (34, 197, 94)

FONT_DIR_CANDIDATES = [
    "/usr/share/fonts/truetype/google-fonts/Poppins-%s.ttf",
    "/Library/Fonts/Poppins-%s.ttf",
    os.path.join(ROOT, "brand", "fonts", "Poppins-%s.ttf"),
]

def font(weight, size):
    for pat in FONT_DIR_CANDIDATES:
        p = pat % weight
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    # graceful fallback so the script still runs on a machine without Poppins
    for fb in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
               "/System/Library/Fonts/Helvetica.ttc"):
        if os.path.exists(fb):
            return ImageFont.truetype(fb, size)
    return ImageFont.load_default()

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def accent_for(slug, vendor):
    """Same hue-rotation trick as make-card.py so same-vendor courses look distinct."""
    base = next((c for k, c in VENDOR_COLOR.items() if k in vendor), "#50E6FF")
    acc = hex2rgb(base)
    r, g, b = [x / 255 for x in acc]
    hh, s, v = colorsys.rgb_to_hsv(r, g, b)
    buckets = [0.12, 0.20, 0.28, 0.36, 0.44, -0.12, -0.20, -0.28, -0.36, -0.44]
    hh = (hh + buckets[sum(ord(c) for c in slug) % len(buckets)]) % 1.0
    s = min(1.0, max(0.45, s))
    r, g, b = colorsys.hsv_to_rgb(hh, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))

# ---------------------------------------------------------------- compliance
BANNED = [
    "guarantee", "guaranteed", "pass the exam", "pass your exam",
    "first attempt", "first try", "100% pass", "pass rate",
]
def assert_clean(*texts):
    joined = " ".join(str(t) for t in texts).lower()
    for phrase in BANNED:
        if phrase in joined:
            raise SystemExit(
                f"COMPLIANCE: clip copy contains banned phrase {phrase!r}. "
                "Never promise exam outcomes — use exam-focused prep framing."
            )

# ---------------------------------------------------------------- question loading
def load_questions(slug):
    p = os.path.join(ROOT, "generated", slug, "state.json")
    if not os.path.exists(p):
        return []
    try:
        data = json.load(open(p))
    except Exception:
        return []
    found = []
    def walk(o):
        if isinstance(o, dict):
            if ("question" in o and isinstance(o.get("options"), list)
                    and len(o["options"]) == 4 and isinstance(o.get("correct_index"), int)):
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    return found

def clip_ready(q, q_max=170, o_max=70):
    """Fits legibly on a 1080x1920 card at arm's length."""
    if not (0 <= q["correct_index"] < 4):
        return False
    if len(str(q["question"])) > q_max:
        return False
    if max(len(str(o)) for o in q["options"]) > o_max:
        return False
    return True

def rank(q):
    """commonly_missed questions make better hooks — they have a real trap in them."""
    return (0 if q.get("commonly_missed") else 1, len(str(q["question"])))

def vendor_for(slug):
    for f in glob.glob(os.path.join(ROOT, "course-configs", "*.json")):
        try:
            cfg = json.load(open(f))
        except Exception:
            continue
        if cfg.get("slug") == slug:
            return (cfg.get("exam_vendor") or "").lower(), (cfg.get("exam_code") or slug)
    return "", slug

# ---------------------------------------------------------------- drawing helpers
def bg(accent, seed):
    img = Image.new("RGB", (W, H), INK_T)
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)],
               fill=tuple(int(INK_T[i] + (INK_B[i] - INK_T[i]) * t) for i in range(3)))
    rnd = random.Random(seed)
    # faint grid
    for x in range(0, W, 90):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 8))
    for y in range(0, H, 90):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 8))
    # soft accent glow top-right
    for r in range(420, 0, -14):
        a = int(16 * (1 - r / 420))
        d.ellipse([W - 220 - r, -160 - r, W - 220 + r, -160 + r], fill=accent + (a,))
    return img, d

def wrap(d, text, fnt, max_w):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=fnt)[2] <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def draw_wrapped(d, x, y, text, fnt, fill, max_w, leading=1.32):
    for ln in wrap(d, text, fnt, max_w):
        d.text((x, y), ln, font=fnt, fill=fill)
        y += int(fnt.size * leading)
    return y

# TikTok / Reels UI safe area. The right ~200px is the like/comment/share rail and the
# bottom ~380px is the caption + nav bar; anything there gets covered on at least one of
# the four target platforms. Keep all content inside SAFE_* and the clip survives all of
# TikTok, YouTube Shorts, Instagram Reels and Facebook Reels without re-layout.
SAFE_TOP, SAFE_BOTTOM = 220, H - 400
SAFE_L, SAFE_R = 72, W - 72

def brandmark(img, d):
    """Lit nugget + wordmark, bottom-LEFT — the bottom-right is TikTok's action rail."""
    p = os.path.join(ROOT, "brand", "png", "technuggets-logo-horizontal-dark-600.png")
    if os.path.exists(p):
        lg = Image.open(p).convert("RGBA")
        tw = 264
        lg = lg.resize((tw, round(lg.height * tw / lg.width)), Image.LANCZOS)
        img.paste(lg, (SAFE_L, SAFE_BOTTOM - lg.height), lg)
    else:
        d.text((SAFE_L, SAFE_BOTTOM - 44), "TechNuggets", font=font("Bold", 34), fill=WHITE)

def block_h(d, parts):
    """Total height of a list of (text, font, leading) so a block can be vertically centred."""
    h = 0
    for text, fnt, leading, gap in parts:
        h += len(wrap(d, text, fnt, SAFE_R - SAFE_L)) * int(fnt.size * leading) + gap
    return h

def centred_start(d, parts):
    return max(SAFE_TOP, SAFE_TOP + ((SAFE_BOTTOM - SAFE_TOP) - block_h(d, parts)) // 2)

def badge(d, x, y, text, accent):
    f = font("Bold", 34)
    bb = d.textbbox((0, 0), text, font=f)
    w, h = bb[2] + 44, bb[3] + 28
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=accent + (48,), outline=accent, width=3)
    d.text((x + 22, y + 12), text, font=f, fill=accent)
    return y + h

# ---------------------------------------------------------------- beats
def frame_hook(accent, seed, exam_code, hook_line):
    img, d = bg(accent, seed)
    f = font("Bold", 86)
    y = centred_start(d, [(hook_line, f, 1.18, 0)]) - 120
    y = badge(d, SAFE_L, y, exam_code.upper(), accent) + 44
    y = draw_wrapped(d, SAFE_L, y, hook_line, f, WHITE, SAFE_R - SAFE_L, 1.18)
    d.text((SAFE_L, y + 56), "Answer in the comments", font=font("Regular", 40), fill=MUTED)
    brandmark(img, d)
    return img

def frame_question(accent, seed, exam_code, q, domain, reveal=None):
    img, d = bg(accent, seed)
    qf, of = font("Bold", 52), font("Medium", 40)

    # measure first so the whole card sits centred inside the UI-safe band
    qlines = len(wrap(d, q["question"], qf, SAFE_R - SAFE_L))
    opt_hs = [40 + 44 * max(1, len(wrap(d, o, of, W - 300))) for o in q["options"]]
    total = 92 + qlines * int(qf.size * 1.30) + 40 + sum(h + 22 for h in opt_hs)
    y = max(SAFE_TOP, SAFE_TOP + ((SAFE_BOTTOM - SAFE_TOP) - total) // 2)

    y = badge(d, SAFE_L, y, exam_code.upper(), accent) + 12
    if domain:
        d.text((SAFE_L, y), str(domain)[:58], font=font("Regular", 30), fill=MUTED)
    y += 56
    y = draw_wrapped(d, SAFE_L, y, q["question"], qf, WHITE, SAFE_R - SAFE_L, 1.30)
    y += 40
    letters = "ABCD"
    for i, opt in enumerate(q["options"]):
        correct = (reveal is not None and i == q["correct_index"])
        dim = (reveal is not None and not correct)
        bh = opt_hs[i]
        fill = (GREEN + (40,)) if correct else (255, 255, 255, 10)
        outline = GREEN if correct else (255, 255, 255, 40)
        d.rounded_rectangle([SAFE_L, y, SAFE_R, y + bh], radius=22, fill=fill, outline=outline, width=3)
        d.text((SAFE_L + 32, y + 20), letters[i], font=font("Bold", 40),
               fill=(GREEN if correct else accent))
        draw_wrapped(d, SAFE_L + 96, y + 18, opt, of, (MUTED if dim else WHITE), W - 300, 1.10)
        y += bh + 22
    brandmark(img, d)
    return img

def frame_countdown(accent, seed, n):
    img, d = bg(accent, seed)
    cx, cy, r = W // 2, (SAFE_TOP + SAFE_BOTTOM) // 2, 210
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 40), width=10)
    sweep = 360 * (n / 3.0)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + sweep, fill=accent, width=16)
    f = font("Bold", 220)
    bb = d.textbbox((0, 0), str(n), font=f)
    d.text((cx - bb[2] // 2, cy - bb[3] // 2 - 24), str(n), font=f, fill=WHITE)
    t = "Locking in your answer..."
    ft = font("Regular", 42)
    bb = d.textbbox((0, 0), t, font=ft)
    d.text((cx - bb[2] // 2, cy + r + 70), t, font=ft, fill=MUTED)
    brandmark(img, d)
    return img

def frame_answer(accent, seed, exam_code, q):
    img, d = bg(accent, seed)
    letters = "ABCD"
    ci = q["correct_index"]
    af, wf = font("Bold", 54), font("Regular", 42)
    why = q.get("why_correct") or ""
    parts = [(q["options"][ci], af, 1.26, 86 + 46 + 40)]
    if why:
        parts.append((why, wf, 1.34, 0))
    y = centred_start(d, parts)
    y = badge(d, SAFE_L, y, f"ANSWER: {letters[ci]}", GREEN) + 44
    y = draw_wrapped(d, SAFE_L, y, q["options"][ci], af, WHITE, SAFE_R - SAFE_L, 1.26)
    y += 46
    d.line([(SAFE_L, y), (SAFE_R, y)], fill=(255, 255, 255, 40), width=3)
    y += 40
    if why:
        draw_wrapped(d, SAFE_L, y, why, wf, (226, 232, 240), SAFE_R - SAFE_L, 1.34)
    brandmark(img, d)
    return img

def frame_cta(accent, seed):
    img, d = bg(accent, seed)
    hf, sf, bf = font("Bold", 84), font("Regular", 44), font("Bold", 60)
    sub = "Exam-style questions with a written explanation for every option."
    y = centred_start(d, [("36 free practice tests", hf, 1.16, 24),
                          (sub, sf, 1.30, 60),
                          ("technuggets.academy", bf, 1.0, 110)])
    y = draw_wrapped(d, SAFE_L, y, "36 free practice tests", hf, WHITE, SAFE_R - SAFE_L, 1.16)
    y += 24
    y = draw_wrapped(d, SAFE_L, y, sub, sf, MUTED, SAFE_R - SAFE_L, 1.30)
    y += 60
    bb = d.textbbox((0, 0), "technuggets.academy", font=bf)
    d.rounded_rectangle([SAFE_L, y, SAFE_L + bb[2] + 72, y + bb[3] + 56], radius=20, fill=AMBER)
    d.text((SAFE_L + 36, y + 22), "technuggets.academy", font=bf, fill=(15, 26, 47))
    d.text((SAFE_L, y + bb[3] + 108), "No sign-up.", font=font("Regular", 40), fill=MUTED)
    brandmark(img, d)
    return img

# ---------------------------------------------------------------- render one clip
def render_clip(slug, q, qi, vendor, exam_code, outdir):
    accent = accent_for(slug, vendor)
    seed = sum(ord(c) for c in slug) + qi
    hook = ("Most people miss this one." if q.get("commonly_missed")
            else f"Can you get this {exam_code.upper()} question right?")
    assert_clean(hook, q["question"], *q["options"], q.get("why_correct", ""))

    beats = []  # (PIL image, seconds)
    beats.append((frame_hook(accent, seed, exam_code, hook), 3.0))
    beats.append((frame_question(accent, seed, exam_code, q, q.get("domain")), 9.0))
    for n in (3, 2, 1):
        beats.append((frame_countdown(accent, seed, n), 1.0))
    beats.append((frame_question(accent, seed, exam_code, q, q.get("domain"), reveal=True), 3.0))
    beats.append((frame_answer(accent, seed, exam_code, q), 7.0))
    beats.append((frame_cta(accent, seed), 5.0))

    os.makedirs(outdir, exist_ok=True)
    stem = f"{slug}-q{qi:03d}"
    fdir = os.path.join(outdir, f".frames-{stem}")
    os.makedirs(fdir, exist_ok=True)
    listfile = os.path.join(fdir, "concat.txt")
    with open(listfile, "w") as fh:
        for i, (im, secs) in enumerate(beats):
            fp = os.path.join(fdir, f"{i:02d}.png")
            im.save(fp)
            fh.write(f"file '{os.path.abspath(fp)}'\nduration {secs}\n")
        fh.write(f"file '{os.path.abspath(os.path.join(fdir, f'{len(beats)-1:02d}.png'))}'\n")

    total = sum(s for _, s in beats)
    mp4 = os.path.join(outdir, f"{stem}.mp4")

    if FRAMES_ONLY or not shutil.which("ffmpeg"):
        print(f"  frames only -> {os.path.relpath(fdir, ROOT)}  ({total:.0f}s planned)")
        return None, total

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
           "-i", listfile, "-vf", f"fps={FPS},format=yuv420p",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-movflags", "+faststart", mp4]
    subprocess.run(cmd, check=True)
    shutil.rmtree(fdir, ignore_errors=True)

    letters = "ABCD"
    caption = (f"{exam_code.upper()} practice question — can you get it? "
               f"Answer: {letters[q['correct_index']]}. "
               f"Free practice tests for 36 AI & cloud certs, no sign-up: technuggets.academy")
    tags = ["#certification", "#examprep", "#cloudcomputing", "#itcareer",
            "#" + exam_code.lower().replace("-", "").replace(" ", "")]
    json.dump({
        "slug": slug, "question_index": qi, "exam_code": exam_code,
        "domain": q.get("domain"), "correct": letters[q["correct_index"]],
        "commonly_missed": bool(q.get("commonly_missed")),
        "duration_s": total, "caption": caption, "hashtags": tags,
    }, open(os.path.join(outdir, f"{stem}.json"), "w"), indent=1)
    return mp4, total

# ---------------------------------------------------------------- main
def run_slug(slug, count):
    vendor, exam_code = vendor_for(slug)
    qs = load_questions(slug)
    ready = [(i, q) for i, q in enumerate(qs) if clip_ready(q)]
    if not ready:
        print(f"  {slug}: no clip-ready questions ({len(qs)} total)")
        return 0
    if LIST_ONLY:
        print(f"{slug}: {len(ready)} clip-ready / {len(qs)} total")
        for i, q in sorted(ready, key=lambda t: rank(t[1]))[:count]:
            flag = "MISSED" if q.get("commonly_missed") else "      "
            print(f"  [{i:3d}] {flag} {str(q['question'])[:88]}")
        return len(ready)

    if ONLY_IDX is not None:
        picks = [(ONLY_IDX, qs[ONLY_IDX])]
    else:
        picks = sorted(ready, key=lambda t: rank(t[1]))[:count]

    outdir = os.path.join(ROOT, "exports", "clips", slug)
    made = 0
    for qi, q in picks:
        try:
            mp4, dur = render_clip(slug, q, qi, vendor, exam_code, outdir)
            if mp4:
                print(f"  wrote {os.path.relpath(mp4, ROOT)}  ({dur:.0f}s)")
            made += 1
        except SystemExit:
            raise
        except Exception as e:
            print(f"  ! q{qi} failed: {e}")
    return made

if DO_ALL:
    slugs = sorted({os.path.basename(os.path.dirname(p))
                    for p in glob.glob(os.path.join(ROOT, "generated", "*", "state.json"))})
    tot = 0
    for s in slugs:
        n = run_slug(s, COUNT)
        tot += n or 0
    print(f"\n{tot} clips across {len(slugs)} courses")
else:
    run_slug(SLUG, COUNT)
