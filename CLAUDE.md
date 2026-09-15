# Sitio de Benjamín Lang: instrucciones para trabajar en este proyecto

Lee `README.md` para la arquitectura. Resumen: contenido en `content/*.yml` (bilingüe), plantillas Jinja en `templates/`, estilos y JS sin dependencias en `static/`, `python build.py` genera `_site.nosync/`, GitHub Actions publica en cada push.

## Reglas del proyecto

- **Todo cambio de texto va en español e inglés.** Nunca escribas texto visible directo en una plantilla de página; va en `content/`. La excepción son los relatos largos de `templates/projects/<id>.html`, que llevan ambos idiomas lado a lado con `{% if es %}`.
- Textos con comas en YAML en línea van entre comillas (el build lo detecta si no).
- Antes de terminar: `python build.py && python scripts/revisar_enlaces.py`.
- No subir `_site.nosync/` a git. No volver a Quarto ni a la carpeta `docs/`.
- Textos pasados por el humanizador: frases directas, datos concretos, nada inventado. Si una cifra no está verificada, no va.
- Privacidad: no publicar datos de clientes (Aldeas, Francisca Bravo), microdatos del INE, hallazgos no publicados del Fondecyt, datos de salud sensibles (corazón, sueño, rutas GPS), ni nombres de empresas del buscador de trabajo.

## Sistema visual

- Motivo: **puntos** (cada punto es una persona, un registro, un aviso). Aparece en la foto del hero, el relato «De una pregunta a una decisión» y el pie.
- Paleta (variables en `static/css/site.css`): niebla `#ECEDF0` fondo, tinta `#141833` texto, cobalto `#2B3BF5` único acento, noche `#0E1238` secciones oscuras.
- Tipografía: Bricolage Grotesque (títulos), Geist (texto), Geist Mono solo para código.
- Evitar: etiquetas en mayúsculas, separadores con punto medio, flechas pegadas a los botones, numeración 01/02 si no es una secuencia real.
- Movimiento: una entrada orquestada en el hero; lo demás responde a acciones (abrir, filtrar, pasar el cursor). Siempre respetar `prefers-reduced-motion`.
- Referencias de diseño: `../vendedor_paginas_web/ejemplos_webs_grandes/GUIA_DE_DISENO.md`.

## iCloud

El shell a veces se cuelga leyendo archivos de iCloud que no están descargados. Si pasa, abre el archivo una vez con la herramienta de lectura y reintenta. Revisa duplicados con `find . -name "* 2*" -not -path "./.git/*"`.
