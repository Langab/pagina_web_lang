// GET /api/metricas  (cabecera Authorization: Bearer <METRICAS_CLAVE>) → todo lo que pinta /metricas/
// Privado: sin la clave no entrega nada, y diez intentos fallidos al día bloquean esa conexión.
// Junta dos fuentes (el mismo esquema que guareneitor):
//   · Cloudflare Web Analytics (visitas y páginas vistas, país, equipo, navegador, de dónde llegan),
//     si están CF_API_TOKEN (secreto, permiso «Account Analytics: Read»), CF_ACCOUNT_ID y CF_SITE_TAG.
//   · uso_diario: páginas, sesiones, llegadas y clics contados por la propia página.
import { json, error, huella, hoy, ipDe, diaChile, limitar, frenoLocal, demasiado } from "../../lib/comun.js";

const enc = new TextEncoder();
const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const DIAS_CF = 90;  // Cloudflare deja pedir hasta 93 días por consulta y guarda seis meses

async function claveOk(request, env) {
  const dada = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.METRICAS_CLAVE || !dada || dada.length > 200) return false;
  const [a, b] = await Promise.all([dada, env.METRICAS_CLAVE].map(s => crypto.subtle.digest("SHA-256", enc.encode(s))));
  return crypto.subtle.timingSafeEqual(a, b);
}

const fecha = d => d.toISOString().slice(0, 10);
const grupo = (dim, orden, n) => `${dim}: rumPageloadEventsAdaptiveGroups(limit: ${n}, filter: $f, orderBy: [${orden}]) { count sum { visits } dimensions { ${dim === "dias" ? "date" : dim} } }`;

async function cloudflare(env, db) {
  const falta = ["CF_API_TOKEN", "CF_ACCOUNT_ID", "CF_SITE_TAG"].filter(k => !env[k]);
  if (falta.length) return { conectado: false, motivo: "falta: " + falta.join(", ") };
  const hasta = new Date(), desde = new Date(Date.now() - (DIAS_CF - 1) * 86400000);
  const q = `query($a: string!, $f: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) { viewer { accounts(filter: {accountTag: $a}) {
    ${grupo("dias", "date_ASC", 100)}
    ${["deviceType", "userAgentBrowser", "userAgentOS", "countryName", "refererHost", "requestPath"].map(d => grupo(d, "count_DESC", 12)).join("\n    ")}
  } } }`;
  // Sin robots ni lo que se mira en el computador de desarrollo.
  const f = { siteTag: env.CF_SITE_TAG, date_geq: fecha(desde), date_leq: fecha(hasta), bot: 0, requestHost_notin: ["localhost", "127.0.0.1"] };
  let r;
  try {
    r = await fetch(GRAPHQL, {
      method: "POST", headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, variables: { a: env.CF_ACCOUNT_ID, f } }),
    }).then(x => x.json());
  } catch { return { conectado: false, motivo: "Cloudflare no respondió" }; }
  const cuenta = r && r.data && r.data.viewer && r.data.viewer.accounts && r.data.viewer.accounts[0];
  if (!cuenta) return { conectado: false, motivo: (r && r.errors && r.errors[0] && r.errors[0].message || "error").slice(0, 160) };
  const lista = (k, dim) => (cuenta[k] || []).map(g => [g.dimensions[dim] || "", g.count, g.sum.visits]);
  const dias = lista("dias", "date");

  // Los días ya cerrados se copian a la base: así la historia no se pierde a los seis meses.
  // Como mucho cada seis horas, para que abrir el visor no escriba noventa filas cada vez.
  const ahora = Math.floor(Date.now() / 1000), hoyUTC = fecha(new Date());
  const ultimo = await db.prepare("SELECT MAX(guardado) g FROM cloudflare_diario").first();
  if (!ultimo || !ultimo.g || ahora - ultimo.g > 6 * 3600) {
    const cerrados = dias.filter(([d]) => d && d < hoyUTC);
    if (cerrados.length) await db.batch(cerrados.map(([d, vistas, visitas]) =>
      db.prepare("INSERT OR REPLACE INTO cloudflare_diario (dia, vistas, visitas, guardado) VALUES (?1, ?2, ?3, ?4)").bind(d, vistas, visitas, ahora)));
  }
  const viejos = await db.prepare("SELECT dia, vistas, visitas FROM cloudflare_diario WHERE dia < ?1 ORDER BY dia").bind(fecha(desde)).all();
  return {
    conectado: true,
    dias: [...viejos.results.map(x => [x.dia, x.vistas, x.visitas]), ...dias],
    equipos: lista("deviceType", "deviceType"), navegadores: lista("userAgentBrowser", "userAgentBrowser"),
    sistemas: lista("userAgentOS", "userAgentOS"), paises: lista("countryName", "countryName"),
    referentes: lista("refererHost", "refererHost"), paginas: lista("requestPath", "requestPath"),
  };
}

async function propios(db) {
  const q = (sql, ...b) => db.prepare(sql).bind(...b).all().then(x => x.results);
  // Todo por día y clave: el visor recorta el período (7, 30, 90 días o todo) sin volver a preguntar.
  const filas = await q("SELECT dia, clave, n FROM uso_diario ORDER BY dia");
  return filas.map(f => [f.dia, f.clave, f.n]);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB || !env.FIRMA) return error("Servicio no configurado", 503);
  if (!frenoLocal(request, "metricas", 20)) return demasiado();
  // La clave se revisa ANTES del bloqueo para que quien comparta la IP del dueño (CGNAT de los
  // celulares) no lo deje fuera con diez intentos malos.
  if (!(await claveOk(request, env))) {
    const llave = await huella(env.FIRMA, "metricas", ipDe(request), hoy());
    if (!(await limitar(env.DB, llave, 10, 86400))) return error("Demasiados intentos fallidos hoy desde esta conexión", 429);
    return error("Clave incorrecta", 401);
  }
  const [cf, uso] = await Promise.all([cloudflare(env, env.DB), propios(env.DB)]);
  return json({ generado: new Date().toISOString(), hoy: diaChile(), cf, uso });
}
