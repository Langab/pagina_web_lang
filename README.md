# Sitio personal de Benjamín Lang

Sitio bilingüe (español e inglés) publicado en <https://langab.github.io/pagina_web_lang/>.

Es un sitio estático hecho a mano: los **textos viven en archivos de datos**, las **plantillas** arman el HTML y un script de Python lo construye todo. GitHub Actions lo publica solo cada vez que haces `git push` y, además, una vez al día para refrescar las cifras del visor de arriendos.

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
static/                  ← se copia tal cual a /assets/
  css/site.css           ← todo el diseño (paleta y tipografía arriba del archivo)
  js/site.js             ← animaciones, ventanas emergentes, filtros, puntos
  js/casa.js, salud.js   ← simulador de apuestas y lector de Apple Health
  img/                   ← fotos, logos y capturas
  docs/                  ← CV en PDF
  code/                  ← código abierto descargable (se empaqueta en .zip al construir)
scripts/
  capturas.py            ← toma capturas frescas de los proyectos publicados
  revisar_enlaces.py     ← verifica que no haya enlaces ni imágenes rotas
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

## Publicar

```bash
git add -A
git commit -m "Actualizo proyectos"
git push
```

GitHub Actions construye, revisa los enlaces y publica en unos dos minutos. Ya no hay que subir la carpeta `docs/` ni renderizar nada a mano.

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
