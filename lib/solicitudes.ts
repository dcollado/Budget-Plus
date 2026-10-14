import { getSql, usaPostgres } from "@/lib/db";
import { ErrorCuenta, normalizarEmail } from "@/lib/auth/cuentas";
import { crearHogarConAdmin } from "@/lib/admin/hogares";
import { enviarCorreo, escaparHtml, urlApp } from "@/lib/mail";
import { getT } from "@/lib/i18n/server";

// Solicitudes públicas de acceso. Nadie crea cuenta solo: el super-admin las
// revisa y, al aprobarlas, se crea el hogar y se manda la invitación.

export type Solicitud = {
  id: string;
  nombre: string;
  email: string;
  hogar: string;
  mensaje: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  creadaEn: string;
  decididaEn: string | null;
};

type Fila = {
  id: string;
  nombre: string;
  email: string;
  hogar: string;
  mensaje: string;
  estado: Solicitud["estado"];
  creada_en: Date;
  decidida_en: Date | null;
};

const aSolicitud = (f: Fila): Solicitud => ({
  id: f.id,
  nombre: f.nombre,
  email: f.email,
  hogar: f.hogar,
  mensaje: f.mensaje,
  estado: f.estado,
  creadaEn: f.creada_en.toISOString(),
  decididaEn: f.decidida_en ? f.decidida_en.toISOString() : null,
});

const MAX_NOMBRE = 80;
const MAX_HOGAR = 80;
const MAX_MENSAJE = 500;
const MAX_POR_IP_POR_HORA = 5;

function limpiarTexto(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

function validarDatos(input: { nombre?: unknown; email?: unknown; hogar?: unknown }) {
  const nombre = limpiarTexto(input.nombre, MAX_NOMBRE);
  if (!nombre) throw new ErrorCuenta("Enter your name.");
  const email = normalizarEmail(input.email);
  const hogar = limpiarTexto(input.hogar, MAX_HOGAR);
  return { nombre, email, hogar };
}

// Alta pública. Responde igual exista o no la cuenta/solicitud, para no
// revelar qué correos ya están registrados.
export async function crearSolicitud(
  input: { nombre?: unknown; email?: unknown; hogar?: unknown; mensaje?: unknown },
  ip: string
): Promise<{ limitada: boolean }> {
  if (!usaPostgres()) {
    throw new ErrorCuenta("Access requests require the Postgres database.");
  }

  const { nombre, email, hogar } = validarDatos(input);
  const mensaje = limpiarTexto(input.mensaje, MAX_MENSAJE);
  const sql = getSql();
  const clave = `req:${ip}`;

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from login_intentos
    where clave = ${clave} and at > now() - interval '1 hour'`;
  if (n >= MAX_POR_IP_POR_HORA) return { limitada: true };

  await sql`insert into login_intentos (clave, at) values (${clave}, now())`;

  const [cuenta] = await sql`
    select 1 from usuarios where lower(email) = ${email} or lower(usuario) = ${email}`;
  if (cuenta) return { limitada: false };

  const [pendiente] = await sql`
    select 1 from solicitudes_acceso where lower(email) = ${email} and estado = 'pendiente'`;
  if (pendiente) return { limitada: false };

  await sql`
    insert into solicitudes_acceso (nombre, email, hogar, mensaje)
    values (${nombre}, ${email}, ${hogar}, ${mensaje})`;

  await avisarSuperadmins({ nombre, email, hogar, mensaje }).catch((e) =>
    console.error("Error notifying about the access request:", e)
  );

  return { limitada: false };
}

async function avisarSuperadmins(s: { nombre: string; email: string; hogar: string; mensaje: string }) {
  const filas = await getSql()<{ email: string }[]>`
    select email from usuarios where es_superadmin and activo and email is not null`;
  if (filas.length === 0) return;

  const { t } = await getT();
  const enlace = urlApp("/admin");
  const lineas = [
    t("mail.requestBody", { name: s.nombre, email: s.email }),
    s.hogar ? `${t("access.fieldHousehold")}: ${s.hogar}` : "",
    s.mensaje ? `${t("access.fieldMessage")}: ${s.mensaje}` : "",
  ].filter(Boolean);

  for (const f of filas) {
    await enviarCorreo({
      to: f.email,
      subject: t("mail.requestSubject", { name: s.nombre }),
      text: `${lineas.join("\n")}\n\n${t("mail.requestReview")}: ${enlace}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1f2933">
<h2 style="margin:0 0 12px">${escaparHtml(t("mail.requestSubject", { name: s.nombre }))}</h2>
${lineas.map((l) => `<p style="line-height:1.5;margin:0 0 8px">${escaparHtml(l)}</p>`).join("")}
<p style="margin:24px 0"><a href="${escaparHtml(enlace)}" style="background:#d4a24c;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escaparHtml(t("mail.requestReview"))}</a></p>
</div>`,
    });
  }
}

export async function listarSolicitudes(): Promise<Solicitud[]> {
  const filas = await getSql()<Fila[]>`
    select id, nombre, email, hogar, mensaje, estado, creada_en, decidida_en
    from solicitudes_acceso
    where estado = 'pendiente' or decidida_en > now() - interval '30 days'
    order by (estado = 'pendiente') desc, coalesce(decidida_en, creada_en) desc
    limit 100`;
  return filas.map(aSolicitud);
}

async function cargarPendiente(id: string): Promise<Fila> {
  const [fila] = await getSql()<Fila[]>`
    select id, nombre, email, hogar, mensaje, estado, creada_en, decidida_en
    from solicitudes_acceso where id = ${id}`;
  if (!fila) throw new ErrorCuenta("Request not found.");
  if (fila.estado !== "pendiente") throw new ErrorCuenta("This request was already decided.");
  return fila;
}

// Cambia los datos antes de decidir (nombre, correo, nombre del hogar).
export async function editarSolicitud(
  id: string,
  datos: { nombre?: unknown; email?: unknown; hogar?: unknown }
): Promise<void> {
  const actual = await cargarPendiente(id);
  const { nombre, email, hogar } = validarDatos({
    nombre: datos.nombre ?? actual.nombre,
    email: datos.email ?? actual.email,
    hogar: datos.hogar ?? actual.hogar,
  });

  await getSql()`
    update solicitudes_acceso set nombre = ${nombre}, email = ${email}, hogar = ${hogar}
    where id = ${id}`;
}

// Aprueba: crea el hogar con esa persona como admin y le envía la invitación.
// Si algo falla (ej. el correo ya tiene cuenta), la solicitud sigue pendiente.
export async function aprobarSolicitud(
  id: string,
  actorUserId: string,
  datos: { nombre?: unknown; email?: unknown; hogar?: unknown }
): Promise<void> {
  await editarSolicitud(id, datos);
  const s = await cargarPendiente(id);

  const { householdId } = await crearHogarConAdmin({
    nombreHogar: s.hogar || s.nombre,
    adminEmail: s.email,
    invitedBy: actorUserId,
  });

  await getSql()`
    update solicitudes_acceso
    set estado = 'aprobada', decidida_en = now(), decidida_por = ${actorUserId},
        household_id = ${householdId}
    where id = ${id}`;
}

export async function rechazarSolicitud(id: string, actorUserId: string): Promise<void> {
  await cargarPendiente(id);
  await getSql()`
    update solicitudes_acceso
    set estado = 'rechazada', decidida_en = now(), decidida_por = ${actorUserId}
    where id = ${id}`;
}
