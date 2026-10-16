// Respaldo de la base (Supabase Free no trae backups descargables).
// Guarda cada tabla del esquema public como JSON en backups/<fecha>/, más un
// resumen con el conteo de filas. Solo lee: no modifica nada en la base.
//
// Uso:
//   npm run respaldo
//
// OJO: el respaldo incluye correos y hashes de contraseña. backups/ está en
// .gitignore; guárdalo en un lugar privado, nunca en el repo ni en un chat.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("Falta DATABASE_URL. Corre: npm run respaldo");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
const carpeta = join(
  "backups",
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
);

// bigint no entra en JSON.stringify; Date sale como ISO por defecto.
const reemplazo = (_k, v) => (typeof v === "bigint" ? v.toString() : v);

try {
  const tablas = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name`;

  mkdirSync(carpeta, { recursive: true });

  const resumen = {};

  for (const { table_name: tabla } of tablas) {
    const filas = await sql.unsafe(`select * from "${tabla.replaceAll('"', '""')}"`);
    writeFileSync(join(carpeta, `${tabla}.json`), JSON.stringify(filas, reemplazo, 2));
    resumen[tabla] = filas.length;
    console.log(`${tabla}: ${filas.length} filas`);
  }

  writeFileSync(
    join(carpeta, "_resumen.json"),
    JSON.stringify({ fecha: d.toISOString(), tablas: resumen }, null, 2)
  );

  console.log(`\nListo: ${carpeta}`);
} catch (error) {
  console.error("No se pudo respaldar:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
