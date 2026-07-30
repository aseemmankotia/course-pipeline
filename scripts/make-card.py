#!/usr/bin/env python3
"""
make-card.py — generic TEXT-FREE 750x422 Udemy course card for any slug.

Udemy rejects course images containing text (logo-only exception), so this
draws a purely abstract, vendor-tinted tech motif (gradient + node mesh +
flow lines + accent diamonds — the portfolio's visual signature). No text.

Reads the matching course-configs/*.json (by slug) to pick a brand accent
from exam_vendor, then writes exports/course-images/<slug>-card-notext.png.

Usage:
  python3 scripts/make-card.py --slug=<slug>
  python3 scripts/make-card.py --slug=<slug> --color=#RRGGBB   # override accent
"""
import os, sys, json, math, random, glob

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess
    print("Pillow missing — installing it once…")
    subprocess.run([sys.executable, "-m", "pip", "install", "Pillow", "--break-system-packages", "--quiet"], check=False)
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        sys.exit("Pillow install failed — run: pip3 install Pillow --break-system-packages")

ROOT = os.path.join(os.path.dirname(__file__), "..")
args = {}
for a in sys.argv[1:]:
    if a.startswith("--"):
        k, _, v = a[2:].partition("=")
        args[k] = v or True
slug = args.get("slug")
if not slug:
    sys.exit("Usage: python3 scripts/make-card.py --slug=<slug> [--color=#RRGGBB]")

# vendor -> accent color (brand-ish). Falls back to a neutral cyan.
VENDOR_COLOR = {
    "amazon web services": "#FF9900", "aws": "#FF9900",
    "microsoft": "#0078D4", "google cloud": "#4285F4", "google": "#4285F4",
    "nvidia": "#76B900", "comptia": "#C8202F", "isaca": "#2E1A47",
    "iapp": "#0A66C2", "databricks": "#FF3621", "salesforce": "#00A1E0",
    "anthropic": "#D97757",
}

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# resolve config + vendor
vendor = ""
for f in glob.glob(os.path.join(ROOT, "course-configs", "*.json")):
    try:
        cfg = json.load(open(f))
    except Exception:
        continue
    if cfg.get("slug") == slug:
        vendor = (cfg.get("exam_vendor") or "").lower()
        break

accent_hex = args.get("color") if isinstance(args.get("color"), str) else None
if not accent_hex:
    accent_hex = next((c for k, c in VENDOR_COLOR.items() if k in vendor), "#50E6FF")
ACCENT = hex2rgb(accent_hex)

W, H = 750, 422
random.seed(sum(ord(c) for c in slug))  # deterministic per slug

def blend(c, bg, a):
    return tuple(int(c[i] * a + bg[i] * (1 - a)) for i in range(3))

bg_top, bg_bot = (13, 18, 33), (6, 9, 18)
img = Image.new("RGB", (W, H), bg_top)
d = ImageDraw.Draw(img, "RGBA")
for y in range(H):
    t = y / (H - 1)
    d.line([(0, y), (W, y)], fill=tuple(int(bg_top[i] + (bg_bot[i] - bg_top[i]) * t) for i in range(3)))

# faint grid
for x in range(0, W, 30):
    d.line([(x, 0), (x, H)], fill=(255, 255, 255, 7))
for y in range(0, H, 30):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 7))

# central radiating burst (generative motif)
cx, cy = 250, 214
for i in range(26):
    ang = i * (2 * math.pi / 26) + 0.2
    r1 = 150 + 22 * math.sin(i * 1.5)
    x1, y1 = cx + r1 * math.cos(ang), cy + r1 * math.sin(ang)
    d.line([(cx + 34 * math.cos(ang), cy + 34 * math.sin(ang)), (x1, y1)], fill=ACCENT + (140,), width=3)
    d.ellipse([x1 - 5, y1 - 5, x1 + 5, y1 + 5], fill=ACCENT + (210,))
for k in range(3):
    rad = 58 + k * 22
    d.arc([cx - rad, cy - rad, cx + rad, cy + rad], start=k * 80 + 10, end=k * 80 + 160, fill=ACCENT + (170,), width=4)
d.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(255, 255, 255, 35))
d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=(255, 255, 255, 235))

# right-side node mesh (structure motif)
nodes = []
for col, xb in enumerate((510, 600, 690)):
    for i in range(9 - col):
        nodes.append((xb + random.randint(-8, 8), 60 + i * (36 + col * 4) + random.randint(-6, 6)))
for a in nodes:
    for b in nodes:
        if a is not b and math.hypot(a[0] - b[0], a[1] - b[1]) < 80:
            d.line([a, b], fill=(150, 170, 210, 45), width=1)
for i, n in enumerate(nodes):
    c = ACCENT if i % 3 else (255, 255, 255)
    d.ellipse([n[0] - 4, n[1] - 4, n[0] + 4, n[1] + 4], fill=c + (210,))

# flowing telemetry lines along the bottom
for row, base in enumerate((330, 360, 388)):
    pts = [(20 + i * 26, base + int(16 * math.sin(i * 0.7 + row) + random.randint(-5, 5))) for i in range(28)]
    col = ACCENT if row == 0 else blend(ACCENT, (255, 255, 255), 0.6)
    d.line(pts, fill=col + (160,), width=2)

# accent diamonds (portfolio signature)
for _ in range(9):
    x, y = random.randint(340, 470), random.randint(60, 360)
    s = 6
    d.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=ACCENT + (200,))

OUT = os.path.join(ROOT, "exports", "course-images")
os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, f"{slug}-card-notext.png")
img.save(path)
print(f"wrote {os.path.relpath(path, ROOT)}  ({W}x{H}, accent {accent_hex}, vendor '{vendor or 'n/a'}')")
