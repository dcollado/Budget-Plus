import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/password-hash";
import { correoInvitacion, correoReset, urlApp } from "@/lib/mail";
import { olvidarEstado } from "@/lib/auth/sesion-vigente";
import { registrarEvento } from "@/lib/auth/eventos";

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

  const [hogar] = await sql<{ name: string; archivado_en: Date | null }[]>`
    select name, archivado_en from households where id = ${input.householdId}`;
  if (!hogar) throw new ErrorCuenta("El hogar no existe.");
  if (hogar.archivado_en) throw new ErrorCuenta("El hogar está archivado.");

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
  await registrarEvento({
    accion: "invitar",
    actorUserId: input.invitedBy,
    householdId: input.householdId,
    objetivo: email,
    detalle: input.role === "admin" ? "como admin" : "como miembro",
  });
  return { enlace };
}

export type InvitacionPublica = { email: string; hogar: string };

export async function leerInvitacion(token: string): Promise<InvitacionPublica | null> {
  if (!token) return null;
  const [fila] = await getSql()<{ email: string; hogar: string }[]>`
    select i.email, h.name as hogar
    from invitaciones i join households h on h.id = i.household_id
    where i.token_hash = ${hashToken(token)} and i.used_at is null and i.expires_at > now()
      and h.archivado_en is null`;
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
  let hogarDeAlta = "";
  let correoDeAlta = "";

  await getSql().begin(async (tx) => {
    // El UPDATE ... returning consume la invitación de forma atómica: dos
    // clics a la vez no pueden crear dos cuentas.
    const [inv] = await tx<{ household_id: string; email: string; role: string }[]>`
      update invitaciones i set used_at = now()
      where i.token_hash = ${hashToken(input.token)} and i.used_at is null and i.expires_at > now()
        and exists (select 1 from households h where h.id = i.household_id and h.archivado_en is null)
      returning i.household_id, i.email, i.role`;

    if (!inv) throw new ErrorCuenta("La invitación no es válida o ya venció.");
    hogarDeAlta = inv.household_id;
    correoDeAlta = inv.email;

    const [existe] = await tx`
      select 1 from usuarios where lower(email) = ${inv.email} or lower(usuario) = ${inv.email}`;
    if (existe) throw new ErrorCuenta("Ese correo ya tiene una cuenta.");

    await tx`
      insert into usuarios (id, nombre, usuario, password_hash, activo, email)
      values (${userId}, ${nombre}, ${inv.email}, ${passwordHash}, true, ${inv.email})`;

    const usados = await tx<{ color: number }[]>`
      select color from members where household_id = ${inv.household_id} and color is not null`;
    const set = new Set(usados.map((u) => u.color));
    let color = usados.length % 6;
    for (let i = 0; i < 6; i += 1) {
      if (!set.has(i)) {
        color = i;
        break;
      }
    }

    await tx`
      insert into members (household_id, user_id, display_name, role, color)
      values (${inv.household_id}, ${userId}, ${nombre}, ${inv.role}, ${color})`;
  });

  await registrarEvento({
    accion: "aceptar_invitacion",
    actorUserId: userId,
    householdId: hogarDeAlta,
    objetivo: correoDeAlta,
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

  const resultado = await crearInvitacion({
    householdId: input.householdId,
    email: inv.email,
    role: inv.role,
    invitedBy: input.invitedBy,
  });

  await registrarEvento({
    accion: "reenviar_invitacion",
    actorUserId: input.invitedBy,
    householdId: input.householdId,
    objetivo: inv.email,
  });

  return resultado;
}

export async function cancelarInvitacion(
  householdId: string,
  id: string,
  actorUserId?: string
): Promise<void> {
  const [inv] = await getSql()<{ email: string }[]>`
    delete from invitaciones
    where id = ${id} and household_id = ${householdId} and used_at is null
    returning email`;

  if (inv) {
    await registrarEvento({
      accion: "cancelar_invitacion",
      actorUserId,
      householdId,
      objetivo: inv.email,
    });
  }
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
  actorEsSuperadmin: boolean;
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
  if (miembro.es_superadmin && !input.actorEsSuperadmin) {
    throw new ErrorCuenta("No puedes modificar al super-admin.");
  }
  if (miembro.es_superadmin && !input.activo) {
    throw new ErrorCuenta("No se puede quitar al super-admin.");
  }

  await sql`update usuarios set activo = ${input.activo} where id = ${input.userId}`;
  olvidarEstado(input.userId);

  await registrarEvento({
    accion: input.activo ? "reactivar_miembro" : "quitar_miembro",
    actorUserId: input.actorUserId,
    householdId: input.householdId,
    objetivoUserId: input.userId,
  });
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

  let userId = "";

  await getSql().begin(async (tx) => {
    const [reset] = await tx<{ user_id: string }[]>`
      update password_resets set used_at = now()
      where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()
      returning user_id`;

    if (!reset) throw new ErrorCuenta("El enlace no es válido o ya venció.");
    userId = reset.user_id;

    // sesion_version + 1: las sesiones abiertas con la contraseña anterior caen.
    await tx`
      update usuarios
      set password_hash = ${passwordHash}, sesion_version = sesion_version + 1
      where id = ${reset.user_id}`;
    // Cualquier otro enlace pendiente de esa persona queda sin efecto.
    await tx`
      update password_resets set used_at = now()
      where user_id = ${reset.user_id} and used_at is null`;
  });

  olvidarEstado(userId);

  await registrarEvento({ accion: "contrasena_restablecida", actorUserId: userId });
}

// Edita nombre, correo y/o rol de un miembro. Solo cambia lo que viene.
export async function editarMiembro(input: {
  householdId: string;
  userId: string;
  actorUserId: string;
  actorEsSuperadmin: boolean;
  nombre?: string;
  email?: string;
  role?: "admin" | "member";
}): Promise<void> {
  const sql = getSql();

  await sql.begin(async (tx) => {
    const [m] = await tx<
      { id: string; role: string; email: string | null; usuario: string; activo: boolean; es_superadmin: boolean }[]
    >`
      select m.id, m.role, u.email, u.usuario, u.activo, u.es_superadmin
      from members m join usuarios u on u.id = m.user_id
      where m.household_id = ${input.householdId} and m.user_id = ${input.userId}
      for update of m, u`;

    if (!m) throw new ErrorCuenta("Esa persona no es de ese hogar.");
    if (m.es_superadmin && !input.actorEsSuperadmin) {
      throw new ErrorCuenta("No puedes modificar al super-admin.");
    }

    if (input.nombre !== undefined) {
      const nombre = input.nombre.trim();
      if (!nombre) throw new ErrorCuenta("El nombre no puede estar vacío.");
      await tx`update usuarios set nombre = ${nombre} where id = ${input.userId}`;
      await tx`update members set display_name = ${nombre} where id = ${m.id}`;
    }

    if (input.email !== undefined) {
      const email = normalizarEmail(input.email);
      const anterior = (m.email ?? "").toLowerCase();

      if (email !== anterior) {
        const [otro] = await tx`
          select 1 from usuarios
          where id <> ${input.userId} and (lower(email) = ${email} or lower(usuario) = ${email})`;
        if (otro) throw new ErrorCuenta("Ese correo ya lo usa otra cuenta.");

        // Quien entra con su correo como usuario sigue entrando con el nuevo;
        // los usuarios con nombre propio (ej. "david") no cambian.
        if (m.usuario.toLowerCase() === anterior) {
          await tx`update usuarios set email = ${email}, usuario = ${email} where id = ${input.userId}`;
        } else {
          await tx`update usuarios set email = ${email} where id = ${input.userId}`;
        }
      }
    }

    if (input.role !== undefined && input.role !== m.role) {
      if (m.role === "admin" && m.activo) {
        const [{ n }] = await tx<{ n: number }[]>`
          select count(*)::int as n
          from members mm join usuarios uu on uu.id = mm.user_id
          where mm.household_id = ${input.householdId} and mm.role = 'admin'
            and uu.activo and mm.user_id <> ${input.userId}
            and (${input.actorEsSuperadmin} or not uu.es_superadmin)`;
        if (n === 0) {
          throw new ErrorCuenta("El hogar debe tener al menos un administrador activo.");
        }
      }
      await tx`update members set role = ${input.role} where id = ${m.id}`;
    }
  });

  const cambios = [
    input.nombre !== undefined ? "nombre" : "",
    input.email !== undefined ? "correo" : "",
    input.role !== undefined ? `rol→${input.role}` : "",
  ].filter(Boolean);

  await registrarEvento({
    accion: "editar_miembro",
    actorUserId: input.actorUserId,
    householdId: input.householdId,
    objetivoUserId: input.userId,
    detalle: cambios.join(", "),
  });
}

// Para el super-admin: manda el enlace de nueva contraseña a un miembro.
export async function enviarResetAMiembro(
  householdId: string,
  userId: string,
  actorEsSuperadmin: boolean,
  actorUserId: string
): Promise<void> {
  const [fila] = await getSql()<
    { email: string | null; activo: boolean; es_superadmin: boolean }[]
  >`
    select u.email, u.activo, u.es_superadmin
    from members m join usuarios u on u.id = m.user_id
    where m.household_id = ${householdId} and m.user_id = ${userId}`;

  if (!fila) throw new ErrorCuenta("Esa persona no es de ese hogar.");
  if (fila.es_superadmin && !actorEsSuperadmin) {
    throw new ErrorCuenta("No puedes modificar al super-admin.");
  }
  if (!fila.email) throw new ErrorCuenta("Esa persona no tiene correo registrado.");
  if (!fila.activo) throw new ErrorCuenta("La cuenta está desactivada: reactívala primero.");

  await solicitarReset(fila.email);

  await registrarEvento({
    accion: "enviar_restablecer",
    actorUserId,
    householdId,
    objetivo: fila.email,
  });
}
