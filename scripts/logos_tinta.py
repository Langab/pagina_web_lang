#!/usr/bin/env python3
"""Versiones de una sola tinta de los logos de la portada («He trabajado en»).

Cada logo original tiene sus colores y su fondo; en la portada van todos del mismo color
(tinta) y con la misma opacidad, para que ninguno grite más que otro. Este script los
convierte una vez y deja el resultado en static/img/logos/tinta/. Necesita Pillow (solo
en el computador: CI usa los PNG ya generados).

Dos modos según cómo viene el logo:
- «forma»: lo que se ve es la forma (texto blanco o de color sobre transparente).
  La tinta es el alfa del original.
- «calado»: el logo viene con fondo o letras blancas (INE, CEP, Tironi). Lo blanco se
  vuelve transparente y lo de color se vuelve tinta, así las letras quedan caladas.

Uso:  python scripts/logos_tinta.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ORIGEN = ROOT / "static" / "img" / "logos"
DESTINO = ORIGEN / "tinta"
TINTA = (0x12, 0x17, 0x35)
ALTO = 112  # píxeles: el doble de lo que se muestra, para pantallas retina

# archivo: (modo, recorte opcional en fracciones del alto: (arriba, abajo))
LOGOS = {
    "ine.png": ("calado", None),
    "cep.png": ("calado", None),
    "tironi.png": ("calado", None),
    "santa_rosa.png": ("forma", (0.17, 0.70)),  # sin las líneas chicas (servicio y comunas), ilegibles a este tamaño
    "udp.png": ("forma", None),
}


def tinta(nombre: str, modo: str, recorte):
    im = Image.open(ORIGEN / nombre).convert("RGBA")
    if recorte:
        a, b = recorte
        im = im.crop((0, round(im.height * a), im.width, round(im.height * b)))
    px = im.load()
    out = Image.new("RGBA", im.size, TINTA + (0,))
    po = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if modo == "calado":
                # cuánto se aleja del blanco: el canal más bajo manda (el azul del CEP, el rojo de Tironi)
                k = min(1.0, max(0.0, (255 - min(r, g, b)) / 215))
                alfa = a / 255 * k
            else:
                alfa = a / 255
            po[x, y] = TINTA + (round(alfa * 255),)
    caja = out.getbbox()
    if caja:
        out = out.crop(caja)
    ancho = round(out.width * ALTO / out.height)
    out = out.resize((ancho, ALTO), Image.LANCZOS)
    DESTINO.mkdir(exist_ok=True)
    out.save(DESTINO / nombre, optimize=True)
    print(f"  {nombre}: {out.width}×{out.height}")


if __name__ == "__main__":
    for nombre, (modo, recorte) in LOGOS.items():
        tinta(nombre, modo, recorte)
