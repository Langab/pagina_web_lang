#!/usr/bin/env python3
"""Generador del sitio bilingüe de Benjamín Lang.

Todo el contenido vive en content/*.yml (textos en {es, en}) y en
templates/ (HTML con Jinja2). Este script junta ambos y escribe el sitio
estático en _site.nosync/ (el sufijo .nosync evita que iCloud lo sincronice).

Uso:
    python build.py             construye el sitio
    python build.py --serve     construye, sirve en http://localhost:8000
                                y reconstruye al guardar cambios
    python build.py --check     solo valida contenido y traducciones
"""

from __future__ import annotations

import argparse
import hashlib
import html
import http.server
import json
import re
import shutil
import socketserver
import sys
import threading
import time
import urllib.request
from datetime import date
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined, pass_context
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
OUT = ROOT / "_site.nosync"
LANGS = ("es", "en")


# ── Contenido ──────────────────────────────────────────────────────────────

def load_content() -> dict:
    data = {}
    for f in sorted(CONTENT.glob("*.yml")):
        with f.open(encoding="utf-8") as fh:
            data[f.stem] = yaml.safe_load(fh) or {}
    return data


def check_translations(node, where="content") -> list[str]:
    """Todo diccionario con clave 'es' debe tener también 'en' (y viceversa)."""
    errors = []
    if isinstance(node, dict):
        keys = set(node)
        if keys & set(LANGS) and any(node[k] is None for k in keys - set(LANGS)):
            errors.append(f"{where}: un texto con coma quedó partido; ponlo entre comillas")
        if keys & set(LANGS) and keys <= set(LANGS) and not where.endswith(".path"):
            for lang in LANGS:
                if not str(node.get(lang) or "").strip():
                    errors.append(f"{where}: falta la traducción '{lang}'")
        for k, v in node.items():
            errors += check_translations(v, f"{where}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            label = v.get("id", i) if isinstance(v, dict) else i
            errors += check_translations(v, f"{where}[{label}]")
    return errors


# ── Datos vivos del visor de arriendos ─────────────────────────────────────

LIVE_URL = "https://langab.github.io/visor_arriendos/viewer/data.js"
LIVE_FALLBACK = {"total": 1273, "match": 24, "new": 438, "days": 30, "generated": "2026-09-15 10:12"}


def fetch_live() -> dict:
    """Lee solo la cabecera de data.js (window.META) para mostrar cifras del día.
    Si no hay red, usa el último valor conocido y el sitio se construye igual."""
    try:
        req = urllib.request.Request(LIVE_URL, headers={"Range": "bytes=0-3000", "User-Agent": "build.py"})
        head = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", "ignore")
        grab = lambda key: re.search(rf'"{key}":\s*("?)([^",]+)\1', head).group(2)
        dates = re.search(r'"fechas_disponibles":\s*\[([^\]]*)\]', head)
        return {
            "total": int(grab("total")),
            "match": int(grab("match_perfecto")),
            "new": int(grab("nuevos_desde_anterior")) if '"nuevos_desde_anterior"' in head else LIVE_FALLBACK["new"],
            "days": dates.group(1).count(",") + 1 if dates else LIVE_FALLBACK["days"],
            "generated": grab("generado"),
        }
    except Exception as exc:
        print(f"  (sin datos vivos del visor: {exc.__class__.__name__}; uso valores guardados)")
        return dict(LIVE_FALLBACK)


# ── Rutas ──────────────────────────────────────────────────────────────────

def build_routes(data: dict) -> list[dict]:
    """Cada ruta tiene la misma página en ambos idiomas."""
    routes = []
    for page in data["site"]["pages"]:
        routes.append({
            "id": page["id"],
            "template": page["template"],
            "path": page["path"],
            "meta": page,
            "project": None,
        })
    base = next(p for p in data["site"]["pages"] if p["id"] == "projects")["path"]
    for project in data["projects"]["lab"]:
        if not project.get("detail"):
            continue
        routes.append({
            "id": f"project:{project['id']}",
            "template": "pages/project.html",
            "path": {lang: f"{base[lang]}{project['slug'][lang]}/" for lang in LANGS},
            "meta": {"title": project["title"], "description": project["hook"]},
            "project": project,
        })
    return routes


def out_file(path: str) -> str:
    """'proyectos/' -> 'proyectos/index.html'; '' -> 'index.html'."""
    return f"{path}index.html" if path == "" or path.endswith("/") else path


def rel(from_path: str, to_path: str) -> str:
    """URL relativa entre dos rutas del sitio (funciona en GitHub Pages y en local)."""
    depth = out_file(from_path).count("/")
    prefix = "../" * depth
    return prefix + to_path if (prefix + to_path) else "./"


# ── Filtros de plantilla ───────────────────────────────────────────────────

INLINE_MD = [
    (re.compile(r"\*\*(.+?)\*\*"), r"<strong>\1</strong>"),
    (re.compile(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)"), r"<em>\1</em>"),
    (re.compile(r"`(.+?)`"), r"<code>\1</code>"),
]
LINK_MD = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")


def inline_markdown(text: str) -> Markup:
    """Markdown mínimo para textos de YAML: **negrita**, *cursiva*, `código`, [link](url)."""
    if text is None:
        return Markup("")
    out = html.escape(str(text), quote=False)
    for pattern, repl in INLINE_MD:
        out = pattern.sub(repl, out)

    def link(m):
        url = m.group(2)
        external = url.startswith("http")
        attrs = ' target="_blank" rel="noopener"' if external else ""
        return f'<a href="{html.escape(url)}"{attrs}>{m.group(1)}</a>'

    out = LINK_MD.sub(link, out)
    paragraphs = [p.strip() for p in out.split("\n\n") if p.strip()]
    if len(paragraphs) > 1:
        return Markup("".join(f"<p>{p}</p>" for p in paragraphs))
    return Markup(out.replace("\n", " "))


def make_env(data: dict, asset_version: str) -> Environment:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=True,
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )

    def number(value, lang):
        text = f"{value:,}"
        return text.replace(",", ".") if lang == "es" else text

    @pass_context
    def t(ctx, value):
        if isinstance(value, dict) and set(value) & set(LANGS):
            value = value[ctx["lang"]]
        if isinstance(value, str) and "{" in value:  # cifras del día del visor de arriendos
            live = ctx["live"]
            value = value.replace("{live_total}", number(live["total"], ctx["lang"])).replace("{match}", str(live["match"]))
        return value

    @pass_context
    def num(ctx, value):
        return number(int(value), ctx["lang"])

    @pass_context
    def md(ctx, value):
        return inline_markdown(t(ctx, value))

    def link(ctx, to_path: str) -> str:
        if ctx.get("absolute"):  # la página 404 se sirve desde cualquier ruta
            return data["site"]["url"] + to_path
        return rel(ctx["route"]["path"][ctx["lang"]], to_path)

    @pass_context
    def url(ctx, page_id: str, anchor: str = ""):
        route = ctx["routes_by_id"][page_id]
        return link(ctx, route["path"][ctx["lang"]]) + anchor

    @pass_context
    def asset(ctx, path: str):
        base = link(ctx, f"assets/{path}")
        if path.endswith((".css", ".js")):
            base += f"?v={asset_version}"
        return base

    @pass_context
    def project_url(ctx, project: dict):
        return url(ctx, f"project:{project['id']}")

    env.filters["t"] = t
    env.filters["md"] = md
    env.filters["num"] = num
    env.globals.update(url=url, asset=asset, project_url=project_url, year=date.today().year)
    return env


# ── Construcción ───────────────────────────────────────────────────────────

def asset_hash() -> str:
    h = hashlib.sha1()
    for f in sorted((STATIC / "css").glob("*.css")) + sorted((STATIC / "js").glob("*.js")):
        h.update(f.read_bytes())
    return h.hexdigest()[:8]


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


_live_cache: dict = {}


def build(verbose: bool = True) -> int:
    started = time.time()
    data = load_content()
    if not _live_cache:
        _live_cache.update(fetch_live())
    data["live"] = _live_cache
    errors = check_translations(data)
    if errors:
        print("✗ Contenido incompleto:\n  " + "\n  ".join(errors), file=sys.stderr)
        return 1

    routes = build_routes(data)
    routes_by_id = {r["id"]: r for r in routes}
    site = data["site"]
    env = make_env(data, asset_hash())

    # Se construye en una carpeta temporal y solo se reemplaza el sitio si todo salió bien
    out = OUT.with_name(OUT.name.replace(".nosync", "-tmp.nosync"))
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    try:
        _render_all(data, routes, routes_by_id, site, env, out)
    except Exception:
        shutil.rmtree(out, ignore_errors=True)
        raise
    if OUT.exists():
        shutil.rmtree(OUT)
    out.rename(OUT)
    if verbose:
        print(f"✓ {len(routes) * len(LANGS)} páginas ({len(routes)} rutas × {len(LANGS)} idiomas) en {time.time() - started:.1f}s → {OUT.name}/")
    return 0


def _render_all(data, routes, routes_by_id, site, env, OUT):
    shutil.copytree(STATIC, OUT / "assets", ignore=shutil.ignore_patterns(".DS_Store", "* 2*"))

    count = 0
    for route in routes:
        template = env.get_template(route["template"])
        for lang in LANGS:
            other = "en" if lang == "es" else "es"
            ctx = {
                **data,
                "lang": lang,
                "other_lang": other,
                "route": route,
                "routes_by_id": routes_by_id,
                "page": route["meta"],
                "project": route["project"],
                "ui": {k: (v[lang] if isinstance(v, dict) else v) for k, v in site["ui"].items()},
                "canonical": site["url"] + route["path"][lang],
                "alternates": {l: site["url"] + route["path"][l] for l in LANGS},
                "switch_url": rel(route["path"][lang], route["path"][other]),
            }
            write(OUT / out_file(route["path"][lang]), template.render(**ctx))
            count += 1

    # Redirecciones desde las URL del sitio anterior (Quarto)
    redirect_tpl = env.get_template("redirect.html")
    for old, target_id, lang in site["legacy_redirects"]:
        target = routes_by_id[target_id]["path"][lang]
        write(OUT / old, redirect_tpl.render(target=rel(old, target), absolute=site["url"] + target))

    # Código abierto descargable: cada carpeta de static/code/ se empaqueta en un .zip
    for folder in (STATIC / "code").glob("*/"):
        shutil.make_archive(str(OUT / "assets" / "code" / folder.name), "zip", folder.parent, folder.name)

    # CV en la raíz: los enlaces antiguos apuntan ahí
    for pdf in (STATIC / "docs").glob("CV_*.pdf"):
        shutil.copy2(pdf, OUT / pdf.name)

    # 404, sitemap y robots
    page404 = env.get_template("404.html")
    write(OUT / "404.html", page404.render(
        **data, lang="es", other_lang="en", route=routes_by_id["home"], routes_by_id=routes_by_id,
        page={"title": {"es": "Página no encontrada", "en": "Page not found"}, "description": site["description"]},
        project=None, ui={k: (v["es"] if isinstance(v, dict) else v) for k, v in site["ui"].items()},
        canonical=site["url"], alternates={l: site["url"] for l in LANGS},
        switch_url=site["url"] + "en/", absolute=True,
    ))

    today = date.today().isoformat()
    urls = "".join(
        f"<url><loc>{site['url']}{r['path'][l]}</loc><lastmod>{today}</lastmod></url>"
        for r in routes for l in LANGS
    )
    write(OUT / "sitemap.xml",
          f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    write(OUT / "robots.txt", f"User-agent: *\nAllow: /\nSitemap: {site['url']}sitemap.xml\n")
    (OUT / ".nojekyll").touch()



# ── Servidor local con reconstrucción automática ───────────────────────────

def snapshot() -> dict:
    files = [*CONTENT.rglob("*"), *TEMPLATES.rglob("*"), *STATIC.rglob("*")]
    return {str(f): f.stat().st_mtime for f in files if f.is_file()}


def serve(port: int):
    build()

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(OUT), **kw)

        def log_message(self, *args):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"→ http://localhost:{port}/  (Ctrl+C para salir)")

    last = snapshot()
    try:
        while True:
            time.sleep(1)
            current = snapshot()
            if current != last:
                last = current
                try:
                    build()
                except Exception as exc:  # seguir sirviendo aunque falle una plantilla
                    print(f"✗ {exc}", file=sys.stderr)
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.check:
        errs = check_translations(load_content())
        print("✓ Traducciones completas" if not errs else "\n".join(errs))
        sys.exit(1 if errs else 0)
    if args.serve:
        serve(args.port)
    else:
        sys.exit(build())
