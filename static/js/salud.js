/* Visor de Apple Health en el navegador. El archivo se procesa en un Web Worker
   dentro de tu computador: nada se sube a ningún servidor. */
(() => {
  const root = document.querySelector("[data-health]");
  if (!root) return;
  const lang = root.dataset.lang;
  const es = lang === "es";
  const $ = (s) => root.querySelector(s);
  const input = $("input[type=file]");
  const drop = $("[data-drop]");
  const status = $("[data-status]");
  const bar = $("[data-bar]");
  const out = $("[data-out]");
  const nf = new Intl.NumberFormat(es ? "es-CL" : "en-US");
  const T = es
    ? { reading: "Leyendo", unzip: "Descomprimiendo y leyendo", done: "Listo", records: "registros", types: "tipos de datos", devices: "fuentes", years: "años con datos", steps: "pasos en total", km: "km caminados o corridos", workouts: "entrenamientos", stepsTitle: "Mediana de pasos diarios por año", wkTitle: "Entrenamientos por año", none: "No encontré export.xml en ese archivo. Sube el .zip que exporta la app Salud o el export.xml de adentro.", err: "No pude leer el archivo", Walking: "Caminata", Cycling: "Bicicleta", Running: "Carrera", Other: "Otros" }
    : { reading: "Reading", unzip: "Unzipping and reading", done: "Done", records: "records", types: "data types", devices: "sources", years: "years of data", steps: "total steps", km: "km walked or run", workouts: "workouts", stepsTitle: "Median daily steps per year", wkTitle: "Workouts per year", none: "I couldn't find export.xml in that file. Upload the .zip exported by the Health app or the export.xml inside it.", err: "Couldn't read the file", Walking: "Walking", Cycling: "Cycling", Running: "Running", Other: "Other" };

  // ── Código del worker (se ejecuta en otro hilo) ────────────────────────
  const workerCode = () => {
    const attr = (line, name) => {
      const i = line.indexOf(` ${name}="`);
      if (i < 0) return "";
      const start = i + name.length + 3;
      return line.slice(start, line.indexOf('"', start));
    };
    const state = { records: 0, types: new Set(), sources: new Set(), first: "9999", last: "0000", steps: new Map(), dist: new Map(), workouts: {} };
    const addHourly = (map, line, factor = 1) => {
      const src = attr(line, "sourceName");
      const hour = attr(line, "startDate").slice(0, 13);
      const key = hour + "|" + src;
      map.set(key, (map.get(key) || 0) + parseFloat(attr(line, "value") || "0") * factor);
    };
    const onLine = (raw) => {
      const line = raw.trimStart();
      if (line.startsWith("<Record ")) {
        state.records++;
        const type = attr(line, "type");
        state.types.add(type);
        state.sources.add(attr(line, "sourceName"));
        const d = attr(line, "startDate");
        if (d && d < state.first) state.first = d;
        if (d > state.last) state.last = d;
        if (type === "HKQuantityTypeIdentifierStepCount") addHourly(state.steps, line);
        else if (type === "HKQuantityTypeIdentifierDistanceWalkingRunning") addHourly(state.dist, line, attr(line, "unit") === "mi" ? 1.60934 : 1);
      } else if (line.startsWith("<Workout ")) {
        const t = attr(line, "workoutActivityType").replace("HKWorkoutActivityType", "");
        const kind = ["Walking", "Cycling", "Running"].includes(t) ? t : "Other";
        const year = attr(line, "startDate").slice(0, 4);
        (state.workouts[year] ||= { Walking: 0, Cycling: 0, Running: 0, Other: 0 })[kind]++;
      }
    };
    let rest = "";
    const decoder = new TextDecoder();
    const feed = (chunk, final) => {
      const text = rest + decoder.decode(chunk, { stream: !final });
      const lines = text.split("\n");
      rest = final ? "" : lines.pop();
      for (const l of lines) onLine(l);
      if (final && rest) onLine(rest);
    };
    const finish = () => {
      // Pasos: por hora se toma la fuente que más contó (evita sumar iPhone + reloj)
      const perHour = (map) => {
        const best = new Map();
        for (const [key, v] of map) { const h = key.slice(0, 13); if (v > (best.get(h) || 0)) best.set(h, v); }
        return best;
      };
      const stepsHour = perHour(state.steps);
      const days = new Map();
      let totalSteps = 0;
      for (const [h, v] of stepsHour) { const d = h.slice(0, 10); days.set(d, (days.get(d) || 0) + v); totalSteps += v; }
      const byYear = {};
      for (const [d, v] of days) (byYear[d.slice(0, 4)] ||= []).push(v);
      const median = (a) => { a.sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
      const stepsYear = Object.fromEntries(Object.entries(byYear).filter(([, a]) => a.length >= 20).map(([y, a]) => [y, Math.round(median(a))]));
      let km = 0;
      for (const v of perHour(state.dist).values()) km += v;
      postMessage({ type: "done", result: { records: state.records, types: state.types.size, sources: state.sources.size, first: state.first.slice(0, 10), last: state.last.slice(0, 10), totalSteps: Math.round(totalSteps), km: Math.round(km), stepsYear, workouts: state.workouts } });
    };

    onmessage = async (e) => {
      const file = e.data;
      const size = file.size;
      let read = 0, lastReport = 0;
      const report = () => { if (read - lastReport > size / 200) { lastReport = read; postMessage({ type: "progress", value: read / size }); } };
      const reader = file.stream().getReader();
      try {
        if (/\.zip$/i.test(file.name)) {
          importScripts("https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js");
          let found = false;
          const unzip = new fflate.Unzip();
          unzip.register(fflate.UnzipInflate);
          unzip.onfile = (f) => {
            if (!/(^|\/)export\.xml$/.test(f.name)) return;
            found = true;
            f.ondata = (err, chunk, final) => { if (err) throw err; feed(chunk, final); if (final) finish(); };
            f.start();
          };
          for (;;) {
            const { done, value } = await reader.read();
            if (done) { unzip.push(new Uint8Array(0), true); break; }
            read += value.length; report();
            unzip.push(value);
          }
          if (!found) postMessage({ type: "none" });
        } else {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) { feed(new Uint8Array(0), true); break; }
            read += value.length; report();
            feed(value, false);
          }
          finish();
        }
      } catch (err) {
        postMessage({ type: "error", message: String(err && err.message || err) });
      }
    };
  };

  const worker = new Worker(URL.createObjectURL(new Blob([`(${workerCode.toString()})()`], { type: "text/javascript" })));

  const svgBars = (entries, fmt) => {
    const max = Math.max(...entries.map(([, v]) => v), 1);
    const w = 100 / entries.length;
    return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" class="hbars-svg" role="img">${entries.map(([k, v], i) => {
      const h = (v / max) * 46;
      return `<rect x="${i * w + w * 0.18}" y="${52 - h}" width="${w * 0.64}" height="${h}" rx="0.8" fill="currentColor"/>`;
    }).join("")}</svg><div class="hbars-labels">${entries.map(([k, v]) => `<span><b>${fmt(v)}</b>${k}</span>`).join("")}</div>`;
  };

  const render = (r) => {
    const years = Object.keys(r.stepsYear).sort();
    const wkYears = Object.keys(r.workouts).sort();
    const totalWorkouts = wkYears.reduce((a, y) => a + Object.values(r.workouts[y]).reduce((x, z) => x + z, 0), 0);
    out.innerHTML = `
      <div class="live">
        <div><b>${nf.format(r.records)}</b><span>${T.records}</span></div>
        <div><b>${r.types}</b><span>${T.types}</span></div>
        <div><b>${nf.format(r.totalSteps)}</b><span>${T.steps}</span></div>
        <div><b>${nf.format(r.km)}</b><span>${T.km}</span></div>
        <div><b>${nf.format(totalWorkouts)}</b><span>${T.workouts}</span></div>
      </div>
      <p class="live-note">${r.first} → ${r.last}</p>
      ${years.length ? `<h3>${T.stepsTitle}</h3><div class="hbars">${svgBars(years.map((y) => [y, r.stepsYear[y]]), (v) => nf.format(v))}</div>` : ""}
      ${wkYears.length ? `<h3>${T.wkTitle}</h3><div class="bars">${wkYears.map((y) => {
        const c = r.workouts[y]; const sum = Object.values(c).reduce((a, b) => a + b, 0);
        return `<div class="bar"><span>${y}</span><span class="bar-track stack">${["Walking", "Cycling", "Running", "Other"].map((k) => c[k] ? `<span class="seg seg-${k}" style="width:${(c[k] / Math.max(...wkYears.map((yy) => Object.values(r.workouts[yy]).reduce((a, b) => a + b, 0)))) * 100}%" title="${T[k]}: ${c[k]}"></span>` : "").join("")}</span><b>${sum}</b></div>`;
      }).join("")}</div><p class="sim-legend" style="color:var(--grafito)">${["Walking", "Cycling", "Running", "Other"].map((k) => `<span><i class="seg-${k}"></i>${T[k]}</span>`).join("")}</p>` : ""}
    `;
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "progress") { bar.style.transform = `scaleX(${m.value})`; status.textContent = `${status.dataset.mode} ${Math.round(m.value * 100)}%`; }
    if (m.type === "done") { bar.style.transform = "scaleX(1)"; status.textContent = T.done; drop.classList.remove("is-busy"); render(m.result); }
    if (m.type === "none") { status.textContent = T.none; drop.classList.remove("is-busy"); }
    if (m.type === "error") { status.textContent = `${T.err}: ${m.message}`; drop.classList.remove("is-busy"); }
  };

  const start = (file) => {
    if (!file) return;
    out.hidden = true;
    drop.classList.add("is-busy");
    status.dataset.mode = /\.zip$/i.test(file.name) ? T.unzip : T.reading;
    status.textContent = `${status.dataset.mode}…`;
    bar.style.transform = "scaleX(0)";
    worker.postMessage(file);
  };

  input.addEventListener("change", () => start(input.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => start(e.dataTransfer.files[0]));
})();
