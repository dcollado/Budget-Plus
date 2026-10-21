// Base Postgres LOCAL para desarrollo (sin Docker ni instalar nada en el sistema):
// corre un Postgres de verdad desde node_modules, con los datos en .local-db/
// (ignorado por git). Se queda corriendo hasta que lo detengas con Ctrl+C.
//
// Uso:
//   npm run db:local            (déjalo abierto en una terminal)
//   npm run db:local:migrar     (una vez, y cada vez que haya migraciones nuevas)
//   npm run db:local:seed       (datos de ejemplo)
//   npm run dev
//
// La conexión queda en .env.development.local (ver README, "Base local").

import { existsSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PUERTO = Number(process.env.DB_LOCAL_PUERTO ?? 54329);
const DIR = join(process.cwd(), ".local-db", "data");
const BASE = "budget_dev";

const pg = new EmbeddedPostgres({
  databaseDir: DIR,
  user: "postgres",
  password: "postgres",
  port: PUERTO,
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error(String(e).trim()),
});

if (!existsSync(join(DIR, "PG_VERSION"))) {
  console.log("Creando la base local (solo la primera vez)…");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase(BASE);
  console.log(`Base "${BASE}" creada.`);
} catch {
  // ya existía
}

console.log(`\nPostgres local listo en postgres://postgres:postgres@localhost:${PUERTO}/${BASE}`);
console.log("Déjalo abierto. Ctrl+C para detenerlo.\n");

let cerrando = false;
async function cerrar() {
  if (cerrando) return;
  cerrando = true;
  console.log("\nDeteniendo Postgres local…");
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);

// Mantiene el proceso vivo.
setInterval(() => {}, 1 << 30);
