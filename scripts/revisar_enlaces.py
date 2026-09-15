#!/usr/bin/env python3
"""Revisa que todos los enlaces e imágenes internas del sitio construido existan.

Uso:  python build.py && python scripts/revisar_enlaces.py
"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = Path(__file__).resolve().parent.parent / "_site.nosync"
ATTR = re.compile(r'(?:href|src|srcset|data-preview|data-embed)="([^"]+)"')

broken = []
pages = list(SITE.rglob("*.html"))
for page in pages:
    if page.name == "404.html":
        continue
    html = page.read_text(encoding="utf-8")
    for raw in ATTR.findall(html):
        url = raw.split(" ")[0]
        if url.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:")):
            continue
        path = unquote(urlsplit(url).path)
        if not path:
            continue
        target = (page.parent / path).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            broken.append(f"{page.relative_to(SITE)} → {url}")

if broken:
    print(f"✗ {len(broken)} enlaces rotos:")
    print("\n".join(sorted(set(broken))))
    sys.exit(1)
print(f"✓ {len(pages)} páginas revisadas, sin enlaces internos rotos")
