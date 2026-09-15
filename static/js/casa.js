/* Simulador «La casa siempre gana»: 600 apostadores sin ventaja ni desventaja. */
(() => {
  const box = document.querySelector("[data-sim]");
  if (!box) return;
  const lang = box.dataset.lang;
  const canvas = box.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const inputs = Object.fromEntries([...box.querySelectorAll("[data-in]")].map((el) => [el.dataset.in, el]));
  const outputs = Object.fromEntries([...box.querySelectorAll("[data-out]")].map((el) => [el.dataset.out, el]));
  const results = Object.fromEntries([...box.querySelectorAll("[data-res]")].map((el) => [el.dataset.res, el]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PEOPLE = 600, STAKE = 10000;
  const money = new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US", { maximumFractionDigits: 0 });
  let paths = null, W = 0, H = 0, raf = null;

  // Generador reproducible: mismos controles, mismo resultado
  function rng(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function simulate() {
    const bets = +inputs.bets.value, legs = +inputs.legs.value, margin = +inputs.margin.value / 100;
    const rand = rng(42);
    const keep = (1 - margin) ** legs; // parte de la cuota justa que paga la casa
    const finals = new Float64Array(PEOPLE);
    const sample = []; // guardar trayectorias para percentiles
    const steps = Math.min(bets, 120);
    const every = bets / steps;
    const grid = Array.from({ length: steps + 1 }, () => new Float64Array(PEOPLE));
    for (let p = 0; p < PEOPLE; p++) {
      let bank = 0, k = 1;
      for (let b = 1; b <= bets; b++) {
        let prob = 1, fair = 1;
        for (let l = 0; l < legs; l++) {
          const q = 0.35 + rand() * 0.3; // probabilidad real de cada selección
          prob *= q; fair *= 1 / q;
        }
        bank += rand() < prob ? STAKE * (fair * keep - 1) : -STAKE;
        while (k <= steps && b >= k * every - 1e-9) { grid[k][p] = bank; k++; }
      }
      finals[p] = bank;
      if (p < 5) sample.push(p);
    }
    const pct = (arr, q) => { const s = Float64Array.from(arr).sort(); return s[Math.floor(q * (s.length - 1))]; };
    const band = grid.map((col) => [pct(col, 0.05), pct(col, 0.5), pct(col, 0.95)]);
    const expected = grid.map((_, i) => i * every * STAKE * (keep - 1));
    const singles = sample.map((p) => grid.map((col) => col[p]));
    const median = pct(finals, 0.5);
    const winners = finals.filter((v) => v > 0).length / PEOPLE;
    const house = -finals.reduce((a, b) => a + b, 0);
    return { band, expected, singles, median, winners, house, steps, bets };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(data, progress = 1) {
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 64, r: 16, t: 16, b: 28 };
    const all = data.band.flat().concat(data.expected);
    let lo = Math.min(...all), hi = Math.max(...all);
    const span = Math.max(hi - lo, STAKE * 10);
    lo -= span * 0.05; hi += span * 0.05;
    const x = (i) => pad.l + (i / data.steps) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    const upto = Math.max(1, Math.round(data.steps * progress));

    // ejes y cero
    ctx.font = "12px Geist, system-ui, sans-serif";
    ctx.fillStyle = "rgba(230,232,245,.55)";
    ctx.strokeStyle = "rgba(230,232,245,.12)";
    ctx.lineWidth = 1;
    for (let t = 0; t <= 4; t++) {
      const v = lo + ((hi - lo) * t) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y(v)); ctx.lineTo(W - pad.r, y(v)); ctx.stroke();
      ctx.fillText(`${v < 0 ? "−" : ""}$${money.format(Math.abs(v) / 1000)}k`, 6, y(v) + 4);
    }
    ctx.strokeStyle = "rgba(230,232,245,.5)";
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, y(0)); ctx.lineTo(W - pad.r, y(0)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(lang === "es" ? `${data.bets} apuestas →` : `${data.bets} bets →`, W - pad.r - 110, H - 8);

    // banda 5–95
    ctx.fillStyle = "rgba(147,160,255,.28)";
    ctx.beginPath();
    for (let i = 0; i <= upto; i++) ctx.lineTo(x(i), y(data.band[i][2]));
    for (let i = upto; i >= 0; i--) ctx.lineTo(x(i), y(data.band[i][0]));
    ctx.fill();

    // algunos apostadores
    ctx.lineWidth = 1;
    data.singles.forEach((s) => {
      ctx.strokeStyle = "rgba(147,160,255,.55)";
      ctx.beginPath();
      for (let i = 0; i <= upto; i++) ctx.lineTo(x(i), y(s[i]));
      ctx.stroke();
    });

    // mediana
    ctx.strokeStyle = "#E6E8F5"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= upto; i++) ctx.lineTo(x(i), y(data.band[i][1]));
    ctx.stroke();

    // valor esperado
    ctx.strokeStyle = "#FF8A8E"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath();
    for (let i = 0; i <= upto; i++) ctx.lineTo(x(i), y(data.expected[i]));
    ctx.stroke(); ctx.setLineDash([]);
  }

  function update() {
    outputs.bets.textContent = inputs.bets.value;
    outputs.legs.textContent = inputs.legs.value;
    outputs.margin.textContent = `${String(inputs.margin.value).replace(".", lang === "es" ? "," : ".")}%`;
    paths = simulate();
    const sign = (v) => (v < 0 ? "−" : "+") + "$" + money.format(Math.abs(v));
    results.median.textContent = sign(paths.median);
    results.median.classList.toggle("neg", paths.median < 0);
    results.winners.textContent = `${Math.round(paths.winners * 100)}%`;
    const share = paths.house / (PEOPLE * paths.bets * STAKE) * 100;
    results.house.textContent = `${share.toFixed(1).replace(".", lang === "es" ? "," : ".")}%`;
    cancelAnimationFrame(raf);
    if (reduced) return draw(paths);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      draw(paths, 1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  let timer;
  Object.values(inputs).forEach((el) => el.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 60); }));
  window.addEventListener("resize", () => { resize(); if (paths) draw(paths); });
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { resize(); update(); io.disconnect(); }
  }, { rootMargin: "0px 0px -10% 0px" });
  io.observe(canvas);
})();
