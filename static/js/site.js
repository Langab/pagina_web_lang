/* Benjamín Lang — interacciones del sitio. Sin dependencias. */
(() => {
  const doc = document.documentElement;
  const lang = doc.lang || "es";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const css = (name) => getComputedStyle(doc).getPropertyValue(name).trim();
  const fmt = new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US");

  /* ── Encabezado: estado al hacer scroll y barra de progreso ───────── */
  const header = $("[data-header]");
  const progress = $("[data-progress]");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header?.classList.toggle("is-scrolled", y > 8);
      if (progress) {
        const max = doc.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── Menú móvil a pantalla completa ───────────────────────────────── */
  const toggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    doc.classList.toggle("modal-open", open);
  };
  toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) setMenu(false); });

  /* ── Entrada del hero ─────────────────────────────────────────────── */
  const ready = () => requestAnimationFrame(() => doc.classList.add("is-ready"));
  if (document.fonts && !reduced) document.fonts.ready.then(ready); else ready();
  setTimeout(ready, 1200);

  /* ── Aparición al entrar en pantalla ──────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      entry.target.dispatchEvent(new CustomEvent("in"));
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
  $$("[data-reveal], .funnel, .reveal-bars, [data-count], [data-type], .pipeline").forEach((el) => io.observe(el));

  /* ── Contadores ───────────────────────────────────────────────────── */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const show = (v) => { el.textContent = prefix + (decimals ? v.toFixed(decimals).replace(".", lang === "es" ? "," : ".") : fmt.format(Math.round(v))) + suffix; };
    if (reduced || isNaN(target)) return show(target || 0);
    const t0 = performance.now();
    const dur = Math.min(2200, 900 + Math.log10(Math.abs(target) + 1) * 350);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      show(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $$("[data-count]").forEach((el) => el.addEventListener("in", () => countUp(el), { once: true }));

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
    $$("[data-count]", dialog).forEach((el) => countUp(el));
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
    const img = $("img", preview);
    let x = 0, y = 0, px = 0, py = 0, raf = null;
    const loop = () => {
      px += (x - px) * 0.18; py += (y - py) * 0.18;
      preview.style.left = `${px + 170}px`; preview.style.top = `${py}px`;
      raf = preview.classList.contains("is-on") || Math.abs(x - px) > 0.5 ? requestAnimationFrame(loop) : null;
    };
    $$("[data-preview]").forEach((row) => {
      row.addEventListener("pointerenter", (e) => {
        img.src = row.dataset.preview; img.alt = "";
        x = px = e.clientX; y = py = e.clientY;
        preview.classList.add("is-on");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      row.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
      row.addEventListener("pointerleave", () => preview.classList.remove("is-on"));
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
  /* Puntos: la foto del hero se arma con puntos                         */
  /* ================================================================== */
  const heroPhoto = $("[data-dots-photo]");
  if (heroPhoto) {
    const img = $("img", heroPhoto);
    const canvas = $("canvas", heroPhoto);
    const ctx = canvas.getContext("2d");
    const cobalt = css("--cobalto-claro") || "#93A0FF";
    let dots = [], W = 0, H = 0, dpr = 1, step = 11, phase = "idle", t0 = 0, pointer = null, raf = null;

    const sample = () => {
      const r = heroPhoto.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      step = W < 420 ? 9 : 11;
      const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      const off = document.createElement("canvas");
      off.width = cols; off.height = rows;
      const o = off.getContext("2d");
      // replicar object-fit: cover
      const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      o.drawImage(img, (cols - dw) * (pos[0] || 0.5), (rows - dh) * (pos[1] || 0.5), dw, dh);
      let pixels;
      try { pixels = o.getImageData(0, 0, cols, rows).data; } catch { return false; }
      dots = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const lum = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
          const tx = x * step + step / 2, ty = y * step + step / 2;
          const angle = Math.random() * Math.PI * 2, dist = Math.max(W, H) * (0.4 + Math.random() * 0.6);
          dots.push({ tx, ty, sx: W / 2 + Math.cos(angle) * dist, sy: H / 2 + Math.sin(angle) * dist, r: Math.max(0.6, (1 - lum) * step * 0.52), delay: Math.random() * 0.35 + (ty / H) * 0.25 });
        }
      }
      return true;
    };

    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const draw = (now) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = cobalt;
      if (phase === "intro") {
        const elapsed = (now - t0) / 1000;
        const fade = Math.max(0, Math.min(1, (elapsed - 1.25) / 0.7));
        ctx.globalAlpha = 1 - fade;
        for (const d of dots) {
          const p = ease(Math.max(0, Math.min(1, (elapsed - d.delay) / 1.0)));
          ctx.beginPath();
          ctx.arc(d.sx + (d.tx - d.sx) * p, d.sy + (d.ty - d.sy) * p, d.r, 0, 6.283);
          ctx.fill();
        }
        if (elapsed > 0.95) heroPhoto.classList.add("is-photo");
        if (fade >= 1) { phase = "idle"; ctx.clearRect(0, 0, W, H); }
      }
      if (phase === "idle" && pointer) {
        const R = Math.min(120, W * 0.28);
        for (const d of dots) {
          const dx = d.tx - pointer.x, dy = d.ty - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist > R) continue;
          ctx.globalAlpha = Math.pow(1 - dist / R, 0.8) * 0.95;
          ctx.beginPath();
          ctx.arc(d.tx, d.ty, Math.max(0.8, d.r * 0.9), 0, 6.283);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = phase === "intro" || pointer ? requestAnimationFrame(draw) : null;
    };

    const start = () => {
      if (!sample()) { heroPhoto.classList.add("is-photo"); return; }
      if (reduced) { heroPhoto.classList.add("is-photo"); return; }
      phase = "intro"; t0 = performance.now();
      raf = requestAnimationFrame(draw);
    };
    if (img.complete && img.naturalWidth) start(); else img.addEventListener("load", start, { once: true });

    if (fineHover && !reduced) {
      heroPhoto.addEventListener("pointermove", (e) => {
        const r = heroPhoto.getBoundingClientRect();
        pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (!raf) raf = requestAnimationFrame(draw);
      });
      heroPhoto.addEventListener("pointerleave", () => { pointer = null; });
    }
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(sample, 200); });
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
})();
