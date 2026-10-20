// Datos de ejemplo para la base de DESARROLLO: un hogar con dos personas
// inventadas, sus ingresos y gastos fijos, algunos gastos extra del mes y
// dos cuentas. Nada de esto es real. Es idempotente: si ya existe, no hace nada.
//
// Se niega a correr si DATABASE_ENV no es "development" o si la base no tiene
// el historial de migraciones de scripts/migrar-db.mjs (señal de base real).
//
// Uso:
//   npm run db:seed-dev
//
// Después, en .env.local:
//   DEV_AUTO_LOGIN_ID=dev-david
//   DEV_AUTO_LOGIN_USER=david-dev

import postgres from "postgres";

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

if (process.env.DATABASE_ENV !== "development") {
  salir("No se siembra nada: DATABASE_ENV no es 'development'.");
}

const url = process.env.DATABASE_URL;
if (!url) salir("Falta DATABASE_URL en .env.local.");

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

// Mes de hoy en Panamá (UTC-5), igual que la app.
const panama = new Date(Date.now() - 5 * 60 * 60 * 1000);
const MES = `${panama.getUTCFullYear()}-${String(panama.getUTCMonth() + 1).padStart(2, "0")}`;

const dolares = (n) => Math.round(n * 100);

try {
  const [{ hay_historial }] = await sql`
    select to_regclass('public.migraciones_aplicadas') is not null as hay_historial`;
  if (!hay_historial) salir("Corre primero: npm run db:migrar");

  const [ya] = await sql`select id from usuarios where id = 'dev-david'`;
  if (ya) {
    console.log("Ya hay datos de ejemplo. Nada que hacer.");
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    // password_hash no es un hash válido: estas cuentas solo entran con
    // DEV_AUTO_LOGIN_*, no con contraseña.
    await tx`
      insert into usuarios (id, nombre, usuario, password_hash) values
        ('dev-david', 'David (dev)', 'david-dev', 'sin-contrasena'),
        ('dev-caro', 'Caro (dev)', 'caro-dev', 'sin-contrasena')`;

    const [hogar] = await tx`insert into households (name) values ('Casa (desarrollo)') returning id`;

    const [david] = await tx`
      insert into members (household_id, user_id, display_name, role, color)
      values (${hogar.id}, 'dev-david', 'David', 'admin', 0) returning id`;
    const [caro] = await tx`
      insert into members (household_id, user_id, display_name, role, color)
      values (${hogar.id}, 'dev-caro', 'Caro', 'member', 1) returning id`;

    const [conjunta] = await tx`
      insert into cuentas (household_id, name) values (${hogar.id}, 'Cuenta conjunta') returning id`;
    const [emergencias] = await tx`
      insert into cuentas (household_id, name) values (${hogar.id}, 'Emergencias') returning id`;

    // [nombre, tipo, fijo, dueño, día, cuenta, ahorro, monto, día de la fecha (variables)]
    const categorias = [
      ["Ingreso David", "income", true, david.id, null, null, false, 3000],
      ["Ingreso Caro", "income", true, caro.id, null, null, false, 2000],
      ["Renta", "expense", true, david.id, 5, conjunta.id, false, 1000],
      ["Luz", "expense", true, david.id, 15, conjunta.id, false, 120],
      ["Internet", "expense", true, david.id, 10, null, false, 60],
      ["Seguro de carro", "expense", true, caro.id, 12, null, false, 80],
      ["Celular", "expense", true, caro.id, 17, null, false, 30],
      ["Ahorro emergencias", "expense", true, caro.id, 28, emergencias.id, true, 150],
      ["Salidas", "expense", false, david.id, null, null, false, 100, 15],
      ["Mascotas", "expense", false, caro.id, null, null, false, 60, 20],
    ];

    for (const [name, kind, fixed, dueno, dia, cuenta, ahorro, monto, diaFecha] of categorias) {
      const [cat] = await tx`
        insert into categories (household_id, name, kind, fixed, due_day, owner_member_id, cuenta_id, es_ahorro)
        values (${hogar.id}, ${name}, ${kind}, ${fixed}, ${dia}, ${dueno}, ${cuenta}, ${ahorro})
        returning id`;

      const fecha = diaFecha ? `${MES}-${String(diaFecha).padStart(2, "0")}` : null;

      await tx`
        insert into budgets (household_id, category_id, month, planned_amount_cents, due_date)
        values (${hogar.id}, ${cat.id}, ${MES}, ${dolares(monto)}, ${fecha})`;
    }
  });

  console.log("Listo. Datos de ejemplo creados (hogar 'Casa (desarrollo)', David y Caro).");
  console.log("\nEn .env.local pon:\n  DEV_AUTO_LOGIN_ID=dev-david\n  DEV_AUTO_LOGIN_USER=david-dev\n");
} catch (error) {
  salir(`Falló la siembra: ${error instanceof Error ? error.message : error}`);
} finally {
  await sql.end();
}
