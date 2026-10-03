// POST /api/uso {v?, c?, s?, d?, ref?} → 204
// Contadores anónimos del día: qué página se abre (v), qué se toca (c: descargar el CV, escribir,
// abrir LinkedIn…), y una vez por sesión (s: 1) desde dónde llegó y con qué equipo.
// No guarda quién: solo suma 1 a una clave del día (tabla uso_diario). Esto ve lo que Cloudflare
// Web Analytics no: los bloqueadores no lo frenan y los clics en el PDF del CV sí se cuentan.
import { RUTAS } from "../../lib/rutas.js";
import { error, huella, mismoOrigen, hostPropio, leerJSON, limitar, hoy, ipDe, sumar, frenoLocal } from "../../lib/comun.js";

const CLICS = new Set(["cv-es", "cv-en", "correo", "telefono", "linkedin", "github", "proyecto", "publicacion", "otro"]);
const TIPOS = new Set(["celular", "tablet", "computador"]);
const nada = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

// Sitios de llegada que se cuentan con su nombre; cualquier otro queda como «otro», para que un
// script no llene la tabla con dominios inventados. Van los buscadores, las redes y los portales
// de empleo y sistemas de selección por los que suele llegar alguien que revisa una postulación.
const REFS = new Set([
  "google.com", "google.cl", "bing.com", "duckduckgo.com", "yahoo.com", "ecosia.org", "search.brave.com",
  "linkedin.com", "lnkd.in", "github.com", "instagram.com", "facebook.com", "whatsapp.com", "t.co", "x.com",
  "twitter.com", "t.me", "telegram.org", "reddit.com", "youtube.com", "threads.net", "bsky.app",
  "chatgpt.com", "perplexity.ai", "claude.ai", "gemini.google.com",
  "mail.google.com", "outlook.live.com", "outlook.office.com", "live.com", "office.com",
  "laborum.cl", "computrabajo.com", "cl.computrabajo.com", "getonbrd.com", "trabajando.cl", "trabajando.com",
  "bne.cl", "empleospublicos.cl", "indeed.com", "cl.indeed.com", "buk.cl", "hiringroom.com",
  "teamtailor.com", "greenhouse.io", "lever.co", "myworkdayjobs.com", "workday.com", "chileatiende.gob.cl",
  "guareneitor.pages.dev", "langab.github.io",
]);
const ALIAS = { "lnkd.in": "linkedin.com", "cl.computrabajo.com": "computrabajo.com", "cl.indeed.com": "indeed.com",
  "trabajando.com": "trabajando.cl", "outlook.office.com": "outlook.live.com", "office.com": "outlook.live.com", "live.com": "outlook.live.com" };
function familiaRef(host) {
  const h = typeof host === "string" ? host.toLowerCase().replace(/^www\./, "").slice(0, 60) : "";
  if (!h) return "directo";
  const p = h.split(".");
  for (const n of [3, 2]) {
    const d = p.slice(-n).join(".");
    if (p.length >= n && REFS.has(d)) return ALIAS[d] || d;
  }
  return "otro";
}

export async function onRequestPost({ request, env }) {
  if (!env.FIRMA || !env.DB) return error("Servicio no configurado", 503);
  // Las previsualizaciones no cuentan: se contestan igual para que la página no reclame.
  if (!hostPropio(request, env) || !mismoOrigen(request)) return nada();
  // Primer freno en memoria: una persona no abre 60 páginas por minuto. No toca D1.
  if (!frenoLocal(request, "uso", 60)) return nada();
  const c = await leerJSON(request, 400);
  if (!c) return error("Pedido inválido", 400);

  const claves = [];
  if (typeof c.v === "string" && RUTAS.has(c.v)) claves.push(`vista:${c.v}`);
  else if (typeof c.c === "string" && CLICS.has(c.c)) claves.push(`clic:${c.c}`);
  else return error("Pedido inválido", 400);

  // Un tope por conexión y día: alguien con un script no infla los números de una tarde.
  if (!(await limitar(env.DB, await huella(env.FIRMA, "uso", ipDe(request), hoy()), 300, 86400))) return nada();

  // Lo de la llegada se cuenta una vez por sesión: con la primera página que se abre.
  if (c.s === 1 && claves[0].startsWith("vista:")) {
    claves.push("sesion");
    if (TIPOS.has(c.d)) claves.push(`disp:${c.d}`);
    claves.push("ref:" + familiaRef(c.ref));
  }
  // Un contador que falla no es asunto de quien navega: se contesta igual, sin error en su consola.
  try { await sumar(env.DB, claves); } catch { /* p. ej. la tabla todavía no existe en esa base */ }
  return nada();
}
