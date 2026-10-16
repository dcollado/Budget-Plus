// Respaldo de la base (Supabase Free no trae backups descargables).
// Guarda cada tabla del esquema public como JSON en backups/<fecha>/, más un
// resumen con el conteo de filas. Solo lee: no modifica nada en la base.
// Conserva las últimas 8 carpetas y borra las más viejas. Si falla y hay
// RESPALDO_AVISO_A (y SMTP) en el entorno, avisa por correo.
//
// Uso:
//   npm run respaldo
//
// OJO: el respaldo incluye correos y hashes de contraseña. backups/ está en
// .gitignore; guárdalo en un lugar privado, nunca en el repo ni en un chat.

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import postgres from "postgres";

const CONSERVAR = 8;
const RAIZ = "backups";
const PATRON = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;

const pad = (n) => String(n).padStart(2, "0");
// bigint no entra en JSON.stringify; Date sale como ISO por defecto.
const reemplazo = (_k, v) => (typeof v === "bigint" ? v.toString() : v);

async function avisarFallo(motivo) {
  const to = process.env.RESPALDO_AVISO_A;
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;

  if (!to || !host || !pass) {
    console.error("(Sin aviso por correo: falta RESPALDO_AVISO_A o SMTP.)");
    return;
  }

  try {
    const port = Number(process.env.SMTP_PORT ?? 465);
    await nodemailer
      .createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass } })
      .sendMail({
        from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
        to,
        subject: "Budget Plus: falló el respaldo de la base",
        text: `El respaldo semanal no se pudo completar.\n\nMotivo: ${motivo}\n\nCorre "npm run respaldo" a mano para ver el detalle.`,
      });
    console.error("Aviso enviado por correo.");
  } catch (error) {
    console.error("Tampoco se pudo enviar el aviso:", error.message);
  }
}

function podarViejos() {
  const carpetas = readdirSync(RAIZ)
    .filter((n) => PATRON.test(n))
    .sort();

  for (const vieja of carpetas.slice(0, Math.max(0, carpetas.length - CONSERVAR))) {
    rmSync(join(RAIZ, vieja), { recursive: true, force: true });
    console.log(`Borrado respaldo viejo: ${vieja}`);
  }
}

async function respaldar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");

  const sql = postgres(url, { max: 1, prepare: false });
  const d = new Date();
  const carpeta = join(
    RAIZ,
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
  );

  let creada = false;

  try {
    const tablas = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`;

    if (tablas.length === 0) throw new Error("La base no devolvió ninguna tabla.");

    if (existsSync(carpeta)) throw new Error(`Ya existe ${carpeta}; espera un minuto.`);
    mkdirSync(carpeta, { recursive: true });
    creada = true;

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
    // Una carpeta a medias no es un respaldo: se quita para no confundirla.
    // Solo si esta corrida la creó (nunca la de un respaldo anterior).
    if (creada) rmSync(carpeta, { recursive: true, force: true });
    throw error;
  } finally {
    await sql.end();
  }
}

try {
  await respaldar();
  podarViejos();
} catch (error) {
  console.error("No se pudo respaldar:", error.message);
  await avisarFallo(error.message);
  process.exitCode = 1;
}
