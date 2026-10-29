#!/usr/bin/env python3
"""Builds the share pages for each event (e/<id>.html + e/<id>.png), og.png and sitemap.xml.

Run after editing data/events.json:  python3 build.py
It also removes events that have ended: yard sales are deleted (no home addresses left online),
other events move to ../archive/past-events.json outside the site folder.
Use  python3 build.py --today 2026-10-26  to treat a different day as "today".
Needs Python 3 and Pillow (pip install pillow). Set "siteUrl" in site.json once you have
your web address so Facebook previews use full links.
"""
import json, html, os, re, sys, datetime
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(ROOT, "site.json")))
EVENTS = json.load(open(os.path.join(ROOT, "data", "events.json")))
BASE = (SITE.get("siteUrl") or "").rstrip("/")
NAME = SITE.get("siteName", "Side Mission")
CATS = {"festival": ("Festival", "#c4452c"), "market": ("Market & vendors", "#6d4bb3"), "kids": ("Kids & trunk-or-treat", "#c57d0f"),
        "yard": ("Yard sale", "#2f8a5b"), "church": ("Church event", "#2f5d86"), "community": ("Community", "#b23a6e")}

def font(size, bold=True):
    for p in (["/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf", "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"] if bold else
              ["/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf"]) + [
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf", "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def brand_font(size):
    p = os.path.join(os.path.dirname(ROOT), "tools", "fonts", "Fraunces.ttf")
    if os.path.exists(p):
        f = ImageFont.truetype(p, size)
        try: f.set_variation_by_axes([72, 800, 0, 0])
        except Exception: pass
        return f
    return font(size)

def bez(p0, p1, p2, p3, n=200):
    return [tuple((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t**2*c + t**3*d for a, b, c, d in zip(p0, p1, p2, p3)) for t in (i/n for i in range(n+1))]

def draw_brand(img, x, y, size, ink="#1d3557", trail="#e76f51", bg="#faf8f4"):
    """Side Mission logo: dotted trail to a pin (80-unit artwork scaled to `size`), then the lowercase wordmark."""
    d = ImageDraw.Draw(img); k = size / 80; P = lambda a, b: (x + a*k, y + b*k)
    pts = bez((12,70),(44,72),(50,54),(32,48)) + bez((32,48),(14,42),(20,31),(58,32))
    run, last = 0.0, pts[0]
    for q in pts[1:]:
        run += ((q[0]-last[0])**2 + (q[1]-last[1])**2) ** .5; last = q
        if run >= 9.5:
            run = 0; cx, cy = P(*q); r = 2.6*k; d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=trail)
    cx, cy = P(12, 70); r = 5.5*k; d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=ink)
    cx, cy = P(58, 11.5); r = 13*k; d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=ink)
    d.polygon([P(45.6, 15.5), P(58, 32), P(70.4, 15.5)], fill=ink)
    r = 5*k; d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=bg)
    f = brand_font(int(size * .62))
    d.text((x + size + size*.12, y + size*.5), "side mission", font=f, fill=ink, anchor="lm")

def al_outline():
    src = open(os.path.join(ROOT, "assets", "basemap.js")).read()
    geo = json.loads(src.split("window.GEO=", 1)[1].rstrip().rstrip(";"))
    return max(geo["al"], key=len)

RING = al_outline()

def draw_state(img, box, fill, outline):
    x0, y0, x1, y1 = box
    lats = [p[0] for p in RING]; lngs = [p[1] for p in RING]
    la0, la1, ln0, ln1 = min(lats), max(lats), min(lngs), max(lngs)
    k = min((x1 - x0) / (ln1 - ln0), (y1 - y0) / (la1 - la0))
    ox = x0 + ((x1 - x0) - (ln1 - ln0) * k) / 2; oy = y0 + ((y1 - y0) - (la1 - la0) * k) / 2
    pt = lambda la, ln: (ox + (ln - ln0) * k, oy + (la1 - la) * k)
    d = ImageDraw.Draw(img)
    d.polygon([pt(*p) for p in RING], fill=fill, outline=outline)
    return pt

def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def fmt(s):
    d = datetime.date.fromisoformat(s); return d.strftime("%a, %b ") + str(d.day)

def when(e):
    if e.get("openEnded"): return "Opened " + fmt(e["start"])
    r = fmt(e["start"]) + (" – " + fmt(e["end"]) if e.get("end") and e["end"] != e["start"] else "")
    return r + " · " + e.get("time", "")

def card_image(path, title, line1, line2, color, tag):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#faf8f4"); d = ImageDraw.Draw(img)
    pt = draw_state(img, (800, 60, 1140, 570), "#efe9df", "#cfc6b6")
    d.rectangle([0, 0, 18, H], fill=color)
    d.text((70, 70), tag.upper(), font=font(26), fill=color)
    y = 120
    for ln in wrap(d, title, font(66), 690)[:3]:
        d.text((70, y), ln, font=font(66), fill="#1c1e21"); y += 78
    y += 18
    for ln in wrap(d, line1, font(32, False), 690)[:2]:
        d.text((70, y), ln, font=font(32, False), fill="#3c4046"); y += 42
    for ln in wrap(d, line2, font(30, False), 690)[:2]:
        d.text((70, y), ln, font=font(30, False), fill="#686c73"); y += 40
    draw_brand(img, 66, H - 118, 64)
    img.save(path, optimize=True)
    return pt

