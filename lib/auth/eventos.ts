import { getSql, usaPostgres } from "@/lib/db";

// Registro de acciones administrativas (quién hizo qué y cuándo). Escribe
// nombres además de ids para que el registro se entienda aunque después se
// borre la cuenta o el hogar. Nunca tira: auditar no debe romper la acción.

export type Accion =
  | "crear_hogar"
  | "archivar_hogar"
  | "restaurar_hogar"
  | "eliminar_hogar"
  | "invitar"
  | "reenviar_invitacion"
  | "cancelar_invitacion"
  | "aceptar_invitacion"
  | "quitar_miembro"
  | "reactivar_miembro"
  | "editar_miembro"
  | "enviar_restablecer"
  | "contrasena_restablecida"
  | "contrasena_cambiada";

export async function registrarEvento(evento: {
  accion: Accion;
  actorUserId?: string | null;
  householdId?: string | null;
  objetivo?: string;
  // Si el objetivo es una cuenta: se guarda "Nombre (correo)" en vez del id.
  objetivoUserId?: string;
  detalle?: string;
}): Promise<void> {
  if (!usaPostgres()) return;

  try {
    const sql = getSql();

    const [actor] = evento.actorUserId
      ? await sql<{ nombre: string; email: string | null }[]>`
          select nombre, email from usuarios where id = ${evento.actorUserId}`
      : [];
    const [hogar] = evento.householdId
      ? await sql<{ name: string }[]>`select name from households where id = ${evento.householdId}`
      : [];

    let objetivo = evento.objetivo ?? "";

    if (evento.objetivoUserId) {
      const [o] = await sql<{ nombre: string; email: string | null }[]>`
        select nombre, email from usuarios where id = ${evento.objetivoUserId}`;
      if (o) objetivo = o.nombre ? `${o.nombre} (${o.email ?? "no email"})` : (o.email ?? "");
    }

    await sql`
      insert into eventos_admin
        (actor_user_id, actor_nombre, household_id, household_name, accion, objetivo, detalle)
      values
        (${evento.actorUserId ?? null}, ${actor?.nombre || actor?.email || ""},
         ${evento.householdId ?? null}, ${hogar?.name ?? ""},
         ${evento.accion}, ${objetivo}, ${evento.detalle ?? ""})`;
  } catch (error) {
    console.error("Could not record the audit event:", error);
  }
}

export type EventoAdmin = {
  id: number;
  at: string;
  actor: string;
  hogar: string;
  accion: string;
  objetivo: string;
  detalle: string;
};

export async function listarEventos(limite = 100): Promise<EventoAdmin[]> {
  const filas = await getSql()<
    {
      id: string;
      at: Date;
      actor_nombre: string;
      household_name: string;
      accion: string;
      objetivo: string;
      detalle: string;
    }[]
  >`
    select id, at, actor_nombre, household_name, accion, objetivo, detalle
    from eventos_admin order by at desc, id desc limit ${limite}`;

  return filas.map((f) => ({
    id: Number(f.id),
    at: f.at.toISOString(),
    actor: f.actor_nombre,
    hogar: f.household_name,
    accion: f.accion,
    objetivo: f.objetivo,
    detalle: f.detalle,
  }));
}
