-- Contadores anónimos del portafolio. No se guarda quién: solo cuántas veces pasó algo cada día.

-- Suma diaria por clave: «vista:/cv/», «sesion», «ref:linkedin.com», «disp:celular», «clic:cv-es»…
CREATE TABLE IF NOT EXISTS uso_diario (
  dia TEXT NOT NULL,                      -- fecha de Chile (America/Santiago)
  clave TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, clave)
) WITHOUT ROWID;

-- Límites por conexión: la llave es HMAC(ip + día), nunca la IP. Vence sola.
CREATE TABLE IF NOT EXISTS limites (
  clave TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  vence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS limites_vence ON limites (vence);

-- Copia de los días cerrados de Cloudflare Web Analytics, que guarda solo seis meses.
CREATE TABLE IF NOT EXISTS cloudflare_diario (
  dia TEXT PRIMARY KEY,                   -- fecha UTC, como la entrega Cloudflare
  vistas INTEGER NOT NULL,
  visitas INTEGER NOT NULL,
  guardado INTEGER NOT NULL
);
