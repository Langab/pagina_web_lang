# Sitio personal de Benjamín Lang

Sitio bilingüe (español e inglés) publicado en <https://portafolio-benjamin-lang.pages.dev/> (Cloudflare Pages).

Es un sitio estático hecho a mano: los **textos viven en archivos de datos**, las **plantillas** arman el HTML y un script de Python lo construye todo. GitHub Actions lo publica solo cada vez que haces `git push` y, además, una vez al día para refrescar las cifras del visor de arriendos.

La dirección anterior, <https://langab.github.io/pagina_web_lang/>, sigue en GitHub Pages pero solo con redirecciones: cada página manda a la misma página en la dirección nueva (`scripts/redirigir_github.py`).

Además del HTML, en Cloudflare corren dos funciones chicas (`functions/api/`) con una base D1: un contador anónimo de visitas y el visor privado de métricas en `/metricas/` (lo mismo que tiene guareneitor).

## Cómo está ordenado

```
content/                 ← TODO el texto del sitio, en español e inglés
  site.yml               ← nombre, contacto, páginas, menú, textos cortos de interfaz
  home.yml               ← portada, sección por sección
  projects.yml           ← portafolio propio, experimentos y trabajos en los que participé
  experience.yml         ← trabajos, formación, habilidades, idiomas, charlas, referencias
  publications.yml       ← publicaciones
templates/               ← HTML con Jinja2
  base.html              ← estructura común (encabezado, menú, idioma, pie)
  pages/home.html        ← portada
  pages/portafolio.html  ← portafolio (proyectos propios)
  pages/trabajos.html    ← trabajos, proyectos y consultoría
  pages/cv.html          ← CV
  pages/publications.html ← publicaciones
  projects/<id>.html     ← el relato largo de cada proyecto propio (ES y EN lado a lado)
  partials/              ← piezas reutilizables: ventanas emergentes, índice, contacto
  metricas.html          ← visor privado de métricas (solo en español, fuera del menú)
static/                  ← se copia tal cual a /assets/
  css/site.css           ← todo el diseño (paleta y tipografía arriba del archivo)
  js/site.js             ← animaciones, ventanas emergentes, filtros, puntos y el contador anónimo
  js/metricas.js, css/metricas.css ← el visor de métricas
  img/                   ← fotos, logos y capturas
  docs/                  ← CV en PDF
  code/                  ← código abierto descargable, si hay (se empaqueta en .zip al construir)
functions/api/           ← Cloudflare Pages Functions
  uso.js                 ← POST /api/uso: suma 1 a una clave del día (página, llegada, clic)
  metricas.js            ← GET /api/metricas: datos del visor, con clave
lib/                     ← piezas compartidas de las funciones; rutas.js lo genera build.py
migraciones/             ← esquema de la base D1 (uso_diario, limites, cloudflare_diario)
wrangler.toml            ← proyecto de Cloudflare, base D1 y variables
privado/                 ← clave del visor (no se sube a git)
scripts/
  capturas.py            ← toma capturas frescas de los proyectos publicados
  revisar_enlaces.py     ← verifica que no haya enlaces ni imágenes rotas
  redirigir_github.py    ← arma la versión «solo redirecciones» para la dirección antigua
build.py                 ← construye el sitio en _site.nosync/
```

## Editar textos

Cada texto visible tiene sus dos idiomas juntos:

```yaml
title: { es: Visor de arriendos, en: Rental finder }
```

- Si el texto tiene **comas, dos puntos o signos de interrogación**, ponlo entre comillas: `{ es: "Hola, mundo", en: "Hello, world" }`.
- Se puede usar `**negrita**`, `*cursiva*` y `[enlaces](https://...)`.
- Si falta una traducción, `python build.py` se detiene y dice exactamente dónde.

Las páginas y el menú se definen en `content/site.yml`, en `pages:` y `nav:`. Ahí también viven las redirecciones desde las URL antiguas.

### Agregar un trabajo o consultoría

Copia un bloque dentro de `work:` en `content/projects.yml`, cambia el `id` y los textos. Todo lo que va dentro de `modal:` es opcional: `intro`, `numbers`, `flow`, `did`, `bars`, `gallery`, `tools`, `note`, `links`. Se abre solo en una ventana emergente.

### Agregar un proyecto propio al portafolio

1. Agrega un bloque en `lab:` con `detail: true` y un `slug` para cada idioma.
2. Crea `templates/projects/<id>.html` con el relato. Cada `<section id="...">` con un `<h2>` aparece solo en el índice lateral.
3. Pon la imagen de portada en `static/img/projects/<id>/` en `.jpg` y `.webp`.

### Agregar una publicación

Copia un bloque en `content/publications.yml`.

## Ver el sitio en tu computador

```bash
pip install -r requirements.txt
python build.py --serve
```

Abre <http://localhost:8000>. Cada vez que guardas un archivo, el sitio se reconstruye solo.

Para probar también las funciones y el visor de métricas (con una base local, no la de producción):

```bash
npx wrangler@4.146.0 d1 migrations apply portafolio-benjamin-lang --local
npx wrangler@4.146.0 pages dev --port 8788
```

Las claves de prueba van en `.dev.vars` (no se sube a git).

## Publicar

```bash
git add -A
git commit -m "Actualizo proyectos"
git push
```

GitHub Actions construye, revisa los enlaces, publica en Cloudflare Pages y deja las redirecciones en la dirección antigua, en unos dos minutos.

Para que Actions publique en Cloudflare, el repositorio necesita el secreto `CLOUDFLARE_API_TOKEN` (un token de Cloudflare con permiso **Cloudflare Pages: Edit**). Mientras no esté, ese paso se salta y se publica a mano:

```bash
python build.py && npx wrangler@4.146.0 pages deploy --branch=main --commit-dirty=true
```

## Métricas

`/metricas/` es privada. El link con la clave está en `privado/metricas-link.txt`; abrirlo una vez guarda la clave en ese navegador y hace que sus visitas no se cuenten. Muestra visitas, páginas, desde dónde llegan (LinkedIn, buscadores, portales de empleo), descargas del CV y clics de contacto. No usa cookies ni guarda datos de personas: solo sumas por día.

Para sumar los datos de Cloudflare Web Analytics (países, navegadores, visitas que el contador propio no ve), el visor explica los tres pasos: agregar el sitio en Web Analytics, crear un token con **Account Analytics: Read** y cargarlo con `npx wrangler pages secret put CF_API_TOKEN --project-name portafolio-benjamin-lang`.

## Sobre iCloud

El proyecto vive en iCloud Drive, que no se lleva bien con git ni con carpetas que cambian muchos archivos a la vez (crea duplicados como `index 2.html`). Por eso:

- El sitio construido va en `_site.nosync/`: el sufijo `.nosync` le dice a iCloud que no lo sincronice.
- El sitio construido **no se sube a git**; lo genera GitHub Actions.
- Lo más sano a largo plazo es mover la carpeta del proyecto fuera de iCloud (por ejemplo a `~/Proyectos/`) y dejar que GitHub sea el respaldo.

## Otras tareas

```bash
python scripts/capturas.py            # capturas nuevas de los visores publicados
python scripts/revisar_enlaces.py     # buscar enlaces rotos después de construir
python build.py --check               # solo revisar traducciones
```
