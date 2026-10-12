import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/password-hash";
import { correoInvitacion, correoReset, urlApp } from "@/lib/mail";

// Error con mensaje seguro para mostrar al usuario.
export class ErrorCuenta extends Error {}

const DIAS_INVITACION = 7;
const MINUTOS_RESET = 60;
const ESPERA_RESET_SEGUNDOS = 60;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const nuevoToken = () => randomBytes(32).toString("base64url");

export function normalizarEmail(valor: unknown): string {
  const email = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErrorCuenta("El correo no es válido.");
  }
  return email;
}

export function validarPassword(valor: unknown): string {
  const password = typeof valor === "string" ? valor : "";
  if (password.length < 8) {
    throw new ErrorCuenta("La contraseña debe tener al menos 8 caracteres.");
  }
  return password;
}

// ---------- Invitaciones ----------

export async function crearInvitacion(input: {
  householdId: string;
  email: string;
  role: "admin" | "member";
  invitedBy: string;
}): Promise<{ enlace: string }> {
  const sql = getSql();
  const email = normalizarEmail(input.email);

  const [cuenta] = await sql`
    select 1 from usuarios where lower(email) = ${email} or lower(usuario) = ${email}`;
  if (cuenta) {
    throw new ErrorCuenta("Ese correo ya tiene una cuenta.");
  }

  const [hogar] = await sql<{ name: string }[]>`
    select name from households where id = ${input.householdId}`;
  if (!hogar) throw new ErrorCuenta("El hogar no existe.");

  // Una sola invitación vigente por correo y hogar: reemplaza la anterior.
  await sql`
    delete from invitaciones
    where household_id = ${input.householdId} and lower(email) = ${email} and used_at is null`;

  const token = nuevoToken();
  await sql`
    insert into invitaciones (household_id, email, role, token_hash, invited_by, expires_at)
    values (${input.householdId}, ${email}, ${input.role}, ${hashToken(token)}, ${input.invitedBy},
            now() + ${DIAS_INVITACION + " days"}::interval)`;

  const enlace = urlApp(`/invitacion?token=${token}`);
  await correoInvitacion({ to: email, hogar: hogar.name, enlace });
  return { enlace };
}

export type InvitacionPublica = { email: string; hogar: string };

export async function leerInvitacion(token: string): Promise<InvitacionPublica | null> {
  if (!token) return null;
  const [fila] = await getSql()<{ email: string; hogar: string }[]>`
    select i.email, h.name as hogar
    from invitaciones i join households h on h.id = i.household_id
    where i.token_hash = ${hashToken(token)} and i.used_at is null and i.expires_at > now()`;
  return fila ?? null;
}

export async function aceptarInvitacion(input: {
  token: string;
  nombre: string;
  password: string;
}): Promise<void> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new ErrorCuenta("Escribe tu nombre.");
  const password = validarPassword(input.password);
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  await getSql().begin(async (tx) => {
    // El UPDATE ... returning consume la invitación de forma atómica: dos
    // clics a la vez no pueden crear dos cuentas.
    const [inv] = await tx<{ household_id: string; email: string; role: string }[]>`
      update invitaciones set used_at = now()
      where token_hash = ${hashToken(input.token)} and used_at is null and expires_at > now()
      returning household_id, email, role`;

    if (!inv) throw new ErrorCuenta("La invitación no es válida o ya venció.");

    const [existe] = await tx`
      select 1 from usuarios where lower(email) = ${inv.email} or lower(usuario) = ${inv.email}`;
    if (existe) throw new ErrorCuenta("Ese correo ya tiene una cuenta.");

    await tx`
      insert into usuarios (id, nombre, usuario, password_hash, activo, email)
      values (${userId}, ${nombre}, ${inv.email}, ${passwordHash}, true, ${inv.email})`;

    await tx`
      insert into members (household_id, user_id, display_name, role)
      values (${inv.household_id}, ${userId}, ${nombre}, ${inv.role})`;
  });
}

export type InvitacionPendiente = { id: string; email: string; role: string; venceEn: string };

export async function listarInvitacionesPendientes(
  householdId: string
): Promise<InvitacionPendiente[]> {
  const filas = await getSql()<{ id: string; email: string; role: string; expires_at: Date }[]>`
    select id, email, role, expires_at from invitaciones
    where household_id = ${householdId} and used_at is null and expires_at > now()
    order by created_at desc`;
  return filas.map((f) => ({
    id: f.id,
    email: f.email,
    role: f.role,
    venceEn: f.expires_at.toISOString(),
  }));
}

// Genera un token nuevo (el anterior deja de servir) y vuelve a enviar el correo.
export async function reenviarInvitacion(input: {
  householdId: string;
  invitacionId: string;
  invitedBy: string;
}): Promise<{ enlace: string }> {
  const [inv] = await getSql()<{ email: string; role: "admin" | "member" }[]>`
    select email, role from invitaciones
    where id = ${input.invitacionId} and household_id = ${input.householdId} and used_at is null`;

  if (!inv) throw new ErrorCuenta("La invitación ya no existe.");

  return crearInvitacion({
    householdId: input.householdId,
    email: inv.email,
    role: inv.role,
    invitedBy: input.invitedBy,
  });
}

