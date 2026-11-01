/* Benjamín Lang — interacciones del sitio. Sin dependencias. */
(() => {
  const doc = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const css = (name) => getComputedStyle(doc).getPropertyValue(name).trim();

  /* ── Encabezado: la línea de abajo aparece al bajar ───────────────── */
  const header = $("[data-header]");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header?.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── Aparición al entrar en pantalla ──────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      entry.target.dispatchEvent(new CustomEvent("in"));
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
  $$("[data-reveal], .funnel, .reveal-bars, [data-type], .pipeline").forEach((el) => io.observe(el));

  /* ── Terminal que escribe ─────────────────────────────────────────── */
  $$("[data-type]").forEach((term) => {
    const lines = JSON.parse(term.dataset.type);
    const body = $(".terminal-body", term);
    const render = (upto, partial = "") => {
      body.innerHTML = lines.slice(0, upto).map((l) => `<span class="${l.c || ""}">${l.t}</span>`).join("\n") +
        (upto < lines.length ? `${upto ? "\n" : ""}<span class="${lines[upto].c || ""}">${partial}</span><span class="caret"></span>` : "");
    };
    term.addEventListener("in", () => {
      if (reduced) return render(lines.length);
      let i = 0, j = 0;
      const tick = () => {
        if (i >= lines.length) return render(lines.length);
        const line = lines[i];
        if (line.c === "p" && j < line.t.length) { j += 1; render(i, line.t.slice(0, j)); return setTimeout(tick, 28); }
        i += 1; j = 0; render(i);
        setTimeout(tick, line.c === "p" ? 380 : 140);
      };
      tick();
    }, { once: true });
  });

  /* ── Pipeline que se ilumina paso a paso ─────────────────────────── */
  $$(".pipeline").forEach((list) => {
    list.addEventListener("in", () => {
      $$("li", list).forEach((li, i) => setTimeout(() => li.classList.add("is-lit"), reduced ? 0 : 220 * i));
    }, { once: true });
  });

  /* ── Copiar correo ────────────────────────────────────────────────── */
  $$("[data-copy]").forEach((btn) => {
    const original = btn.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = btn.dataset.done;
        btn.classList.add("is-done");
        setTimeout(() => { btn.textContent = original; btn.classList.remove("is-done"); }, 2200);
      } catch { window.location.href = `mailto:${btn.dataset.copy}`; }
    });
  });

  /* ── Ventanas emergentes (proyectos) ──────────────────────────────── */
  let lastTrigger = null;
  const openModal = (dialog, trigger) => {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || null;
    dialog.showModal();
    doc.classList.add("modal-open");
    dialog.scrollTop = 0;
    history.replaceState(null, "", `#${dialog.id}`);
    $$(".reveal-bars", dialog).forEach((el) => setTimeout(() => el.classList.add("is-in"), 150));
  };
  const closeModal = (dialog) => {
    if (!dialog?.open || dialog.classList.contains("is-closing")) return;
    const done = () => {
      dialog.classList.remove("is-closing");
      dialog.close();
      doc.classList.remove("modal-open");
      history.replaceState(null, "", window.location.pathname + window.location.search);
      lastTrigger?.focus({ preventScroll: true });
    };
    if (reduced) return done();
    dialog.classList.add("is-closing");
    dialog.addEventListener("animationend", done, { once: true });
  };
  $$("[data-modal]").forEach((btn) => btn.addEventListener("click", () => openModal(document.getElementById(btn.dataset.modal), btn)));
  $$("dialog.modal").forEach((dialog) => {
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(dialog); });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.closest("[data-close]")) closeModal(dialog);
    });
  });
  if (location.hash.startsWith("#p-")) {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches("dialog")) openModal(target);
  }

  /* ── Filtros del índice de proyectos ──────────────────────────────── */
  $$("[data-filters]").forEach((bar) => {
    const list = document.getElementById(bar.dataset.filters);
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      $$("[data-filter]", bar).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const value = btn.dataset.filter;
      const rows = $$("[data-area]", list);
      const apply = () => rows.forEach((row) => { row.hidden = value !== "all" && !row.dataset.area.split(" ").includes(value); });
      if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
    });
  });

  /* ── Vista previa flotante al pasar sobre un proyecto ─────────────── */
  const preview = $("[data-preview-box]");
  if (preview && fineHover) {
    const img = new Image();
    img.alt = ""; img.decoding = "async";
    let x = 0, y = 0, px = 0, py = 0, raf = null, encima = null;
    const loop = () => {
      px += (x - px) * 0.18; py += (y - py) * 0.18;
      preview.style.left = `${px + 170}px`; preview.style.top = `${py}px`;
      raf = preview.classList.contains("is-on") || Math.abs(x - px) > 0.5 ? requestAnimationFrame(loop) : null;
    };
    $$("[data-preview]").forEach((row) => {
      // El cuadro aparece solo cuando su imagen ya cargó y el cursor sigue sobre la fila.
      const mostrar = () => {
        if (encima !== row) return;
        if (!img.isConnected) preview.append(img);
        preview.classList.add("is-on");
        if (!raf) raf = requestAnimationFrame(loop);
      };
      row.addEventListener("pointerenter", (e) => {
        encima = row;
        x = px = e.clientX; y = py = e.clientY;
        if (img.getAttribute("src") === row.dataset.preview && img.complete) return mostrar();
        preview.classList.remove("is-on");
        img.onload = mostrar;
        img.src = row.dataset.preview;
      });
      row.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
      row.addEventListener("pointerleave", () => { encima = null; preview.classList.remove("is-on"); });
    });
  }

  /* ── Inclinación leve de las capturas ─────────────────────────────── */
  if (fineHover && !reduced) {
    $$("[data-tilt]").forEach((el) => {
      const frame = $(".browser", el) || el;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        frame.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
        frame.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 5}deg`);
      });
      el.addEventListener("pointerleave", () => { frame.style.setProperty("--rx", "0deg"); frame.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ── Índice lateral de páginas de proyecto (se arma con los h2) ───── */
  const tocList = $("[data-toc] ol");
  if (tocList) {
    $$(".article section[id]").forEach((section) => {
      const h2 = $("h2", section);
      if (!h2) return;
      const li = document.createElement("li");
      li.innerHTML = `<a href="#${section.id}"></a>`;
      li.firstChild.textContent = h2.textContent;
      tocList.append(li);
    });
  }
  const tocLinks = $$(".toc a");
  if (tocLinks.length) {
    const sections = tocLinks.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.toggle("is-active", a.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ── Línea de tiempo que se va llenando ───────────────────────────── */
  $$(".timeline").forEach((tl) => {
    const update = () => {
      const r = tl.getBoundingClientRect();
      const p = (window.innerHeight * 0.6 - r.top) / r.height;
      tl.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(3));
    };
    if (reduced) return tl.style.setProperty("--p", 1);
    window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    update();
  });

  /* ── Visor embebido bajo demanda ──────────────────────────────────── */
  $$("[data-embed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest(".embed");
      const frame = document.createElement("iframe");
      frame.src = btn.dataset.embed;
      frame.title = btn.dataset.title || "";
      frame.loading = "lazy";
      box.replaceChildren(frame);
    });
  });

  /* ================================================================== */
  /* Portada: fuentes, entrada, la «a» viva y la cinta                   */
  /* ================================================================== */
  const portada = $("[data-portada]");
  if (portada) {
    const recorte = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const suave = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const salida = (p) => 1 - Math.pow(1 - p, 3);
    const cinta = $("[data-cinta]");

    // 1. Fuentes: la carrera «fuente del nombre o 400 ms» parte en el <head> (base.html), apenas
    //    carga el CSS; ahí se ponen «listo» y «entra». Aquí solo se espera su resultado.
    const fuentes = window.blFuentes || Promise.resolve(false);
    if (!window.blFuentes) doc.classList.add("listo");

    // 2. Lo que se mueve solo corre únicamente si se ve: portada en pantalla, pestaña activa y
    //    sin la pausa del botón de la cinta (WCAG 2.2.2; la elección se recuerda en este navegador).
    let detenido = false;
    try { detenido = localStorage.getItem("bl.quieto") === "1"; } catch { /* almacenamiento bloqueado */ }
    let enPantalla = true, pestana = !document.hidden, visible = !detenido;
    const oyentes = new Set();
    const avisar = () => {
      const v = enPantalla && pestana && !detenido;
      if (v === visible) return;
      visible = v;
      oyentes.forEach((fn) => fn(v));
    };
    new IntersectionObserver(([e]) => { enPantalla = e.isIntersecting; avisar(); }).observe(portada);
    document.addEventListener("visibilitychange", () => { pestana = !document.hidden; avisar(); });

    // Bucle con reloj propio: al pausar, el tiempo se congela y retoma donde quedó.
    const bucle = (dibujar) => {
      let id = 0, ultimo = 0, t = 0, activo = false;
      const paso = (ahora) => {
        t += Math.min(ahora - ultimo, 50) / 1000;
        ultimo = ahora;
        dibujar(t);
        if (activo) id = requestAnimationFrame(paso);
      };
      const cambiar = (v) => {
        if (v && !activo) { activo = true; ultimo = performance.now(); id = requestAnimationFrame(paso); }
        if (!v) { activo = false; cancelAnimationFrame(id); }
      };
      oyentes.add(cambiar);
      cambiar(visible);
    };

    // 3. La «a» de Lang: se vuelve puntos, se pone líquida (los avisos se tiñen de cobalto),
    //    se ordena en una columna de registros con los avisos arriba y vuelve a ser letra.
    //    Canvas 2D, un lienzo del tamaño de la letra con margen. Si el canvas no dibuja la
    //    letra igual que la página, no se hace nada y queda la «a» normal.
    const viva = $("[data-viva]", portada);
    const letraViva = () => {
      const lienzo = document.createElement("canvas");
      const ctx = lienzo.getContext("2d");
      if (!ctx) return;
      lienzo.className = "lienzo-letra";
      lienzo.setAttribute("aria-hidden", "true");
      portada.append(lienzo);
      const TINTA = css("--tinta") || "#121735";
      const COBALTO = css("--cobalto") || "#2B3BF5";
      const ESTIRAR = { "62.5%": "extra-condensed", "75%": "condensed", "87.5%": "semi-condensed", "100%": "normal" };
      let G = null;

      const posicion = (el) => {
        let x = 0, y = 0, n = el;
        while (n && n !== portada) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
        return { x, y };
      };
      const azar = (semilla) => () => {
        semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
        let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      const medir = () => {
        const cs = getComputedStyle(viva);
        const fs = parseFloat(cs.fontSize);
        const estirar = ESTIRAR[cs.fontStretch] || "normal";
        const { x, y } = posicion(viva);
        const w = viva.offsetWidth, h = viva.offsetHeight;
        const pad = Math.round(fs * 0.7);
        const W = w + pad * 2, H = h + pad * 2;
        const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 900 ? 1.75 : 2);
        Object.assign(lienzo.style, { left: `${x - pad}px`, top: `${y - pad}px`, width: `${W}px`, height: `${H}px` });
        lienzo.width = Math.round(W * dpr);
        lienzo.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // La letra en un lienzo aparte, con la misma fuente y la misma línea base.
        const oc = document.createElement("canvas");
        oc.width = Math.ceil(W); oc.height = Math.ceil(H);
        const o = oc.getContext("2d", { willReadFrequently: true });
        o.font = `${estirar} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const conAncho = "fontStretch" in o;
        if (conAncho) o.fontStretch = estirar;
        o.textBaseline = "alphabetic";
        const m = o.measureText("a");
        const ls = parseFloat(cs.letterSpacing) || 0;
        const avance = w - ls;
        if (!m.width) return false;
        // WebKit (Safari, iPhone): el canvas no tiene fontStretch y bota el ancho del shorthand,
        // así que dibuja la «a» ancha. Se angosta en X hasta el ancho que tiene en la página.
        let sx = 1;
        if (Math.abs(m.width - avance) > Math.max(2, w * 0.04)) {
          if (conAncho) return false;
          sx = avance / m.width;
          if (sx < 0.7 || sx > 1.02) return false;
        }
        const bx = pad, by = pad + m.fontBoundingBoxAscent;
        o.setTransform(sx, 0, 0, 1, bx * (1 - sx), 0);
        o.fillText("a", bx, by);
        o.setTransform(1, 0, 0, 1, 0, 0);
        const datos = o.getImageData(0, 0, oc.width, oc.height).data;
        const hay = (px, py) => {
          px = Math.round(px); py = Math.round(py);
          if (px < 0 || py < 0 || px >= oc.width || py >= oc.height) return false;
          return datos[(py * oc.width + px) * 4 + 3] > 110;
        };
        const izq = bx - m.actualBoundingBoxLeft * sx, der = bx + m.actualBoundingBoxRight * sx;
        const arr = by - m.actualBoundingBoxAscent, aba = by + m.actualBoundingBoxDescent;
        const cx = (izq + der) / 2, cy = (arr + aba) / 2;
        const paso = Math.max(3.6, fs / 28);
        const nx = Math.floor((der - izq) / paso), ny = Math.floor((aba - arr) / paso);
        const ox = cx - (nx * paso) / 2, oy = cy - (ny * paso) / 2;

        const r = azar(11);
        const pts = [];
        for (let j = 0; j <= ny; j++) {
          for (let i = 0; i <= nx; i++) {
            const lx = ox + i * paso, ly = oy + j * paso;
            if (hay(lx, ly)) pts.push({ lx, ly });
          }
        }
        const N = pts.length;
        if (N < 12) return false;
        // Uno de cada nueve puntos es un aviso (cobalto).
        pts.forEach((p) => { p.aviso = r() < 0.11; p.fase = r() * Math.PI * 2; p.dC = r(); });

        // Columna de registros: de la línea base a la altura de las mayúsculas. Se llena de
        // abajo hacia arriba: primero los registros comunes, al final los avisos.
        const altoMay = o.measureText("H").actualBoundingBoxAscent;
        const anchoU = (der - izq) - paso * 1.4, altoU = altoMay - paso * 0.6;
        const cols = Math.max(3, Math.round(Math.sqrt((N * anchoU) / altoU)));
        const filas = Math.ceil(N / cols);
        const pasoG = Math.min(anchoU / (cols - 1), altoU / Math.max(1, filas - 1));
        const gx0 = cx - ((cols - 1) * pasoG) / 2;
        const gyBase = by - paso * 0.3;
        [...pts].sort((a, b) => (a.aviso - b.aviso) || (b.ly - a.ly) || (a.lx - b.lx)).forEach((p, k) => {
          p.gx = gx0 + (k % cols) * pasoG;
          p.gy = gyBase - Math.floor(k / cols) * pasoG;
          p.dB = k / N;
        });
        G = { pts, paso, pasoG, cx, cy, W, H, k: (Math.PI * 2) / (Math.max(der - izq, aba - arr) * 0.95) };
        return true;
      };

      // Letra líquida: dos ondas lentas cruzan la letra; con amplitud a (0 a 1) ondula sin moverse de lugar.
      const liquido = (p, t, a, out) => {
        const u = p.lx - G.cx, v = p.ly - G.cy, k = G.k, A = G.paso * 2.4 * a;
        out.x = p.lx + A * (Math.sin(v * k + t * 1.1) * 0.65 + Math.sin((u + v) * k * 0.7 - t * 0.8 + p.fase * 0.12) * 0.35);
        out.y = p.ly + A * (Math.cos(u * k - t * 0.9) * 0.55 + Math.sin((u - v) * k * 0.8 + t * 1.3) * 0.45);
      };
      // Mezcla escalonada entre dos estados, con un leve arco en el camino.
      const tramo = (cic, ini, dur, d) => suave(recorte((cic - ini - d * dur * 0.4) / (dur * 0.6)));
      const mezclar = (ax, ay, bx, by, e, out) => {
        const dx = bx - ax, dy = by - ay, arco = Math.sin(Math.PI * e) * 0.18;
        out.x = ax + dx * e - dy * arco;
        out.y = ay + dy * e + dx * arco;
      };

      // Ciclo de 16 s: 0–0,8 la letra se hace puntos; 2–5 se pone líquida; 5–6,4 se ordena;
      // 6,4–7,8 columna; 7,8–9,4 vuelve; 10,4–11,2 vuelve a ser letra sólida; quieta hasta 16.
      const CICLO = 16, SOLIDA = 10.4;
      const tmp = { x: 0, y: 0 };
      let ultimo = "", enPuntos = false;
      const dibujar = (t) => {
        if (!G) return;
        const cic = t % CICLO;
        const puntos = cic < SOLIDA;
        if (puntos !== enPuntos) { enPuntos = puntos; viva.classList.toggle("es-puntos", puntos); }
        const quieto = (cic >= 0.95 && cic < 2) || (cic >= 9.4 && cic < SOLIDA) ? "letra"
          : cic >= 6.4 && cic < 7.8 ? "tabla" : cic >= SOLIDA + 0.9 ? "vacio" : "";
        if (quieto && quieto === ultimo) return;
        ultimo = quieto;
        ctx.clearRect(0, 0, G.W, G.H);
        if (quieto === "vacio") return;
        const rL = G.paso * 0.44, rT = G.paso * 0.38, rG = Math.min(G.paso * 0.4, G.pasoG * 0.31);
        const comunes = new Path2D();
        const tinte = [null, new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        for (const p of G.pts) {
          let x, y, r, c = 0;
          if (cic < 2) {
            x = p.lx; y = p.ly; r = rL * salida(recorte((cic - p.dC * 0.35) / 0.55));
          } else if (cic < 5) {
            const a = suave(recorte((cic - 2) / 1.4));
            liquido(p, t, a, tmp);
            x = tmp.x; y = tmp.y; r = rL + (rT - rL) * a; c = a;
          } else if (cic < 6.4) {
            liquido(p, t, 1, tmp);
            const e = tramo(cic, 5, 1.4, p.dB);
            mezclar(tmp.x, tmp.y, p.gx, p.gy, e, tmp);
            x = tmp.x; y = tmp.y; r = rT + (rG - rT) * e; c = 1;
          } else if (cic < 7.8) {
            x = p.gx; y = p.gy; r = rG; c = 1;
          } else if (cic < 9.4) {
            const e = tramo(cic, 7.8, 1.6, p.dC);
            mezclar(p.gx, p.gy, p.lx, p.ly, e, tmp);
            x = tmp.x; y = tmp.y; r = rG + (rL - rG) * e; c = 1 - e;
          } else {
            // la letra sólida vuelve debajo y los puntos se apagan
            x = p.lx; y = p.ly; r = rL * (1 - salida(recorte((cic - SOLIDA - 0.15) / 0.7)));
          }
          if (r <= 0.05) continue;
          comunes.moveTo(x + r, y);
          comunes.arc(x, y, r, 0, Math.PI * 2);
          const nivel = p.aviso ? Math.round(c * 4) : 0;
          if (nivel) { tinte[nivel].moveTo(x + r, y); tinte[nivel].arc(x, y, r, 0, Math.PI * 2); }
        }
        ctx.fillStyle = TINTA; ctx.fill(comunes);
        ctx.fillStyle = COBALTO;
        for (let k = 1; k <= 4; k++) { ctx.globalAlpha = k / 4; ctx.fill(tinte[k]); }
        ctx.globalAlpha = 1;
      };

      if (!medir()) { lienzo.remove(); return; }
      // En pausa la «a» vuelve a ser letra.
      oyentes.add((v) => {
        if (v || !detenido) return;
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);
        viva.classList.remove("es-puntos");
        enPuntos = false; ultimo = "";
      });
      const rehacer = () => {
        if (medir()) { ultimo = ""; return; }
        G = null;
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);
        viva.classList.remove("es-puntos");
        enPuntos = false;
      };
      let espera = 0;
      window.addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(rehacer, 150); });
      // Si la fuente llegó tarde, la «a» cambió de forma: se vuelve a medir.
      if (document.fonts) document.fonts.ready.then(rehacer);
      // La letra se vuelve puntos cuando el nombre terminó de enfocarse.
      setTimeout(() => bucle(dibujar), 1100);
    };
    if (viva && !reduced) fuentes.then(letraViva);

    // 4. Cinta: completa la pista para pantallas anchas, fija la velocidad (~60 px/s) y se
    //    detiene cuando no se ve. Con movimiento reducido queda quieta (CSS).
    if (cinta && !reduced) {
      const pista = $(".cinta-pista", cinta);
      const ajustar = () => {
        const trozos = [...pista.children];
        const mitad = trozos.length / 2;
        let ancho = 0;
        for (let i = 0; i < mitad; i++) ancho += trozos[i].offsetWidth;
        if (ancho && ancho < window.innerWidth + 200) {
          const extra = Math.ceil((window.innerWidth + 200) / (ancho / mitad)) - mitad;
          const nuevos = Array.from({ length: extra }, () => trozos[0].cloneNode(true));
          pista.prepend(...nuevos.map((n) => n.cloneNode(true)));
          pista.append(...nuevos);
          ancho += extra * trozos[0].offsetWidth;
        }
        if (ancho) pista.style.setProperty("--cinta-dur", `${Math.round(ancho / 60)}s`);
      };
      fuentes.then(ajustar);
      if (document.fonts) document.fonts.ready.then(ajustar);
      let enCinta = true;
      const pausa = () => { pista.style.animationPlayState = enCinta && !document.hidden && !detenido ? "" : "paused"; };
      new IntersectionObserver(([e]) => { enCinta = e.isIntersecting; pausa(); }).observe(cinta);
      document.addEventListener("visibilitychange", pausa);
      pausa();
      const boton = $("[data-pausa]", cinta);
      if (boton) {
        boton.hidden = false;
        boton.setAttribute("aria-pressed", String(detenido));
        boton.addEventListener("click", () => {
          detenido = !detenido;
          boton.setAttribute("aria-pressed", String(detenido));
          try { localStorage.setItem("bl.quieto", detenido ? "1" : "0"); } catch { /* sin almacenamiento */ }
          pausa();
          avisar();
        });
      }
    }
  }

  /* ================================================================== */
  /* Puntos: relato "de la pregunta a la decisión"                       */
  /* ================================================================== */
  const stage = $("[data-story]");
  if (stage) {
    const canvas = $("canvas", stage);
    const ctx = canvas.getContext("2d");
    const label = $("[data-story-label]", stage);
    const steps = $$("[data-step]");
    const N = 720, HIGHLIGHT = 24;
    const light = css("--cobalto-claro") || "#93A0FF";
    const pale = "rgba(230,232,245,0.55)";
    let W = 0, H = 0, dpr = 1, current = -1, raf = null, visible = false;
    const rand = mulberry(7);
    const dots = Array.from({ length: N }, (_, i) => ({
      x: 0, y: 0, r: 2.4, a: 0.8, tx: 0, ty: 0, tr: 2.4, ta: 0.8, col: pale, tcol: pale,
      seed: rand(), group: rand() < 0.5 ? 0 : 1, value: gauss(rand), hit: i < HIGHLIGHT,
    }));

    function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    const layouts = [
      // 0 · la pregunta: una nube desordenada
      () => dots.forEach((d, i) => {
        const ang = d.seed * Math.PI * 2 * 7.3, rad = Math.sqrt(((i * 0.618) % 1)) * Math.min(W, H) * 0.42;
        Object.assign(d, { tx: W / 2 + Math.cos(ang) * rad * 1.15, ty: H / 2 + Math.sin(ang) * rad * 0.85, tr: 1.6 + d.seed * 2.6, ta: 0.35 + d.seed * 0.6, tcol: d.seed > 0.93 ? light : pale });
      }),
      // 1 · los datos: una grilla ordenada, como un censo
      () => {
        const cols = Math.round(Math.sqrt(N * (W / H)));
        const rows = Math.ceil(N / cols);
        const gap = Math.min((W * 0.84) / cols, (H * 0.78) / rows);
        const ox = (W - gap * (cols - 1)) / 2, oy = (H - gap * (rows - 1)) / 2 - 10;
        dots.forEach((d, i) => Object.assign(d, { tx: ox + (i % cols) * gap, ty: oy + Math.floor(i / cols) * gap, tr: gap * 0.3, ta: 0.9, tcol: pale }));
      },
      // 2 · el análisis: dos distribuciones que se comparan
      () => {
        const bins = 34, counts = [new Array(bins).fill(0), new Array(bins).fill(0)];
        const bw = (W * 0.84) / bins, base = H * 0.8, ox = W * 0.08;
        const size = Math.max(3.2, Math.min(bw * 0.46, H / 90));
        dots.forEach((d) => {
          const v = d.value + (d.group ? 0.9 : -0.6);
          const b = Math.max(0, Math.min(bins - 1, Math.round((v + 3) / 6.5 * (bins - 1))));
          const k = counts[d.group][b]++;
          Object.assign(d, { tx: ox + b * bw + (d.group ? bw * 0.25 : -bw * 0.25) + bw / 2, ty: base - k * size * 1.9, tr: size * 0.8, ta: 0.95, tcol: d.group ? light : pale });
        });
      },
      // 3 · la decisión: pocos puntos importan
      () => {
        const cols = 8, gap = Math.min(W, H) / 11;
        const ox = W / 2 - (gap * (cols - 1)) / 2, oy = H / 2 - gap * 1.5;
        let k = 0;
        dots.forEach((d) => {
          if (d.hit) { Object.assign(d, { tx: ox + (k % cols) * gap, ty: oy + Math.floor(k / cols) * gap, tr: gap * 0.26, ta: 1, tcol: light }); k++; }
          else { const ang = d.seed * 50, rad = Math.min(W, H) * (0.45 + d.seed * 0.2); Object.assign(d, { tx: W / 2 + Math.cos(ang) * rad, ty: H / 2 + Math.sin(ang) * rad * 0.8, tr: 1.1, ta: 0.14, tcol: pale }); }
        });
      },
    ];

    const resize = () => {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layouts[Math.max(0, current)]();
      if (current < 0 || reduced) dots.forEach((d) => Object.assign(d, { x: d.tx, y: d.ty, r: d.tr, a: d.ta, col: d.tcol }));
      if (reduced) paint();
    };

    const paint = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        ctx.globalAlpha = d.a;
        ctx.fillStyle = d.col;
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.5, d.r), 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      let moving = false;
      const time = performance.now() / 1000;
      for (const d of dots) {
        const k = 0.075 + d.seed * 0.03;
        const wob = current === 0 ? Math.sin(time * 0.8 + d.seed * 40) * 3 : 0;
        const nx = d.x + (d.tx + wob - d.x) * k, ny = d.y + (d.ty + wob * 0.6 - d.y) * k;
        if (Math.abs(nx - d.x) + Math.abs(ny - d.y) > 0.05) moving = true;
        d.x = nx; d.y = ny; d.r += (d.tr - d.r) * 0.1; d.a += (d.ta - d.a) * 0.1; d.col = d.tcol;
      }
      paint();
      raf = visible && (moving || current === 0) ? requestAnimationFrame(tick) : null;
    };

    const go = (i) => {
      if (i === current) return;
      current = i;
      layouts[i]();
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      if (label) label.textContent = steps[i]?.dataset.label || "";
      if (reduced) { dots.forEach((d) => Object.assign(d, { x: d.tx, y: d.ty, r: d.tr, a: d.ta, col: d.tcol })); paint(); return; }
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(tick);
    }).observe(stage);

    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) go(steps.indexOf(entry.target)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => stepObserver.observe(s));

    resize();
    go(0);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  }

  /* ── Puntos tenues en el pie de contacto ──────────────────────────── */
  const footDots = $("[data-contact-dots]");
  if (footDots && !reduced) {
    const ctx = footDots.getContext("2d");
    let W, H, pts = [], raf = null, mouse = { x: -999, y: -999 };
    const setup = () => {
      const r = footDots.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      footDots.width = W * dpr; footDots.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      const gap = 28;
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) pts.push({ x, y });
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const k = Math.max(0, 1 - d / 220);
        ctx.fillStyle = k > 0 ? `rgba(147,160,255,${0.25 + k * 0.75})` : "rgba(230,232,245,0.12)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2 + k * 2.6, 0, 6.283);
        ctx.fill();
      }
      raf = null;
    };
    setup(); draw();
    footDots.parentElement.addEventListener("pointermove", (e) => {
      const r = footDots.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) raf = requestAnimationFrame(draw);
    });
    footDots.parentElement.addEventListener("pointerleave", () => { mouse = { x: -999, y: -999 }; if (!raf) raf = requestAnimationFrame(draw); });
    window.addEventListener("resize", () => { setup(); draw(); });
  }
  /* ── Contador anónimo (/api/uso) ─────────────────────────────────────
     Suma 1 a la página del día y, una vez por sesión, desde dónde llegó y con qué equipo.
     Sin cookies ni identificadores. No cuenta el navegador
     de Benjamín (abrir /metricas/ lo marca). Si falla, no pasa nada. */
  const vista = doc.dataset.vista;
  let yo = false;
  try { yo = localStorage.getItem("bl.yo") === "1"; } catch { /* almacenamiento bloqueado */ }
  // El servidor decide qué nombres cuentan (HOSTS en wrangler.toml); acá solo se evita lo local y las previsualizaciones.
  if (vista && !yo && location.protocol === "https:" && !/^[0-9a-f]{8}\./.test(location.hostname)) {
    const enviar = (cuerpo) => {
      try {
        fetch("/api/uso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
      } catch { /* sin red */ }
    };
    let nueva = false;
    try { nueva = !sessionStorage.getItem("bl.s"); sessionStorage.setItem("bl.s", "1"); } catch { nueva = true; }
    const cuerpo = { v: vista };
    if (nueva) {
      const tactil = matchMedia("(pointer: coarse)").matches, ancho = Math.min(screen.width, screen.height);
      cuerpo.s = 1;
      cuerpo.d = !tactil ? "computador" : ancho >= 600 ? "tablet" : "celular";
      try { const r = document.referrer && new URL(document.referrer); cuerpo.ref = r && r.hostname !== location.hostname ? r.hostname : ""; } catch { cuerpo.ref = ""; }
    }
    enviar(cuerpo);

    // Qué se toca: descargar el CV, escribir, abrir LinkedIn o GitHub, ver un proyecto o una publicación.
    const tipoDe = (a) => {
      const h = a.getAttribute("href") || "";
      if (/CV_[^/]*_ES\.pdf$/i.test(h)) return "cv-es";
      if (/CV_[^/]*_EN\.pdf$/i.test(h)) return "cv-en";
      if (h.startsWith("mailto:")) return "correo";
      if (h.startsWith("tel:")) return "telefono";
      let u; try { u = new URL(h, location.href); } catch { return null; }
      if (u.hostname === location.hostname) return null;
      if (/linkedin\.com$/.test(u.hostname)) return "linkedin";
      if (/(^|\.)github\.com$/.test(u.hostname)) return "github";
      if (/\.pages\.dev$|\.github\.io$/.test(u.hostname)) return "proyecto";
      if (/cepchile\.cl|doi\.org|scielo|revistas?\.|journals?\.|\.edu$|udp\.cl/.test(u.hostname)) return "publicacion";
      return "otro";
    };
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      const tipo = a && tipoDe(a);
      if (tipo) enviar({ c: tipo });
    }, { capture: true });
  }
})();
