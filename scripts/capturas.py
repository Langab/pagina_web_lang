#!/usr/bin/env python3
"""Toma capturas frescas de los proyectos publicados y las deja en static/img/projects/.

Uso:  python scripts/capturas.py            (todas)
      python scripts/capturas.py arriendos  (solo las que contienen ese texto)

Requiere: pip install playwright pillow && playwright install chromium
"""

import asyncio
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

OUT = Path(__file__).resolve().parent.parent / "static" / "img" / "projects"

# (carpeta, nombre, url, clic opcional antes de capturar, espera en ms)
SHOTS = [
    ("visor-arriendos", "lista", "https://langab.github.io/visor_arriendos/viewer/", "#btn-lista", 2500),
    # El mapa se ve mejor con zoom manual; la captura actual se tomó a mano.
    ("visor-arriendos", "metricas", "https://langab.github.io/visor_arriendos/viewer/", "#btn-metricas", 2500),
    ("experimentos", "celulares", "https://langab.github.io/visor_celulares/", None, 3000),
    ("experimentos", "vuelos", "https://langab.github.io/visualizador_ofertas_vuelos/", None, 3000),
]


def save(png: bytes, folder: str, name: str, width: int = 1600):
    target = OUT / folder
    target.mkdir(parents=True, exist_ok=True)
    img = Image.open(io.BytesIO(png)).convert("RGB")
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(target / f"{name}.jpg", quality=80, optimize=True, progressive=True)
    img.save(target / f"{name}.webp", quality=78, method=6)
    print(f"✓ {folder}/{name}  {img.width}×{img.height}")


async def main(filter_text: str = ""):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2, locale="es-CL")
        for folder, name, url, click, wait in SHOTS:
            if filter_text and filter_text not in f"{folder}/{name}":
                continue
            try:
                await page.goto(url, wait_until="networkidle", timeout=60000)
                if click:
                    await page.click(click, timeout=5000)
                await page.wait_for_timeout(wait)
                save(await page.screenshot(), folder, name)
            except Exception as exc:
                print(f"✗ {folder}/{name}: {exc}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else ""))
