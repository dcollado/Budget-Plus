import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSql, usaPostgres } from "@/lib/db";
import { getUsuarioId } from "@/lib/current-user";

export type Rol = "admin" | "member";

export type Acceso = {
  usuarioId: string;
  esSuperadmin: boolean;
  // null = el usuario todavía no pertenece a ningún hogar.
  householdId: string | null;
  memberId: string | null;
  rol: Rol | null;
  hogarArchivado: boolean;
};

type FilaAcceso = {
  es_superadmin: boolean;
  household_id: string | null;
  member_id: string | null;
  role: Rol | null;
  archivado_en: Date | null;
};

// Lee rol y hogar en cada request (no del token) para que quitar a alguien
// o cambiarle el rol tenga efecto de inmediato. Solo con DATA_BACKEND=postgres;
// con la hoja no hay roles y todo el que inició sesión es del hogar original.
export async function obtenerAcceso(usuarioId: string): Promise<Acceso | null> {
  if (!usaPostgres()) {
    return {
      usuarioId,
      esSuperadmin: false,
      householdId: null,
      memberId: null,
      rol: null,
      hogarArchivado: false,
    };
  }

  const [fila] = await getSql()<FilaAcceso[]>`
    select u.es_superadmin,
           m.household_id,
           m.id as member_id,
           m.role,
           h.archivado_en
    from usuarios u
    left join members m on m.user_id = u.id
    left join households h on h.id = m.household_id
    where u.id = ${usuarioId} and u.activo`;

  if (!fila) return null;

  return {
    usuarioId,
    esSuperadmin: fila.es_superadmin,
    householdId: fila.household_id,
    memberId: fila.member_id,
    rol: fila.role,
    hogarArchivado: fila.archivado_en !== null && !fila.es_superadmin,
  };
}

export type Resultado =
  | { ok: true; acceso: Acceso }
  | { ok: false; response: NextResponse };

function denegar(status: 401 | 403, message: string): Resultado {
  return { ok: false, response: NextResponse.json({ success: false, message }, { status }) };
}

async function cargar(req: NextRequest): Promise<Resultado> {
  const usuarioId = getUsuarioId(req);
  if (!usuarioId) return denegar(401, "No autorizado.");

  const acceso = await obtenerAcceso(usuarioId);
  if (!acceso) return denegar(401, "No autorizado.");

  return { ok: true, acceso };
}

// Solo el super-admin (dueño de la plataforma): crear hogares y sus admins.
export async function requerirSuperadmin(req: NextRequest): Promise<Resultado> {
  const r = await cargar(req);
  if (!r.ok) return r;
  if (!r.acceso.esSuperadmin) return denegar(403, "No tienes permiso para esto.");
  return r;
}

// Admin de su hogar: invitar y quitar miembros. Devuelve el hogar del admin,
// nunca uno que venga del cliente.
export async function requerirAdminHogar(req: NextRequest): Promise<Resultado> {
  const r = await cargar(req);
  if (!r.ok) return r;
  if (r.acceso.rol !== "admin" || !r.acceso.householdId) {
    return denegar(403, "Solo un administrador del hogar puede hacer esto.");
  }
  return r;
}
