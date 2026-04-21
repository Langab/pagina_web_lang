# 📋 Cambios realizados - Sección Portafolio

## ✅ Resumen de cambios

Se ha creado una **nueva sección de Portafolio** en tu página web personal con versiones completamente independientes para español e inglés.

---

## 📁 Archivos Creados

### 1. **portafolio/index.qmd** (Versión Español)
- Página principal del portafolio en español
- Contiene:
  - Encabezado con descripción
  - Mensaje "Próximamente"
  - **4 tarjetas de categorías:**
    - 🔄 Procesamiento de Datos
    - 📊 Análisis Estadístico
    - 🎨 Visualización e Infografía
    - 🤖 Técnicas Especiales
  - Sección vacía de scripts (mostrando "Próximamente")
  - Datos de contacto

### 2. **portafolio-en/index.qmd** (Versión Inglés)
- Página principal del portafolio en inglés
- Estructura idéntica a la versión en español
- Todos los textos traducidos al inglés

---

## ⚙️ Archivos Modificados

### 3. **_quarto.yml**
**Cambio realizado:**
```yaml
# Agregado en la sección navbar → left:
- href: portafolio/index.qmd
  text: Portafolio
```

**Ubicación en el menú:**
Inicio > Publicaciones > Trabajos > Blog > **Portafolio** > CV

---

### 4. **includes/lang-init.html**
**Cambios realizados:**

#### a) Diccionario de traducciones actualizado:
```javascript
'portafolio/index.html': 'Portafolio',  // ES
'portafolio/index.html': 'Portfolio',   // EN
```

#### b) Mapa de páginas EN actualizado:
```javascript
'portafolio/index.html': 'portafolio-en/index.html',
```

**Conceptos técnicos:**
- El script detecta si estás en una página `-en` (inglés) o no (español)
- Cuando cambias el idioma con el toggle ES/EN, los textos del navbar se traducen dinámicamente
- El mapeo de rutas asegura que los links correctos se mantienen en cada idioma

---

### 5. **styles.css**
**Agregados nuevos estilos CSS para:**

#### `.portafolio-header`
- Fondo con gradiente personalizado
- Encabezado con "chip" de badge
- Descripción centrada

#### `.portafolio-card-categoria`
- **Tarjetas visuales** con:
  - Borde superior con gradiente (que aparece al hacer hover)
  - Sombra dinámica
  - Animación de elevación (`translateY`)
  - Icono, título, descripción y badge "Próximamente"

#### `.portafolio-empty`
- Estado vacío con ícono y mensaje
- Diseño con borde punteado

**Características CSS:**
- Transiciones suaves (0.25s-0.4s)
- Paleta de colores consistente con tu sitio
- Responsive para móviles (máx 768px)
- Gradientes y sombras para profundidad visual

---

## 🎨 Características del Diseño

### Estructura de Tarjetas
Cada categoría incluye:
- **Icono emoji** (📥, 📈, 🎨, ⚙️)
- **Título** descriptivo
- **Descripción** de qué contiene
- **Badge "Próximamente"** en color turquesa

### Interactividad
- Hover: las tarjetas se elevan y ganan sombra
- Barra superior con gradiente se "expande" al pasar el mouse
- Transiciones suaves para todas las animaciones

### Responsive
- En pantallas grandes: 2 columnas de tarjetas
- En móviles: 1 columna a pantalla completa

---

## 🌍 Estructura Bilingüe

| Elemento | Español | Inglés |
|----------|---------|--------|
| Ruta | `/portafolio/index.html` | `/portafolio-en/index.html` |
| Título página | "Portafolio" | "Portfolio" |
| Texto navbar | "Portafolio" | "Portfolio" |
| Categorías | 4 (con descripciones ES) | 4 (con descripciones EN) |

---

## 📝 Próximos Pasos

### Cuando quieras agregar scripts:
1. Crea una carpeta `portafolio/scripts/` (opcional)
2. En `portafolio/index.qmd`, reemplaza la sección `.portafolio-empty` con:
   ```r
   # Una galería de tarjetas con información del script
   # - Nombre del script
   # - Descripción
   # - Categoría
   # - Enlace a GitHub o descarga
   ```

3. Repite lo mismo en `portafolio-en/index.qmd`

### Renderizar el proyecto:
```bash
cd /path/to/Pagina_web_BL
quarto render
```

---

## 📊 Notas Técnicas

### Conceptos explicados:

**1. Diccionario bilingüe en JavaScript**
- Almacena todas las traducciones del navbar
- Se consulta según el idioma actual detectado
- Facilita mantenimiento futuro

**2. Mapa de enrutamiento**
- `enPageMap` mapea páginas ES a EN
- Asegura que los links se actualicen al cambiar idioma
- Mantiene la coherencia en la navegación

**3. Detección de idioma**
- Se basa en la URL actual
- Busca patrones como `-en.html` o `-en/`
- Calcula automáticamente la URL opuesta

**4. Grid CSS Responsivo**
- `grid-template-columns: repeat(3, 1fr)` → 3 columnas en desktop
- Media query a 768px → 2 columnas
- Media query a 640px → 1 columna (móvil)

**5. Transiciones CSS**
- `transform-origin: left` → la barra de color "crece" desde la izquierda
- `translateY(-4px)` → efecto de "levitación" al hover
- Timing: 0.25s-0.4s para animaciones fluidas

---

## ✨ Resultado Final

Tu página ahora incluye una **sección profesional de Portafolio** que:
- ✅ Se mantiene en sincronía con el sistema bilingüe
- ✅ Tiene un diseño visual atractivo y moderno
- ✅ Es completamente responsive
- ✅ Está lista para recibir contenido de scripts cuando lo desees
- ✅ Muestra "Próximamente" de forma clara y organizada

¡Listos para agregar scripts cuando lo necesites! 🚀
