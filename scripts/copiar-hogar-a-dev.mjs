// Copia el hogar de UN usuario de PRODUCCIÓN a la base de DESARROLLO, para
// probar con datos reales. En producción solo LEE (transacción de solo
// lectura). Copia solo ese hogar (sus personas, cuentas, categorías,
// presupuestos y movimientos), nunca los de otros hogares.
//
// Lo sensible se sanea al copiar:
//   - usuarios.password_hash -> 'sin-contrasena' (se entra con DEV_AUTO_LOGIN_*)
//   - usuarios.email         -> null (así el desarrollo no escribe a nadie)
//   - households.calendar_id -> null (así no toca calendarios reales)
// No se copian invitaciones, restablecimientos de contraseña, intentos de
// login, registro de actividad ni solicitudes de acceso.
//
// Se niega a correr si DATABASE_ENV no es "development", si la base destino no
// es la de desarrollo (sin historial de migraciones) o si origen y destino son
// la misma base. Si el hogar ya estaba copiado, lo reemplaza (borra y vuelve a
// copiar), con todo lo que haya en él en desarrollo, como los proyectos.
//
// Uso:
//   npm run db:copiar-hogar -- <usuarioId> --ver     (solo muestra qué copiaría)
//   npm run db:copiar-hogar -- <usuarioId>           (copia)
//
// El origen se lee de .env.vercel (ORIGEN_ENV=otro-archivo para cambiarlo).

import { readFileSync } from "node:fs";
import postgres from "postgres";

const SANEAR = {
  usuarios: { password_hash: "sin-contrasena", email: null },
  households: { calendar_id: null },
};
// Orden que respeta las llaves foráneas.
const TABLAS_DEL_HOGAR = ["cuentas", "accounts", "categories", "budgets", "transactions"];

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

function leerEnv(archivo) {
  const valores = {};
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(linea);
    if (m) valores[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return valores;
}

const args = process.argv.slice(2);
const soloVer = args.includes("--ver");
const usuarioId = args.find((a) => !a.startsWith("--"));

if (!usuarioId) salir("Falta el id de usuario: npm run db:copiar-hogar -- <usuarioId> [--ver]");
if (process.env.DATABASE_ENV !== "development") {
  salir("No se copia nada: DATABASE_ENV no es 'development'. Este script solo escribe en la base de desarrollo.");
}

const destinoUrl = process.env.DATABASE_URL;
const origenUrl = leerEnv(process.env.ORIGEN_ENV ?? ".env.vercel").DATABASE_URL;
if (!destinoUrl) salir("Falta DATABASE_URL (destino) en .env.local.");
if (!origenUrl) salir("No encuentro DATABASE_URL de origen en .env.vercel.");

const proyectoDe = (url) => new URL(url).username;
if (origenUrl === destinoUrl || proyectoDe(origenUrl) === proyectoDe(destinoUrl)) {
  salir("Origen y destino son la misma base. No se hace nada.");
}

const origen = postgres(origenUrl, { prepare: false, max: 1, onnotice: () => {} });
const destino = postgres(destinoUrl, { prepare: false, max: 1, onnotice: () => {} });

try {
  // El destino tiene que ser la base de desarrollo (la que migró nuestro script).
  const [{ es_dev }] = await destino`select to_regclass('public.migraciones_aplicadas') is not null as es_dev`;
  if (!es_dev) salir("El destino no tiene historial de migraciones: no parece la base de desarrollo. No se toca.");

  // ---- lectura de producción (solo lectura)
  const datos = await origen.begin("read only", async (tx) => {
    const [yo] = await tx`select * from members where user_id = ${usuarioId}`;
    if (!yo) throw new Error(`El usuario ${usuarioId} no tiene hogar en el origen.`);

    const hid = yo.household_id;
    const [hogar] = await tx`select * from households where id = ${hid}`;
    const miembros = await tx`select * from members where household_id = ${hid}`;
    const usuarios = await tx`select * from usuarios where id in ${tx(miembros.map((m) => m.user_id))}`;
    const filas = {};
    for (const t of TABLAS_DEL_HOGAR) filas[t] = await tx`select * from ${tx(t)} where household_id = ${hid}`;

    return { hogar, usuarios, miembros, filas };
  });

  const resumen = {
    hogar: datos.hogar.name,
    personas: datos.miembros.map((m) => m.display_name),
    usuarios: datos.usuarios.length,
    ...Object.fromEntries(TABLAS_DEL_HOGAR.map((t) => [t, datos.filas[t].length])),
  };
  console.log("Se copiaría:", JSON.stringify(resumen));

  if (soloVer) {
    console.log("(--ver: no se escribió nada)");
  } else {
    // Solo las columnas que existen en el destino.
    const columnas = {};
    for (const t of ["households", "usuarios", "members", ...TABLAS_DEL_HOGAR]) {
      columnas[t] = new Set(
        (await destino`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${t}`).map(
          (r) => r.column_name
        )
      );
    }
    const preparar = (tabla, fila) => {
      const salida = {};
      for (const [k, v] of Object.entries({ ...fila, ...(SANEAR[tabla] ?? {}) })) {
        if (columnas[tabla].has(k)) salida[k] = v;
      }
      return salida;
    };

    await destino.begin(async (tx) => {
      // Reemplazo: si el hogar o las personas ya estaban, se borran antes.
      await tx`delete from households where id = ${datos.hogar.id}`;
      await tx`delete from usuarios where id in ${tx(datos.usuarios.map((u) => u.id))}`;

      await tx`insert into households ${tx(preparar("households", datos.hogar))}`;
      for (const u of datos.usuarios) await tx`insert into usuarios ${tx(preparar("usuarios", u))}`;
      for (const m of datos.miembros) await tx`insert into members ${tx(preparar("members", m))}`;
      for (const t of TABLAS_DEL_HOGAR) {
        for (const fila of datos.filas[t]) await tx`insert into ${tx(t)} ${tx(preparar(t, fila))}`;
      }
    });

    // Lo que se pega en .env.local para entrar como esa persona.
    const yo = datos.usuarios.find((u) => u.id === usuarioId);
    console.log("Listo. Copiado y saneado (sin contraseñas, sin correos, sin calendario).");
    console.log(`\nEn .env.local pon:\n  DEV_AUTO_LOGIN_ID=${yo.id}\n  DEV_AUTO_LOGIN_USER=${yo.usuario}\n`);
  }
} catch (error) {
  salir(`Falló: ${error instanceof Error ? error.message : error}`);
} finally {
  await origen.end();
  await destino.end();
}
