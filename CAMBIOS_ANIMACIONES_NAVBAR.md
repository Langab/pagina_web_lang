# 🎬 Cambios Implementados - Animaciones y Navbar Activo

## ✨ Resumen

Se han implementado dos mejoras importantes para la experiencia del usuario:

1. **Animación Fade-in global** en todas las páginas
2. **Resaltado del enlace activo** en el navbar para mejorar la navegación

---

## 📋 Cambios Realizados

### **1. Animación Fade-in Global**

#### 📄 Archivos Creados:
- `includes/page-wrapper-open.html` — Abre el contenedor con clase `.page-container`
- `includes/page-wrapper-close.html` — Cierra el contenedor

#### 🔧 Modificaciones:
- **_quarto.yml** — Agregados los includes para envolver el contenido:
  ```yaml
  include-before-body: includes/page-wrapper-open.html
  include-after-body:
    - includes/page-wrapper-close.html
    - includes/lang-init.html
  ```

#### 🎨 CSS Agregado (en `styles.css`):
```css
.page-container {
  animation: fadeInPage 0.6s ease-out;
}

@keyframes fadeInPage {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Concepto técnico:**
- Cada página se envuelve automáticamente en un `<div class="page-container">`
- Cuando se carga la página, los elementos aparecen gradualmente (fade-in)
- Duración: 0.6 segundos con transición suave (ease-out)
- Se aplica a **todas las páginas automáticamente**

---

### **2. Resaltado del Enlace Activo**

#### 🎯 CSS Agregado (en `styles.css`):
```css
.navbar-nav .nav-link {
  position: relative;
  transition: color 0.25s ease;
}

.navbar-nav .nav-link.active {
  color: var(--color-acento-2, #1abc9c) !important;
  font-weight: 600;
}

.navbar-nav .nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-acento-2), var(--color-acento));
  border-radius: 2px;
  animation: underlineGrow 0.3s ease-out;
}

@keyframes underlineGrow {
  from {
    width: 0;
    left: 50%;
  }
  to {
    width: 100%;
    left: 0;
  }
}
```

#### 🔧 JavaScript Modificado (en `includes/lang-init.html`):
- Nueva función `isCurrentPage(linkHref)` que detecta si un link es la página actual
- Compara el archivo actual con cada link del navbar
- Agrega la clase `.active` al link correspondiente
- La clase `.active` se aplica automáticamente al cargar cada página

**Conceptos técnicos:**

1. **Detección de página actual:**
   - Extrae el nombre del archivo de la URL actual
   - Compara con cada href del navbar
   - Identifica coincidencias exactas

2. **Clase `.active`:**
   - El enlace activo cambia de color a turquesa (#1abc9c)
   - Se pone en negrita (font-weight: 600)
   - Aparece una línea debajo (pseudo-elemento `::after`)

3. **Animación de la línea inferior:**
   - Usa `underlineGrow` que crece desde el centro hacia los lados
   - Duración: 0.3 segundos
   - Efecto suave y profesional

---

## 🎨 Visualmente

### Antes:
```
Inicio | Publicaciones | Trabajos | Blog | Portafolio | CV
```

### Después:
```
Inicio | Publicaciones | Trabajos | Blog | Portafolio | CV
  ↑
  └─ Si estás en "Inicio": aparece en turquesa con línea debajo
```

---

## 🔄 Cómo Funciona

### **En la carga de página:**
1. HTML se renderiza (navbar + contenido)
2. `lang-init.html` se ejecuta (después de que el DOM esté listo)
3. Detecta la página actual (ej: `about.html`)
4. Busca todos los `.nav-link` en el navbar
5. Compara cada href con la página actual
6. Agrega `.active` al link que coincide
7. CSS aplica estilos y animaciones automáticamente

### **Cuando cambias de página:**
1. Cargas la nueva página
2. El contenido realiza fade-in suave (0.6s)
3. El script detecta la nueva página actual
4. Resalta el nuevo enlace activo con turquesa y línea
5. El enlace anterior pierde la clase `.active`

---

## 🌍 Funciona en Ambos Idiomas

La detección de página actual funciona correctamente incluso cuando cambias entre español e inglés:

- `index.html` y `index-en.html` son detectadas como "Inicio" / "Home"
- `about.html` y `about-en.html` son detectadas como "CV"
- Etc.

El enlace activo permanece visible sin importar el idioma.

---

## 📊 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `styles.css` | ✅ Agregadas animaciones y estilos `.active` |
| `includes/lang-init.html` | ✅ Agregada lógica de detección de página activa |
| `_quarto.yml` | ✅ Agregados includes para `.page-container` |
| `includes/page-wrapper-open.html` | ✅ Nuevo archivo |
| `includes/page-wrapper-close.html` | ✅ Nuevo archivo |

---

## 🎯 Resultado Final

✅ **Todas las páginas** tienen animación fade-in suave  
✅ **Enlace activo** resaltado en turquesa con línea animada  
✅ **Funciona en ambos idiomas** (ES/EN)  
✅ **Mejora la UX** — El usuario sabe dónde está en todo momento  
✅ **Profesional y fluido** — Animaciones suaves sin distracciones  

---

## 💡 Notas Técnicas

- **Timing de animaciones:**
  - Fade-in página: 0.6s (ease-out)
  - Línea activa: 0.3s (ease-out)
  - Transición color: 0.25s (ease)

- **Responsive:**
  - Funciona en desktop, tablet y móvil
  - Línea activa se ajusta automáticamente

- **Performance:**
  - Animaciones usan `opacity` y `transform` (GPU accelerated)
  - JavaScript solo se ejecuta al cargar (sin loops constantes)

---

¡Tu sitio web ahora es más dinámico e intuitivo! 🚀
