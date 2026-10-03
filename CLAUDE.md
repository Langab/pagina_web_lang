# Sitio de Benjamín Lang: instrucciones para trabajar en este proyecto

Lee `README.md` para la arquitectura.

Estructura del sitio (heredada del sitio antiguo): **Inicio · Portafolio · Trabajos, proyectos y consultoría · Publicaciones · CV**. La portada resume cada una y se lee como un CV: quién es, qué sabe hacer con evidencia, qué construyó, dónde trabajó y qué publicó. Resumen: contenido en `content/*.yml` (bilingüe), plantillas Jinja en `templates/`, estilos y JS sin dependencias en `static/`, `python build.py` genera `_site.nosync/`, GitHub Actions publica en cada push.

Desde el 03-10-2026 el sitio vive en **Cloudflare Pages** (`portafolio-benjamin-lang.pages.dev`, proyecto clásico como guareneitor). La dirección antigua de GitHub Pages solo redirige (`scripts/redirigir_github.py`). Ese link es el que va en el CV y en LinkedIn; si cambia, cambiarlo también en `buscador_trabajo/ai-job-search` (`tools/docx_to_pdf.py` → `PORTAFOLIO`, CLAUDE.md y el perfil del candidato).

## Reglas del proyecto

- **Todo cambio de texto va en español e inglés.** Nunca escribas texto visible directo en una plantilla de página; va en `content/`. La excepción son los relatos largos de `templates/projects/<id>.html`, que llevan ambos idiomas lado a lado con `{% if es %}`.
- Textos con comas en YAML en línea van entre comillas (el build lo detecta si no).
- Antes de terminar: `python build.py && python scripts/revisar_enlaces.py`.
- No subir `_site.nosync/` a git. No volver a Quarto ni a la carpeta `docs/`.
- Textos pasados por el humanizador: frases directas, datos concretos, nada inventado. Si una cifra no está verificada, no va.
- Nada de vender humo: cada afirmación va anclada a un trabajo real (institución, cifra o entregable). Sin listas de servicios ni promesas genéricas.
- Privacidad: no publicar datos de clientes (Aldeas, Francisca Bravo), microdatos del INE, hallazgos no publicados del Fondecyt, datos de salud sensibles (corazón, sueño, rutas GPS), ni nombres de empresas del buscador de trabajo.

## Cloudflare (funciones, base y métricas)

- `functions/api/uso.js` cuenta páginas, llegadas y clics por día; `functions/api/metricas.js` alimenta `/metricas/` con clave. Base D1 `portafolio-benjamin-lang` (esquema en `migraciones/`). Copiado de guareneitor: mismo `lib/comun.js`, mismos límites por HMAC(IP + día).
- No se guarda nada de las personas: solo `(día, clave, n)`. Si se agrega una clave nueva, se agrega a la lista cerrada de `uso.js` (no se aceptan claves inventadas por el navegador).
- `/metricas/` es la única página solo en español y con texto en la plantilla: es privada, la usa Benjamín.
- Secretos en Cloudflare, nunca en disco ni en git: `FIRMA`, `METRICAS_CLAVE` (copia en `privado/`), `CF_API_TOKEN`. Claude no crea tokens de Cloudflare: los crea Benjamín.
- Wrangler con versión fija (`wrangler@4.146.0`), como en guareneitor.

## Sistema visual

- Motivo: **puntos** (cada punto es una persona, un registro, un aviso). Aparece en la foto del hero, el relato «De una pregunta a una decisión» y el pie.
- Paleta (variables en `static/css/site.css`): niebla `#ECEDF0` fondo, tinta `#141833` texto, cobalto `#2B3BF5` único acento, noche `#0E1238` secciones oscuras.
- Tipografía: Bricolage Grotesque (títulos), Geist (texto), Geist Mono solo para código.
- Evitar: etiquetas en mayúsculas, separadores con punto medio, flechas pegadas a los botones, numeración 01/02 si no es una secuencia real.
- Celular: objetivos táctiles de 44 px o más (si el dibujo es chico, el área crece con `::after`), texto de 12 px como mínimo, nada que desborde a 320 px. Revisado con Playwright a 320, 375, 390 y 414 px el 03-10-2026.
- Movimiento: una entrada orquestada en el hero; lo demás responde a acciones (abrir, filtrar, pasar el cursor). Siempre respetar `prefers-reduced-motion`.
- Referencias de diseño: `../vendedor_paginas_web/ejemplos_webs_grandes/GUIA_DE_DISENO.md`.

## iCloud

El shell a veces se cuelga leyendo archivos de iCloud que no están descargados. Si pasa, abre el archivo una vez con la herramienta de lectura y reintenta. Revisa duplicados con `find . -name "* 2*" -not -path "./.git/*"`.