export async function cancelarInvitacion(householdId: string, id: string): Promise<void> {
  await getSql()`
    delete from invitaciones where id = ${id} and household_id = ${householdId} and used_at is null`;
}

// ---------- Miembros ----------

export type MiembroHogar = {
  userId: string;
  memberId: string;
  nombre: string;
  email: string | null;
  role: string;
  activo: boolean;
};

export async function listarMiembros(householdId: string): Promise<MiembroHogar[]> {
  const filas = await getSql()<
    { user_id: string; member_id: string; display_name: string; email: string | null; role: string; activo: boolean }[]
  >`
    select m.user_id, m.id as member_id, m.display_name, u.email, m.role, u.activo
    from members m join usuarios u on u.id = m.user_id
    where m.household_id = ${householdId}
    order by m.role, m.display_name`;
  return filas.map((f) => ({
    userId: f.user_id,
    memberId: f.member_id,
    nombre: f.display_name,
    email: f.email,
    role: f.role,
    activo: f.activo,
  }));
}

// "Quitar" = desactivar la cuenta. La fila de members se conserva porque
// sus transacciones y cuentas la referencian; sin cuenta activa ya no puede
// entrar y su sesión deja de valer en la siguiente petición.
export async function cambiarEstadoMiembro(input: {
  householdId: string;
  userId: string;
  actorUserId: string;
  activo: boolean;
}): Promise<void> {
  const sql = getSql();

  if (!input.activo && input.userId === input.actorUserId) {
    throw new ErrorCuenta("No puedes quitarte a ti mismo.");
  }

  const [miembro] = await sql<{ role: string; es_superadmin: boolean }[]>`
    select m.role, u.es_superadmin from members m join usuarios u on u.id = m.user_id
    where m.household_id = ${input.householdId} and m.user_id = ${input.userId}`;
  if (!miembro) throw new ErrorCuenta("Esa persona no es de tu hogar.");
  if (miembro.es_superadmin && !input.activo) {
    throw new ErrorCuenta("No se puede quitar al super-admin.");
  }

  await sql`update usuarios set activo = ${input.activo} where id = ${input.userId}`;
}

// ---------- Recuperar contraseña ----------

// Siempre termina sin error y sin revelar si el correo existe.
export async function solicitarReset(emailCrudo: unknown): Promise<void> {
  let email: string;
  try {
    email = normalizarEmail(emailCrudo);
  } catch {
    return;
  }

  const sql = getSql();
  const [usuario] = await sql<{ id: string }[]>`
    select id from usuarios where lower(email) = ${email} and activo`;
  if (!usuario) return;

  // Freno simple contra spam al buzón de alguien.
  const [reciente] = await sql`
    select 1 from password_resets
    where user_id = ${usuario.id}
      and created_at > now() - ${ESPERA_RESET_SEGUNDOS + " seconds"}::interval`;
  if (reciente) return;

  const token = nuevoToken();
  await sql`
    insert into password_resets (user_id, token_hash, expires_at)
    values (${usuario.id}, ${hashToken(token)}, now() + ${MINUTOS_RESET + " minutes"}::interval)`;

  await correoReset({ to: email, enlace: urlApp(`/restablecer?token=${token}`) });
}

export async function tokenResetValido(token: string): Promise<boolean> {
  if (!token) return false;
  const [fila] = await getSql()`
    select 1 from password_resets
    where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()`;
  return Boolean(fila);
}

export async function restablecerPassword(token: string, passwordCrudo: unknown): Promise<void> {
  const password = validarPassword(passwordCrudo);
  const passwordHash = await hashPassword(password);

  await getSql().begin(async (tx) => {
    const [reset] = await tx<{ user_id: string }[]>`
      update password_resets set used_at = now()
      where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()
      returning user_id`;

    if (!reset) throw new ErrorCuenta("El enlace no es válido o ya venció.");

    await tx`update usuarios set password_hash = ${passwordHash} where id = ${reset.user_id}`;
    // Cualquier otro enlace pendiente de esa persona queda sin efecto.
    await tx`
      update password_resets set used_at = now()
      where user_id = ${reset.user_id} and used_at is null`;
  });
}

// Para el super-admin: manda el enlace de nueva contraseña a un miembro.
export async function enviarResetAMiembro(householdId: string, userId: string): Promise<void> {
  const [fila] = await getSql()<{ email: string | null; activo: boolean }[]>`
    select u.email, u.activo
    from members m join usuarios u on u.id = m.user_id
    where m.household_id = ${householdId} and m.user_id = ${userId}`;

  if (!fila) throw new ErrorCuenta("Esa persona no es de ese hogar.");
  if (!fila.email) throw new ErrorCuenta("Esa persona no tiene correo registrado.");
  if (!fila.activo) throw new ErrorCuenta("La cuenta está desactivada: reactívala primero.");

  await solicitarReset(fila.email);
}
