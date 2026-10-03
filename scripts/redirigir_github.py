#!/usr/bin/env python3
"""Arma la versión «solo redirecciones» que sigue publicada en la dirección antigua (GitHub Pages).

Desde el 03-10-2026 el sitio vive en Cloudflare Pages. GitHub Pages no puede responder con un 301,
así que cada página que existía queda como una página mínima que manda a la misma página en la
dirección nueva (canonical + refresh inmediato, que Google trata como redirección permanente), y un
404.html atrapa cualquier otra ruta, como los PDF del CV o enlaces viejos, y la manda igual.

Uso:  python build.py && python scripts/redirigir_github.py   → _redirigir.nosync/
"""

import html
import json
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SITIO = ROOT / "_site.nosync"
SALIDA = ROOT / "_redirigir.nosync"

PAGINA = """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>El portafolio se mudó</title>
  <link rel="canonical" href="{destino}">
  <meta http-equiv="refresh" content="0; url={destino}">
  <script>location.replace({destino_js} + location.search + location.hash)</script>
  <style>body{{font:17px/1.6 system-ui,sans-serif;background:#ECEDF0;color:#141833;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem}}a{{color:#2B3BF5}}</style>
</head>
<body>
  <p>El portafolio se mudó a <a href="{destino}">{destino_txt}</a>.<br>This portfolio moved to <a href="{destino}">{destino_txt}</a>.</p>
</body>
</html>
"""

# Cualquier ruta que no exista en la dirección antigua cae acá y se manda a la misma ruta en la nueva.
CAPTURA = """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>El portafolio se mudó</title>
  <meta name="robots" content="noindex">
  <script>
    var resto = location.pathname.replace(/^\\/{repo}\\/?/, "");
    location.replace({nueva_js} + resto + location.search + location.hash);
  </script>
  <style>body{{font:17px/1.6 system-ui,sans-serif;background:#ECEDF0;color:#141833;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem}}a{{color:#2B3BF5}}</style>
</head>
<body>
  <p>El portafolio se mudó a <a href="{nueva}">{nueva_txt}</a>.<br>This portfolio moved to <a href="{nueva}">{nueva_txt}</a>.</p>
</body>
</html>
"""


def main() -> int:
    site = yaml.safe_load((ROOT / "content" / "site.yml").read_text(encoding="utf-8"))
    nueva, antigua = site["url"], site["old_url"]
    repo = antigua.rstrip("/").rsplit("/", 1)[-1]          # "pagina_web_lang"
    if not SITIO.exists():
        print("Falta _site.nosync/: corre primero python build.py", file=sys.stderr)
        return 1
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    SALIDA.mkdir()

    n = 0
    for pagina in SITIO.rglob("*.html"):
        rel = pagina.relative_to(SITIO).as_posix()
        if rel in ("404.html",) or rel.startswith(("metricas/", "assets/")):
            continue
        ruta = rel[: -len("index.html")] if rel.endswith("index.html") else rel
        destino = nueva + ruta
        archivo = SALIDA / rel
        archivo.parent.mkdir(parents=True, exist_ok=True)
        archivo.write_text(PAGINA.format(destino=html.escape(destino), destino_js=json.dumps(destino),
                                         destino_txt=html.escape(nueva.removeprefix("https://").rstrip("/"))), encoding="utf-8")
        n += 1

    (SALIDA / "404.html").write_text(CAPTURA.format(repo=repo, nueva=html.escape(nueva), nueva_js=json.dumps(nueva),
                                                    nueva_txt=html.escape(nueva.removeprefix("https://").rstrip("/"))), encoding="utf-8")
    (SALIDA / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {nueva}sitemap.xml\n", encoding="utf-8")
    (SALIDA / ".nojekyll").touch()
    print(f"✓ {n} páginas de redirección + 404 que atrapa el resto → {SALIDA.name}/ ({antigua} → {nueva})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
