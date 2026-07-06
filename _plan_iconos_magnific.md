# Plan: reemplazo de emojis por iconos diseñados (Magnific MCP)

> Archivo de trabajo interno (el guion bajo inicial evita que Quarto lo publique).
> Estado: **pendiente de autenticación del MCP** (`magnific` agregado a la config
> local; requiere OAuth en sesión interactiva: `claude` → `/mcp` → authenticate).

## Especificación de estilo (una sola familia visual)

- Estilo: iconos **flat minimalistas duotono**, trazo consistente, sin degradados
  fotorrealistas, sin sombras 3D. Estética editorial sobria (nada "AI-looking").
- Paleta del sitio: azul oscuro `#1a2e4a` (primario), azul `#2980b9` (acento),
  verde agua `#1abc9c` (acento secundario). Fondo **transparente**.
- Formato: PNG 256×256 (o SVG si el MCP lo permite), guardar en `img/icons/`.
- Mismo peso visual y padding interno en todos (se usan a 28–44 px).

## Prompt base para Magnific

"Flat minimal duotone icon of {CONCEPTO}, editorial style, solid strokes,
two colors only (#1a2e4a and #1abc9c), transparent background, centered,
consistent 10% padding, no text, no gradients, no 3D, no photorealism."

## Mapeo emoji → archivo → concepto

| Emoji | Archivo | Concepto para el prompt | Dónde se usa |
|---|---|---|---|
| 📊 | `stats.png` | bar chart / data analysis | área 1, servicios, chips portafolio |
| 🏛️ | `governance.png` | classical building / institution | área 2, servicios |
| 🔬 | `research.png` | microscope / research | área 3, secciones |
| 📋 | `reports.png` | clipboard report | área 4 |
| 📈 | `dashboard.png` | line chart growing | servicios |
| 🗳️ | `electoral.png` | ballot box | servicios |
| 🎓 | `training.png` | graduation cap | servicios, formación CV |
| 📝 | `survey.png` | pencil and form | servicios, blog |
| 🎯 | `strategy.png` | target with arrow | servicios |
| 🔍 | `audit.png` | magnifying glass over document | servicios |
| ⚙️ | `automation.png` | gear | badge hero |
| 🤖 | `ai.png` | abstract neural network node | badge hero |
| 📧 / 📩 / ✉️ | `email.png` | envelope | contacto (todas las páginas) |
| 📱 / 📞 | `phone.png` | smartphone | contacto |
| 🔗 | `link.png` | chain link | LinkedIn/contacto |
| 📄 | `document.png` | document page | chip CV, botón descarga |
| 💼 | `briefcase.png` | briefcase | secciones proyectos/trayectoria |
| 🛠️ | `services.png` | crossed tools | sección servicios |
| 📰 | `publications.png` | newspaper | publicaciones |
| 👤 | `profile.png` | person silhouette | sobre mí (CV) |
| 🎤 | `talks.png` | microphone | actividades académicas |
| 🏢 | `company.png` | office building | trabajos |
| 🤝 | `consulting.png` | handshake | consultoría |
| 🖥️ | `desktop.png` | computer screen with chart | trabajos |
| 🏠 | `housing.png` | house with map pin | portafolio (visor) |
| 🧰 | `toolbox.png` | toolbox | portafolio (scripts R) |
| 📌 | `pin.png` | push pin | callouts |

**No reemplazar:** banderas de idiomas (🇨🇱 🇬🇧 🇮🇹), emojis dentro del texto
narrativo del post del blog (🐾 🤔 🎉 💎 etc.) — solo los emojis usados como
*iconos de interfaz*.

## Implementación (cuando existan los archivos)

1. Generar los 27 iconos con el MCP → `img/icons/`.
2. CSS: clase `.icono-img { width:1.6em; height:1.6em; vertical-align:-0.3em; }`
   y variantes para `.tarjeta-icono` (40px) y `.servicio-card .icono` (36px).
3. Sustituir en: `index.qmd`, `index-en.qmd`, `about.qmd`, `about-en.qmd`,
   `trabajos.qmd`, `trabajos-en.qmd`, `publicaciones.qmd`, `publicaciones-en.qmd`,
   `portafolio/index.qmd`, `portafolio-en/index.qmd` (títulos de sección con
   `<img>` inline; tarjetas vía htmltools `tags$img`).
4. **Regla del sitio: todo cambio se replica en la versión ES y EN.**
5. Render UTF-8 + revisar duplicados iCloud + push (ver memoria quarto-build-gotchas).
