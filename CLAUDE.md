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

- Rediseño del 31-10-2026 inspirado en estudio-plural.co: minimalista, bloques de color plano a todo el ancho separados por líneas de 1 px, títulos grandes y mucho aire. Propuestas y capturas de ese trabajo: `_prototipos.nosync/rediseno/`.
- Motivo: **puntos** (cada punto es una persona, un registro, un aviso). Aparece en la «a» de «Lang» que se vuelve puntos, la marca 3×3, las manchas azules de la portada, los dibujos de «Reportería automática», el relato «De una pregunta a una decisión» y el pie.
- Paleta (variables en `static/css/site.css`): papel `#F7F7F9` fondo, tinta `#121735` texto, grafito `#4E5470` texto secundario, cobalto `#2B3BF5` acento (botones, enlaces, cifras, el punto de «hoy»), cielo `#C3CCFF` (manchas difusas de la portada), lavanda `#E3E6FF` (bloques «Dónde he trabajado» y «En breve»), noche `#0E1238` (contacto). Nada de verde: Benjamín pidió volver al azul el 01-11-2026.
- Encabezado: marca de puntos + nombre, índice de texto con barras de 1 px (Trabajos | Proyectos propios | Publicaciones | CV), «es | en» y el botón «Escríbeme». Bajo 960 px el índice pasa a una segunda fila; no hay menú escondido.
- Portada, en orden: nombre enorme con la «a» de puntos, frase, bajada, dos botones y la fila «He trabajado en» con logos en una sola tinta (`static/img/logos/tinta/`, se arman con `scripts/logos_tinta.py`); «Dónde he trabajado» (carriles por lugar y sector sobre un eje de meses, con el logo de cada lugar a la izquierda; «hoy» lo fija el build); «Reportería automática» (lo que más le piden: extracción automática, minutas por escuela, visores, auditable y reproducible); «En breve»; «Por mi cuenta» y publicaciones; contacto. Cada lugar y cifra se dice una vez.
- La UTEM no aparece en el sitio (pedido de Benjamín, 31-10-2026). El 01-11-2026 sacó la cinta en movimiento y el bloque de casos «Lo que hice y lo que quedó»: no volver a ponerlos. La investigación con Joaquín Prieto terminó; no va como trabajo vigente.
- Tipografía: Bricolage Grotesque (nombre y títulos, angosta), Geist (texto), Geist Mono solo para código.
- Carga de la portada: un script en `base.html` espera las fuentes como mucho 400 ms; si no llegan, la visita sigue con las del sistema (`.sin-fuente`) y nada salta. El nombre tiene respaldos angostos (Avenir Next Condensed, Bahnschrift, Roboto Condensed, Arial Narrow). Medido el 01-11-2026: LCP 1,6 s en 4G lento y CLS 0.
- Evitar: etiquetas en mayúsculas, separadores con punto medio, flechas pegadas a los botones, numeración 01/02 si no es una secuencia real, contadores animados, tarjetas iguales con sombra.
- Celular: objetivos táctiles de 44 px o más (si el dibujo es chico, el área crece con `::after`), texto de 12 px como mínimo, nada que desborde a 320 px.
- Movimiento: la entrada del nombre y el bucle sutil de la «a» son lo único que se mueve solo; se detienen fuera de pantalla, con la pestaña oculta o con el botón de pausa de la esquina de la portada (WCAG 2.2.2). Lo demás responde a acciones (abrir, filtrar, pasar el cursor). Con `prefers-reduced-motion` todo queda quieto.
- Referencias de diseño: `../vendedor_paginas_web/ejemplos_webs_grandes/GUIA_DE_DISENO.md`.

## iCloud

El shell a veces se cuelga leyendo archivos de iCloud que no están descargados. Si pasa, abre el archivo una vez con la herramienta de lectura y reintenta. Revisa duplicados con `find . -name "* 2*" -not -path "./.git/*"`.
