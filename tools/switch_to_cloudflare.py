#!/usr/bin/env python3
"""One-time move from Netlify to Cloudflare Pages.

Usage:  python3 tools/switch_to_cloudflare.py https://NEW-ADDRESS [WEB3FORMS_KEY]

1. Points site.json at the new address (and stores the Web3Forms key, if given).
2. Rebuilds the share pages, og.png and sitemap.xml with the new address.
3. Turns the old Netlify site into a redirect: Netlify now publishes only the
   tiny netlify-redirect/ folder, which sends every old link (including shared
   event links) to the same page on the new address.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2 or not sys.argv[1].startswith("https://"):
    sys.exit(__doc__)
new = sys.argv[1].rstrip("/")
key = sys.argv[2] if len(sys.argv) > 2 else None

p = os.path.join(ROOT, "site", "site.json")
s = json.load(open(p))
s["siteUrl"] = new
if key:
    s.setdefault("form", {})["web3formsKey"] = key
json.dump(s, open(p, "w"), indent=2, ensure_ascii=False)
open(p, "a").write("\n")

subprocess.run([sys.executable, "build.py"], cwd=os.path.join(ROOT, "site"), check=True)

with open(os.path.join(ROOT, "site", "robots.txt"), "w") as f:
    f.write(f"User-agent: *\nAllow: /\nSitemap: {new}/sitemap.xml\n")

d = os.path.join(ROOT, "netlify-redirect")
os.makedirs(d, exist_ok=True)
open(os.path.join(d, "_redirects"), "w").write(f"/*  {new}/:splat  301!\n")
open(os.path.join(d, "index.html"), "w").write(
    f'<!doctype html><meta charset="utf-8"><title>Moved</title>'
    f'<meta http-equiv="refresh" content="0;url={new}/"><p>We moved to <a href="{new}/">{new}</a>.</p>\n')
open(os.path.join(ROOT, "netlify.toml"), "w").write(
    "# The site moved to Cloudflare Pages. Netlify now only redirects old links there.\n"
    "[build]\n  publish = \"netlify-redirect\"\n")
print(f"Ready. Site address is now {new}. Commit and push to finish.")
