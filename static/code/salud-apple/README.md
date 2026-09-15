# Tus datos de Apple Health, en tu computador

Dos scripts para mirar años de datos de la app Salud sin subirlos a ningún lado.
Son la versión abierta de lo que usé en [25 millones de pasos](https://langab.github.io/pagina_web_lang/proyectos/25-millones-de-pasos/).

## 1. Exporta tus datos

En el iPhone: app **Salud** → tu foto de perfil → **Exportar todos los datos de salud**.
Te queda un `exportar.zip`. Descomprímelo; adentro está `apple_health_export/export.xml`.

## 2. Convierte el XML en tablas

```bash
python parse.py apple_health_export/export.xml datos
```

Lee el archivo línea a línea (puede pesar más de 1 GB) y deja un CSV por tipo de dato en `datos/`.

## 3. Resume

```bash
pip install pandas
python resumen.py datos
```

Muestra pasos totales, kilómetros y la mediana de pasos diarios por año, y guarda `resumen.json`.

## ¿Sin instalar nada?

En la página del proyecto puedes arrastrar el `.zip` al navegador. Se procesa en tu computador con un Web Worker; nada sale de tu equipo.

---

Hecho por Benjamín Lang con ayuda de Claude Code. Úsalo, cámbialo y compártelo.
