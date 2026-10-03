/* Visor privado de métricas (/metricas/). Lee /api/metricas con la clave y pinta todo acá.
   La clave llega una vez en el link (#k=…), se guarda en este navegador y se borra de la barra.
   Abrir el visor marca este navegador como «Benjamín»: sus visitas dejan de contarse. */
(() => {
  const raiz = document.querySelector("[data-metricas]");
  if (!raiz) return;
  const $ = (s) => raiz.querySelector(s);
  const fmt = new Intl.NumberFormat("es-CL");
  const fDia = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });
  const fLargo = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" });
  const fHora = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const aFecha = (d) => new Date(d + "T12:00:00");
  const titulos = JSON.parse(raiz.dataset.titulos || "{}");
  const guardar = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* bloqueado */ } };
  const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

  const NOMBRES = {
    clics: { "cv-es": "Descargó el CV (español)", "cv-en": "Descargó el CV (inglés)", correo: "Escribió un correo", telefono: "Tocó el teléfono",
      linkedin: "Abrió LinkedIn", github: "Abrió GitHub", proyecto: "Abrió un proyecto en vivo", publicacion: "Abrió una publicación", otro: "Otro link externo" },
    equipos: { computador: "Computador", celular: "Celular", tablet: "Tablet" },
    refs: { directo: "Directo o desde un PDF", otro: "Otros sitios", "langab.github.io": "Dirección antigua (GitHub)" },
  };

  // ── Clave ───────────────────────────────────────────────────────────
  const m = location.hash.match(/k=([A-Za-z0-9_-]{16,200})/);
  if (m) { guardar("bl.metricas", m[1]); history.replaceState(null, "", location.pathname); }
  guardar("bl.yo", "1");
  let clave = leer("bl.metricas");

  const login = $("[data-login]"), panel = $("[data-panel]");
  login.addEventListener("submit", (e) => {
    e.preventDefault();
    clave = login.clave.value.trim();
    guardar("bl.metricas", clave);
    cargar();
  });
  const pedirClave = (msg) => {
    panel.hidden = true; login.hidden = false;
    $("[data-login-error]").textContent = msg || "";
    login.clave.focus();
  };

  // ── Datos ───────────────────────────────────────────────────────────
  let datos = null, periodo = 30;
  async function cargar() {
    if (!clave) return pedirClave();
    panel.classList.add("is-cargando");
    let r;
    try { r = await fetch("/api/metricas", { headers: { Authorization: "Bearer " + clave }, cache: "no-store" }); }
    catch { return pedirClave("No hay conexión con el servidor."); }
    if (r.status === 401) { guardar("bl.metricas", null); clave = null; return pedirClave("Esa clave no es."); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); return pedirClave(j.error || "El servidor respondió con un error (" + r.status + ")."); }
    datos = await r.json();
    login.hidden = true; panel.hidden = false; panel.classList.remove("is-cargando");
    $("[data-generado]").textContent = "Actualizado el " + fHora.format(new Date(datos.generado));
    pintar();
  }

  raiz.querySelectorAll("[data-periodo]").forEach((b) => b.addEventListener("click", () => {
    periodo = Number(b.dataset.periodo);
    raiz.querySelectorAll("[data-periodo]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    pintar();
  }));

  // Días del período, del más antiguo al de hoy (sin huecos: un día sin visitas es un cero).
  function diasDel(hoy, filas) {
    const primero = filas.length ? filas[0][0] : hoy;
    const desde = periodo ? new Date(aFecha(hoy).getTime() - (periodo - 1) * 864e5) : aFecha(primero < hoy ? primero : hoy);
    const out = [];
    for (let d = desde; d <= aFecha(hoy); d = new Date(d.getTime() + 864e5)) out.push(d.toISOString().slice(0, 10));
    return out;
  }

  function pintar() {
    const hoy = datos.hoy, filas = datos.uso;
    const dias = diasDel(hoy, filas), enRango = new Set(dias);
    const sum = new Map(), porDia = new Map(dias.map((d) => [d, { sesion: 0, vistas: 0, cv: 0, linkedin: 0 }]));
    for (const [d, k, n] of filas) {
      if (!enRango.has(d)) continue;
      sum.set(k, (sum.get(k) || 0) + n);
      const x = porDia.get(d);
      if (k === "sesion") x.sesion += n;
      else if (k.startsWith("vista:")) x.vistas += n;
      else if (k === "clic:cv-es" || k === "clic:cv-en") x.cv += n;
      else if (k === "ref:linkedin.com") x.linkedin += n;
    }
    const total = (pref) => [...sum].filter(([k]) => k.startsWith(pref)).reduce((s, [, n]) => s + n, 0);
    const grupo = (pref, nombres) => [...sum].filter(([k]) => k.startsWith(pref))
      .map(([k, n]) => { const id = k.slice(pref.length); return [nombres ? nombres(id) : id, n]; })
      .sort((a, b) => b[1] - a[1]);

    const sesiones = sum.get("sesion") || 0, vistas = total("vista:");
    const cv = (sum.get("clic:cv-es") || 0) + (sum.get("clic:cv-en") || 0), linkedin = sum.get("ref:linkedin.com") || 0;
    const rotulo = periodo ? `en ${periodo} días` : "desde el inicio";
    tiles([
      ["Visitas", sesiones, rotulo],
      ["Páginas vistas", vistas, sesiones ? `${fmt.format(Math.round((vistas / sesiones) * 10) / 10)} por visita` : rotulo],
      ["Descargas del CV", cv, "desde el sitio"],
      ["Llegadas desde LinkedIn", linkedin, sesiones ? `${Math.round((linkedin / sesiones) * 100)}% de las visitas` : rotulo],
    ]);

    columnas($("[data-dias]"), dias.map((d) => [d, porDia.get(d).sesion]), "visitas");
    lista($("[data-lista=paginas]"), grupo("vista:", (p) => titulos[p] || p).slice(0, 12));
    lista($("[data-lista=refs]"), grupo("ref:", (r) => NOMBRES.refs[r] || r).slice(0, 12));
    lista($("[data-lista=clics]"), grupo("clic:", (c) => NOMBRES.clics[c] || c));
    lista($("[data-lista=equipos]"), grupo("disp:", (e) => NOMBRES.equipos[e] || e));
    cloudflare(enRango);
    tabla(dias.slice().reverse().map((d) => [d, porDia.get(d)]));
  }

  // ── Piezas ──────────────────────────────────────────────────────────
  function tiles(items) {
    const cont = $("[data-tiles]");
    cont.replaceChildren(...items.map(([etq, val, nota]) => {
      const el = document.createElement("div");
      const e = document.createElement("span"); e.textContent = etq;
      const v = document.createElement("b"); v.textContent = fmt.format(val);
      const n = document.createElement("small"); n.textContent = nota;
      el.append(e, v, n);
      return el;
    }));
  }

  function vacio(cont, txt = "Todavía no hay datos en este período.") {
    const p = document.createElement("p"); p.className = "mx-vacio"; p.textContent = txt;
    cont.replaceChildren(p);
  }

  // Barras horizontales: etiqueta, barra y valor en la punta. Al pasar, la parte del total.
  function lista(cont, filas) {
    if (!filas.length) return vacio(cont);
    const max = Math.max(...filas.map((f) => f[1])), suma = filas.reduce((s, f) => s + f[1], 0);
    const ul = document.createElement("ul"); ul.className = "mx-barras";
    for (const [etq, n] of filas) {
      const li = document.createElement("li"); li.tabIndex = 0;
      const t = document.createElement("span"); t.className = "mx-etq"; t.textContent = etq;
      const pista = document.createElement("span"); pista.className = "mx-pista";
      const barra = document.createElement("i"); barra.style.width = Math.max(2, (n / max) * 100) + "%";
      pista.append(barra);
      const v = document.createElement("b"); v.textContent = fmt.format(n);
      li.append(t, pista, v);
      const info = () => [fmt.format(n), `${etq}, ${Math.round((n / suma) * 100)}% del total`];
      li.addEventListener("pointerenter", (e) => tip(e.clientX, e.clientY, ...info()));
      li.addEventListener("pointermove", (e) => tip(e.clientX, e.clientY, ...info()));
      li.addEventListener("pointerleave", ocultarTip);
      li.addEventListener("focus", () => { const r = li.getBoundingClientRect(); tip(r.right, r.top, ...info()); });
      li.addEventListener("blur", ocultarTip);
      ul.append(li);
    }
    cont.replaceChildren(ul);
  }

  // Columnas por día en SVG: base única, punta redondeada, retícula tenue y un cursor que busca el día.
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  function limpio(max) {
    if (max <= 4) return 4;
    const p = 10 ** Math.floor(Math.log10(max)), f = max / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function columnas(cont, serie, unidad) {
    if (!serie.some(([, n]) => n)) return vacio(cont);
    const W = Math.max(280, cont.clientWidth), H = 220, m = { t: 16, r: 8, b: 26, l: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, tope = limpio(Math.max(...serie.map(([, n]) => n)));
    const paso = iw / serie.length, ancho = Math.max(2, Math.min(24, paso - 2));
    const y = (n) => m.t + ih - (n / tope) * ih;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", tabindex: 0,
      "aria-label": `${unidad} por día; usa las flechas para recorrer los días` });
    for (const t of [0, tope / 2, tope]) {
      svg.append(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "mx-reticula" }));
      const tx = svgEl("text", { x: m.l - 8, y: y(t) + 4, "text-anchor": "end", class: "mx-eje" }); tx.textContent = fmt.format(t); svg.append(tx);
    }
    let pico = 0;
    serie.forEach(([, n], i) => { if (n > serie[pico][1]) pico = i; });
    serie.forEach(([, n], i) => {
      if (!n) return;
      const x = m.l + i * paso + (paso - ancho) / 2, h = Math.max(1, (n / tope) * ih), r = Math.min(4, ancho / 2, h);
      // Punta redondeada de 4 px, base recta sobre la línea de cero.
      svg.append(svgEl("path", { class: "mx-col", d: `M${x},${m.t + ih} v${-(h - r)} q0,${-r} ${r},${-r} h${ancho - 2 * r} q${r},0 ${r},${r} v${h - r} z` }));
    });
    // Un solo rótulo directo: el día con más visitas.
    const xp = m.l + pico * paso + paso / 2;
    const rp = svgEl("text", { x: Math.min(Math.max(xp, m.l + 12), W - m.r - 12), y: y(serie[pico][1]) - 6, "text-anchor": "middle", class: "mx-rotulo" });
    rp.textContent = fmt.format(serie[pico][1]); svg.append(rp);
    // Eje X: primer y último día, y el comienzo de cada mes si el período es largo.
    const marcas = new Set([0, serie.length - 1]);
    if (serie.length > 45) serie.forEach(([d], i) => { if (d.endsWith("-01")) marcas.add(i); });
    for (const i of marcas) {
      const tx = svgEl("text", { x: m.l + i * paso + paso / 2, y: H - 6, "text-anchor": i === 0 ? "start" : i === serie.length - 1 ? "end" : "middle", class: "mx-eje" });
      tx.textContent = fDia.format(aFecha(serie[i][0])); svg.append(tx);
    }
    const cruz = svgEl("line", { y1: m.t, y2: m.t + ih, class: "mx-cruz", visibility: "hidden" });
    svg.append(cruz);
    let actual = -1;
    const mostrar = (i, cx, cy) => {
      actual = i;
      const x = m.l + i * paso + paso / 2;
      cruz.setAttribute("x1", x); cruz.setAttribute("x2", x); cruz.setAttribute("visibility", "visible");
      const [d, n] = serie[i];
      tip(cx, cy, `${fmt.format(n)} ${n === 1 ? unidad.replace(/s$/, "") : unidad}`, fLargo.format(aFecha(d)));
    };
    const fuera = () => { cruz.setAttribute("visibility", "hidden"); ocultarTip(); };
    // pointerdown cubre el toque en el celular, donde no hay «pasar el cursor».
    const enPunto = (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
      mostrar(Math.max(0, Math.min(serie.length - 1, Math.floor((px - m.l) / paso))), e.clientX, e.clientY);
    };
    svg.addEventListener("pointermove", enPunto);
    svg.addEventListener("pointerdown", enPunto);
    svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") fuera(); });
    svg.addEventListener("blur", fuera);
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = Math.max(0, Math.min(serie.length - 1, (actual < 0 ? serie.length : actual) + (e.key === "ArrowRight" ? 1 : -1)));
      const r = svg.getBoundingClientRect();
      mostrar(i, r.left + ((m.l + i * paso + paso / 2) / W) * r.width, r.top + 20);
    });
    cont.replaceChildren(svg);
  }

  // Un solo globo para todo el visor: el valor primero, la etiqueta después.
  const globo = $("[data-tip]");
  function tip(x, y, valor, etq) {
    const b = document.createElement("b"); b.textContent = valor;
    const s = document.createElement("span"); s.textContent = etq;
    globo.replaceChildren(b, s); globo.hidden = false;
    const w = globo.offsetWidth, h = globo.offsetHeight;
    globo.style.left = Math.min(innerWidth - w - 8, Math.max(8, x + 14)) + "px";
    globo.style.top = Math.max(8, y - h - 12) + "px";
  }
  function ocultarTip() { globo.hidden = true; }
  // En el celular el globo se abre con un toque; otro toque fuera del gráfico lo cierra.
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-dias] svg, .mx-columnas svg, .mx-barras li")) ocultarTip(); });

  function cloudflare(enRango) {
    const cont = $("[data-cf-cuerpo]"), cf = datos.cf;
    if (!cf.conectado) {
      const p = document.createElement("div"); p.className = "mx-aviso";
      const t = document.createElement("p");
      t.textContent = "Todavía no está conectado (" + cf.motivo + "). Los números de arriba no dependen de esto: vienen de la propia página. "
        + "Cloudflare suma países, navegadores y sistemas, y cuenta también a quien no ejecuta el contador propio.";
      const ol = document.createElement("ol");
      for (const paso of [
        "En el panel de Cloudflare: Analytics & Logs → Web Analytics → Add a site, con portafolio-benjamin-lang.pages.dev. Copia el «token» del script y el «site tag».",
        "My Profile → API Tokens → Create Custom Token, con el permiso Account → Account Analytics → Read.",
        "Pásale los tres datos a Claude, o ponlos tú: el token del script en content/site.yml (analytics_token), el site tag en wrangler.toml (CF_SITE_TAG) y el token de la API con «npx wrangler pages secret put CF_API_TOKEN --project-name portafolio-benjamin-lang».",
      ]) { const li = document.createElement("li"); li.textContent = paso; ol.append(li); }
      p.append(t, ol);
      return cont.replaceChildren(p);
    }
    // Cloudflare entrega fechas UTC; para el período alcanza con la misma ventana de días.
    const dias = [...enRango], porDia = new Map(cf.dias.map(([d, , visitas]) => [d, visitas]));
    const graf = document.createElement("div"); graf.className = "mx-columnas";
    const tarj = document.createElement("article"); tarj.className = "mx-card mx-ancha";
    const h = document.createElement("h3"); h.textContent = "Visitas por día según Cloudflare";
    tarj.append(h, graf);
    const grid = document.createElement("div"); grid.className = "mx-grid";
    const bloque = (titulo, filas) => {
      const a = document.createElement("article"); a.className = "mx-card";
      const t = document.createElement("h3"); t.textContent = titulo;
      const c = document.createElement("div"); a.append(t, c); grid.append(a);
      lista(c, filas.filter(([k]) => k !== "").map(([k, vistas]) => [k, vistas]));
    };
    const nota = document.createElement("p"); nota.className = "mx-sub";
    nota.textContent = "Las listas de Cloudflare cubren sus últimos 90 días, sin importar el período elegido.";
    cont.replaceChildren(tarj, nota, grid);
    columnas(graf, dias.map((d) => [d, porDia.get(d) || 0]), "visitas");
    bloque("Países", cf.paises);
    bloque("Desde dónde llegan", cf.referentes.map(([k, a, b]) => [k || "Directo", a, b]));
    bloque("Páginas", cf.paginas.map(([k, a, b]) => [titulos[k] || k, a, b]));
    bloque("Navegadores", cf.navegadores);
    bloque("Sistemas", cf.sistemas);
    bloque("Equipos", cf.equipos);
  }

  function tabla(filas) {
    const t = document.createElement("table");
    const cab = t.createTHead().insertRow();
    for (const c of ["Día", "Visitas", "Páginas vistas", "Descargas del CV", "Desde LinkedIn"]) { const th = document.createElement("th"); th.textContent = c; cab.append(th); }
    const cuerpo = t.createTBody();
    for (const [d, x] of filas) {
      const r = cuerpo.insertRow();
      for (const v of [fLargo.format(aFecha(d)), fmt.format(x.sesion), fmt.format(x.vistas), fmt.format(x.cv), fmt.format(x.linkedin)]) r.insertCell().textContent = v;
    }
    $("[data-tabla]").replaceChildren(t);
  }

  let espera;
  addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(() => datos && pintar(), 150); });
  cargar();
})();
