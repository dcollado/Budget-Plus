// Aplica supabase/migrations/*.sql, en orden, a la base de DESARROLLO.
// Guarda cuáles ya corrió en la tabla migraciones_aplicadas, así que se puede
// ejecutar las veces que haga falta: solo aplica las nuevas.
//
// Se niega a correr si:
//   - DATABASE_ENV no es "development" (no es una base declarada de pruebas), o
//   - la base ya tiene tablas pero no tiene historial de migraciones: eso es
//     una base real (producción), que se migra a mano y con respaldo.
//
// Uso:
//   npm run db:migrar

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const RAIZ = "supabase/migrations";

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

if (process.env.DATABASE_ENV !== "development") {
  salir(
    "No se aplica nada: DATABASE_ENV no es 'development'. Este script es solo para la base de desarrollo."
  );
}

const url = process.env.DATABASE_URL;
if (!url) salir("Falta DATABASE_URL en .env.local.");

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  const [{ hay_historial }] = await sql`
    select to_regclass('public.migraciones_aplicadas') is not null as hay_historial`;
  const [{ hay_esquema }] = await sql`
    select to_regclass('public.usuarios') is not null as hay_esquema`;

  if (!hay_historial && hay_esquema) {
    salir(
      "Esta base ya tiene tablas pero no tiene historial de migraciones: parece una base real (producción). No se toca."
    );
  }

  await sql`
    create table if not exists migraciones_aplicadas (
      nombre      text primary key,
      aplicada_en timestamptz not null default now()
    )`;

  const hechas = new Set((await sql`select nombre from migraciones_aplicadas`).map((r) => r.nombre));
  const archivos = readdirSync(RAIZ).filter((f) => f.endsWith(".sql")).sort();
  let aplicadas = 0;

  for (const archivo of archivos) {
    if (hechas.has(archivo)) continue;

    const contenido = readFileSync(join(RAIZ, archivo), "utf8");

    // Cada migración va en una transacción: si falla, no queda a medias.
    await sql.begin(async (tx) => {
      await tx.unsafe(contenido);
      await tx`insert into migraciones_aplicadas (nombre) values (${archivo})`;
    });

    console.log(`aplicada  ${archivo}`);
    aplicadas++;
  }

  console.log(aplicadas === 0 ? "Nada que aplicar: la base está al día." : `Listo: ${aplicadas} migración(es).`);
} catch (error) {
  salir(`Falló la migración: ${error instanceof Error ? error.message : error}`);
} finally {
  await sql.end();
}