def prune(today):
    """Take ended events off the site. Yard sales (home addresses) are deleted outright;
    other public events go to ../archive/past-events.json, which is kept OUTSIDE the site folder."""
    global EVENTS
    keep, gone_yard, gone_public = [], [], []
    for e in EVENTS:
        if e.get("openEnded"):
            keep.append(e); continue
        last = datetime.date.fromisoformat(e.get("end") or e["start"])
        if last >= today: keep.append(e)
        elif e["cat"] == "yard": gone_yard.append(e)
        else: gone_public.append(e)
    if gone_public:
        arch_dir = os.path.join(os.path.dirname(ROOT), "archive"); os.makedirs(arch_dir, exist_ok=True)
        arch = os.path.join(arch_dir, "past-events.json")
        old = json.load(open(arch)) if os.path.exists(arch) else []
        ids = {x["id"] for x in old}
        old += [e for e in gone_public if e["id"] not in ids]
        json.dump(old, open(arch, "w"), indent=1)
    if gone_yard or gone_public:
        EVENTS = keep
        json.dump(EVENTS, open(os.path.join(ROOT, "data", "events.json"), "w"), indent=1)
    print(f"Removed {len(gone_yard)} ended yard sales (deleted) and {len(gone_public)} ended events (archived). {len(keep)} remain.")

def main():
    args = sys.argv[1:]
    today = datetime.date.fromisoformat(args[args.index("--today") + 1]) if "--today" in args else datetime.date.today()
    prune(today)
    os.makedirs(os.path.join(ROOT, "e"), exist_ok=True)
    # site preview image
    pt = card_image(os.path.join(ROOT, "og.png"), "This week’s yard sales, festivals and markets",
                    "Near you, all on one map", "Updated every week · Free to use", "#1d3557", "Local events")
    n = 0
    for e in EVENTS:
        cat, color = CATS.get(e["cat"], ("Event", "#1d3557"))
        img_path = os.path.join(ROOT, "e", e["id"] + ".png")
        p = card_image(img_path, e["title"], when(e), ", ".join(x for x in [e.get("place"), e.get("town")] if x), color, cat + " · " + e.get("town", ""))
        # mark the spot on the little state map
        im = Image.open(img_path); d = ImageDraw.Draw(im); x, y = p(e["lat"], e["lng"])
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=color, outline="#ffffff", width=4); im.save(img_path, optimize=True)
        url = f"{BASE}/e/{e['id']}.html" if BASE else f"{e['id']}.html"
        img = f"{BASE}/e/{e['id']}.png" if BASE else f"{e['id']}.png"
        desc = f"{when(e)}. {', '.join(x for x in [e.get('place'), e.get('town')] if x)}. {e.get('desc','')}"
        esc = lambda s: html.escape(str(s or ""), quote=True)
        page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(e['title'])} · {esc(NAME)}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="{esc(NAME)}">
<meta property="og:title" content="{esc(e['title'])} · {esc(e.get('town',''))}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{esc(img)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{esc(url)}"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<style>body{{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#efede8;color:#1c1e21}}main{{max-width:560px;margin:10vh auto;padding:0 16px}}
.c{{background:#fff;border-radius:16px;padding:24px;border:1px solid #e2dfd8}}h1{{margin:0 0 8px;font-size:26px}}p{{color:#555}}a{{display:inline-block;margin-top:8px;background:#1d3557;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700}}</style>
<script>location.replace("../map.html?e={e['id']}");</script></head>
<body><main><div class="c"><h1>{esc(e['title'])}</h1><p>{esc(when(e))}<br>{esc(e.get('addr') or e.get('place') or e.get('town',''))}</p><p>{esc(e.get('desc',''))}</p>
<a href="../map.html?e={e['id']}">Open on the map</a></div></main></body></html>"""
        open(os.path.join(ROOT, "e", e["id"] + ".html"), "w").write(page); n += 1
    # remove share pages for events no longer in the data
    ids = {e["id"] for e in EVENTS}
    for f in os.listdir(os.path.join(ROOT, "e")):
        if os.path.splitext(f)[0] not in ids: os.remove(os.path.join(ROOT, "e", f))
    # point the homepage preview at the full image URL when we know it
    for page in ("index.html", "map.html"):
        idx = os.path.join(ROOT, page)
        if not os.path.exists(idx): continue
        s = open(idx).read()
        s = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{(BASE + "/og.png") if BASE else "og.png"}">', s)
        open(idx, "w").write(s)
    if BASE:
        urls = [BASE + "/", BASE + "/map", BASE + "/submit.html"] + [f"{BASE}/e/{e['id']}.html" for e in EVENTS]
        open(os.path.join(ROOT, "sitemap.xml"), "w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            "".join(f"  <url><loc>{html.escape(u)}</loc></url>\n" for u in urls) + "</urlset>\n")
    print(f"Built {n} event pages" + ("" if BASE else " (set siteUrl in site.json for full Facebook preview links)"))

if __name__ == "__main__":
    main()
