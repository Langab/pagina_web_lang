// Piezas compartidas por las funciones de /api (copiadas de guareneitor, solo lo que se usa acá).
// La IP completa no se guarda nunca: entra a un HMAC cuya huella vence en 24 horas.
const enc = new TextEncoder();

export const CABECERAS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
};
export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CABECERAS, ...extra } });
export const error = (mensaje, status) => json({ error: mensaje }, status);

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const clave = secreto => crypto.subtle.importKey(
  "raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

export async function huella(secreto, ...partes) {
  const s = await crypto.subtle.sign("HMAC", await clave(secreto), enc.encode(partes.join("|")));
  return b64u(s).slice(0, 24);
}

// Solo la propia página puede escribir: otro sitio no puede sumar visitas con el navegador de alguien.
export function mismoOrigen(request) {
  const origen = request.headers.get("Origin");
  if (origen) return origen === new URL(request.url).origin;
  return request.headers.get("Sec-Fetch-Site") === "same-origin";
}

// Las previsualizaciones (<hash>.portafolio-benjamin-lang.pages.dev) comparten la base con producción:
// se pueden mirar, pero no cuentan. HOSTS en wrangler.toml lista los nombres que sí.
export function hostPropio(request, env) {
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return String(env.HOSTS || "").split(",").map(h => h.trim()).includes(host);
}

export async function leerJSON(request, maximo) {
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return null;
  if (Number(request.headers.get("Content-Length") || 0) > maximo) return null;
  const txt = await request.text();
  if (txt.length > maximo) return null;
  try {
    const j = JSON.parse(txt);
    return j && typeof j === "object" && !Array.isArray(j) ? j : null;
  } catch { return null; }
}

// Contador con vencimiento en D1. Devuelve false si se pasó del máximo.
// Pasado el máximo ya NO se escribe (el WHERE del upsert deja la fila como está), para que un
// script no gaste las escrituras diarias de D1 de toda la cuenta.
export async function limitar(db, llave, maximo, segundos) {
  const ahora = Math.floor(Date.now() / 1000);
  const [, r] = await db.batch([
    db.prepare("DELETE FROM limites WHERE vence < ?1").bind(ahora),
    db.prepare(
      `INSERT INTO limites (clave, n, vence) VALUES (?1, 1, ?2)
       ON CONFLICT(clave) DO UPDATE SET n = n + 1 WHERE limites.n < ?3
       RETURNING n`).bind(llave, ahora + segundos, maximo),
  ]);
  const fila = r && r.results && r.results[0];
  return !!fila && fila.n <= maximo;
}

// Primer freno, antes de tocar D1: un contador en la memoria del aislado que atiende el pedido.
const VENTANAS = new Map();
export function frenoLocal(request, ruta, maximo, segundos = 60) {
  const ahora = Date.now(), llave = ruta + "|" + ipDe(request);
  let v = VENTANAS.get(llave);
  if (!v || ahora - v.t > segundos * 1000) { v = { t: ahora, n: 0 }; VENTANAS.set(llave, v); }
  if (VENTANAS.size > 20000) for (const [k, x] of VENTANAS) if (ahora - x.t > 120000) VENTANAS.delete(k);
  return ++v.n <= maximo;
}
export const demasiado = () => json({ error: "Demasiados pedidos seguidos. Espera un minuto." }, 429, { "Retry-After": "60" });

export const hoy = () => new Date().toISOString().slice(0, 10);
// En IPv6 una casa entera recibe un /64: se limita por esa red y no por cada dirección.
function red(ip) {
  if (!ip.includes(":")) return ip;
  const [a, b = ""] = ip.split("::");
  const izq = a ? a.split(":") : [], der = b ? b.split(":") : [];
  const g = [...izq, ...Array(Math.max(0, 8 - izq.length - der.length)).fill("0"), ...der];
  return g.slice(0, 4).map(x => x.replace(/^0+(?=.)/, "").toLowerCase()).join(":") + "::/64";
}
export const ipDe = request => red(request.headers.get("CF-Connecting-IP") || "sin-ip");
const FECHA_CHILE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
export const diaChile = (d = new Date()) => FECHA_CHILE.format(d);

// Suma 1 a cada clave del día. Una sentencia por clave, todas en un batch.
export function sumar(db, claves, dia = diaChile()) {
  const sql = "INSERT INTO uso_diario (dia, clave, n) VALUES (?1, ?2, 1) ON CONFLICT(dia, clave) DO UPDATE SET n = n + 1";
  return db.batch(claves.map(c => db.prepare(sql).bind(dia, c)));
}
