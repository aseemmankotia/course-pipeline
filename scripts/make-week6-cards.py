#!/usr/bin/env python3
"""Text-free 750x422 Udemy course cards for week-6 courses.
Udemy rejects any text on the promo thumbnail (logo-only exception), so these
are purely abstract, brand-tinted tech motifs — consistent with the portfolio
(dark background, accent diamonds, flowing lines).
Outputs:
  exports/course-images/gcp-genai-leader-card-notext.png
  exports/course-images/ai300-mlops-card-notext.png
"""
import math, os, random
from PIL import Image, ImageDraw

W, H = 750, 422
OUT = os.path.join(os.path.dirname(__file__), "..", "exports", "course-images")
os.makedirs(OUT, exist_ok=True)


def vgrad(top, bot):
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return img


def rr(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)


def blend(c, bg, a):
    return tuple(int(c[i] * a + bg[i] * (1 - a)) for i in range(3))


# ----------------------------------------------------------------------------
# Card 1 — Google Cloud Generative AI Leader
# Motif: a generative "spark"/burst of rays + flowing node mesh in Google's
# four brand colors, over a deep indigo gradient. Reads as gen-AI + leadership.
# ----------------------------------------------------------------------------
def google_card():
    random.seed(7)
    bg_top, bg_bot = (18, 22, 46), (9, 11, 26)
    img = vgrad(bg_top, bg_bot)
    d = ImageDraw.Draw(img, "RGBA")
    G_BLUE, G_RED, G_YEL, G_GRN = (66, 133, 244), (234, 67, 53), (251, 188, 4), (52, 168, 83)
    cols = [G_BLUE, G_RED, G_YEL, G_GRN]

    cx, cy = 250, 214  # off-center burst
    # radiating rays (generative burst)
    for i in range(28):
        ang = i * (2 * math.pi / 28) + 0.15
        r0, r1 = 34, 150 + 26 * math.sin(i * 1.7)
        c = cols[i % 4]
        x0, y0 = cx + r0 * math.cos(ang), cy + r0 * math.sin(ang)
        x1, y1 = cx + r1 * math.cos(ang), cy + r1 * math.sin(ang)
        d.line([(x0, y0), (x1, y1)], fill=c + (150,), width=3)
        d.ellipse([x1 - 5, y1 - 5, x1 + 5, y1 + 5], fill=c + (220,))

    # concentric arcs
    for k, c in enumerate(cols):
        rad = 60 + k * 20
        d.arc([cx - rad, cy - rad, cx + rad, cy + rad], start=k * 90 + 10, end=k * 90 + 150,
              fill=c + (180,), width=4)
    # core
    d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=(255, 255, 255, 40))
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(255, 255, 255, 235))

    # flowing node mesh on the right (strategy/graph)
    nodes = [(500 + random.randint(-8, 8), 60 + i * 34 + random.randint(-6, 6)) for i in range(10)]
    nodes += [(600 + random.randint(-8, 8), 90 + i * 36) for i in range(9)]
    nodes += [(690 + random.randint(-8, 8), 70 + i * 40) for i in range(8)]
    for a in nodes:
        for b in nodes:
            if a is b:
                continue
            dist = math.hypot(a[0] - b[0], a[1] - b[1])
            if dist < 78:
                d.line([a, b], fill=(120, 150, 220, 55), width=1)
    for i, n in enumerate(nodes):
        c = cols[i % 4]
        s = 4
        d.ellipse([n[0] - s, n[1] - s, n[0] + s, n[1] + s], fill=c + (210,))

    # diamond accents (portfolio signature)
    for _ in range(10):
        x, y = random.randint(360, 470), random.randint(40, 380)
        c = cols[random.randint(0, 3)]
        d.polygon([(x, y - 6), (x + 6, y), (x, y + 6), (x - 6, y)], fill=c + (200,))

    img.save(os.path.join(OUT, "gcp-genai-leader-card-notext.png"))
    print("wrote gcp-genai-leader-card-notext.png")


# ----------------------------------------------------------------------------
# Card 2 — Microsoft AI-300 MLOps / GenAIOps
# Motif: a left-to-right MLOps pipeline (a DAG of stages) feeding monitoring
# gauges, plus a continuous-deployment loop, in Azure blue/cyan on dark.
# ----------------------------------------------------------------------------
def ai300_card():
    random.seed(11)
    bg_top, bg_bot = (10, 20, 34), (5, 10, 20)
    img = vgrad(bg_top, bg_bot)
    d = ImageDraw.Draw(img, "RGBA")
    AZ, CY, GRN, AMB = (0, 120, 212), (80, 230, 255), (60, 200, 140), (240, 170, 60)

    # faint grid
    for x in range(0, W, 30):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 8))
    for y in range(0, H, 30):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 8))

    # pipeline DAG: 5 stage columns (mirrors the 5 exam domains), nodes wired L->R
    xs = [90, 230, 370, 510, 650]
    layers = []
    counts = [2, 3, 3, 2, 2]
    for ci, x in enumerate(xs):
        n = counts[ci]
        ys = [130 + i * 70 + (0 if n > 1 else 35) for i in range(n)]
        layers.append([(x, y) for y in ys])

    # edges
    for li in range(len(layers) - 1):
        for a in layers[li]:
            for b in layers[li + 1]:
                d.line([a, b], fill=(90, 150, 210, 90), width=2)
    # moving "packets" on edges
    for li in range(len(layers) - 1):
        for a in layers[li]:
            for b in layers[li + 1]:
                t = random.uniform(0.3, 0.7)
                px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                d.ellipse([px - 3, py - 3, px + 3, py + 3], fill=CY + (220,))

    # nodes (rounded chips)
    for li, layer in enumerate(layers):
        c = [AZ, CY, AZ, GRN, AMB][li]
        for (x, y) in layer:
            rr(d, [x - 26, y - 16, x + 26, y + 16], 8, fill=blend(c, bg_top, 0.28) + (255,),
               outline=c + (255,), width=2)
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=c + (255,))

    # CI/CD loop arrow arcing over the top
    d.arc([120, 20, 640, 210], start=200, end=340, fill=(120, 200, 255, 150), width=3)
    ax, ay = 630, 74
    d.polygon([(ax, ay), (ax - 14, ay - 6), (ax - 10, ay + 8)], fill=(120, 200, 255, 220))

    # monitoring gauges bottom-right (observability domain)
    for i, (gx, val, c) in enumerate([(560, 0.72, GRN), (630, 0.5, AZ), (700, 0.86, AMB)]):
        gy = 360
        d.arc([gx - 30, gy - 30, gx + 30, gy + 30], start=135, end=405, fill=(255, 255, 255, 40), width=6)
        d.arc([gx - 30, gy - 30, gx + 30, gy + 30], start=135, end=135 + int(270 * val),
              fill=c + (230,), width=6)

    # drift/telemetry sparkline bottom-left
    pts = [(30 + i * 26, 372 + int(22 * math.sin(i * 0.8) + random.randint(-6, 6))) for i in range(15)]
    d.line(pts, fill=CY + (200,), width=2)

    # diamond accents
    for _ in range(8):
        x, y = random.randint(40, 470), random.randint(240, 320)
        c = random.choice([AZ, CY, AMB])
        d.polygon([(x, y - 6), (x + 6, y), (x, y + 6), (x - 6, y)], fill=c + (200,))

    img.save(os.path.join(OUT, "ai300-mlops-card-notext.png"))
    print("wrote ai300-mlops-card-notext.png")


if __name__ == "__main__":
    google_card()
    ai300_card()
    print("done ->", os.path.abspath(OUT))
