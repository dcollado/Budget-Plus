import { getSql } from "@/lib/db";
import { registrarEvento } from "@/lib/auth/eventos";
import { crearInvitacion, ErrorCuenta, normalizarEmail } from "@/lib/auth/cuentas";

// Categorías de arranque de un hogar nuevo (genéricas: las de un hogar
// real tienen nombres propios). El admin las ajusta desde Configuración.
const CATEGORIAS_BASE = [
  { name: "Renta", kind: "expense", fixed: true },
  { name: "Luz y Agua", kind: "expense", fixed: true },
  { name: "Internet y Telefonía", kind: "expense", fixed: true },
  { name: "Ahorros", kind: "expense", fixed: true },
  { name: "Comida", kind: "expense", fixed: true },
  { name: "Transporte", kind: "expense", fixed: true },
  { name: "Salud", kind: "expense", fixed: true },
  { name: "Misceláneos", kind: "expense", fixed: false },
  { name: "Restaurantes", kind: "expense", fixed: false },
  { name: "Entretenimiento", kind: "expense", fixed: false },
  { name: "Ingreso Base", kind: "income", fixed: true },
  { name: "Ingreso Variable", kind: "income", fixed: false },
] as const;

const CUENTAS_BASE = [
  { name: "Efectivo", type: "cash" },
  { name: "Cuenta banco", type: "bank" },
] as const;

export type HogarResumen = {
  id: string;
  name: string;
  // ISO si está archivado (nadie entra, los datos se conservan).
  archivadoEn: string | null;
  // Tiene al super-admin adentro: no se puede archivar ni eliminar.
  tieneSuperadmin: boolean;
  miembros: { userId: string; nombre: string; email: string | null; role: string; activo: boolean }[];
  invitaciones: { id: string; email: string; role: string; venceEn: string }[];
};

// Sin argumento: todos los hogares (super-admin). Con id: solo ese.
// El super-admin no aparece en la lista a menos que quien mira también lo sea:
// los admins de hogar no deben ver ni tocar esa cuenta.
export async function listarHogares(
  soloHogarId?: string,
  opciones: { verSuperadmin: boolean } = { verSuperadmin: true }
): Promise<HogarResumen[]> {
  const sql = getSql();
  const hogares = await sql<
    { id: string; name: string; archivado_en: Date | null; tiene_superadmin: boolean }[]
  >`
    select h.id, h.name, h.archivado_en,
           exists (
             select 1 from members m join usuarios u on u.id = m.user_id
             where m.household_id = h.id and u.es_superadmin
           ) as tiene_superadmin
    from households h
    ${soloHogarId ? sql`where h.id = ${soloHogarId}` : sql``}
    order by h.archivado_en nulls first, h.name`;
  const miembros = await sql<
    { household_id: string; user_id: string; display_name: string; email: string | null; role: string; activo: boolean }[]
  >`
    select m.household_id, m.user_id, m.display_name, u.email, m.role, u.activo
    from members m join usuarios u on u.id = m.user_id
    where ${opciones.verSuperadmin ? sql`true` : sql`not u.es_superadmin`}
    order by m.role, m.display_name`;

  const invitaciones = await sql<
    { id: string; household_id: string; email: string; role: string; expires_at: Date }[]
  >`
    select id, household_id, email, role, expires_at from invitaciones
    where used_at is null and expires_at > now()
    order by created_at desc`;

  return hogares.map((h) => ({
    id: h.id,
    name: h.name,
    archivadoEn: h.archivado_en ? h.archivado_en.toISOString() : null,
    tieneSuperadmin: h.tiene_superadmin,
    miembros: miembros
      .filter((m) => m.household_id === h.id)
      .map((m) => ({
        userId: m.user_id,
        nombre: m.display_name,
        email: m.email,
        role: m.role,
        activo: m.activo,
      })),
    invitaciones: invitaciones
      .filter((i) => i.household_id === h.id)
      .map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        venceEn: i.expires_at.toISOString(),
      })),
  }));
}

export async function crearHogarConAdmin(input: {
  nombreHogar: string;
  adminEmail: string;
  invitedBy: string;
}): Promise<{ householdId: string; enlace: string }> {
  const nombre = input.nombreHogar.trim();
  if (!nombre) throw new ErrorCuenta("Falta el nombre del hogar.");

  // Validar antes de crear nada: si el correo ya tiene cuenta, no queda un
  // hogar vacío.
  const email = normalizarEmail(input.adminEmail);
  const sql = getSql();
  const [existe] = await sql`
    select 1 from usuarios where lower(email) = ${email} or lower(usuario) = ${email}`;
  if (existe) throw new ErrorCuenta("Ese correo ya tiene una cuenta.");

  const householdId = await sql.begin(async (tx) => {
    const [h] = await tx<{ id: string }[]>`
      insert into households (name) values (${nombre}) returning id`;

    for (const c of CATEGORIAS_BASE) {
      await tx`
        insert into categories (household_id, name, kind, fixed)
        values (${h.id}, ${c.name}, ${c.kind}, ${c.fixed})`;
    }
    for (const a of CUENTAS_BASE) {
      await tx`
        insert into accounts (household_id, name, type)
        values (${h.id}, ${a.name}, ${a.type})`;
    }

    return h.id;
  });

  await registrarEvento({
    accion: "crear_hogar",
    actorUserId: input.invitedBy,
    householdId,
    objetivo: email,
    detalle: nombre,
  });

  // La persona define su nombre y contraseña al aceptar la invitación.
  const { enlace } = await crearInvitacion({
    householdId,
    email,
    role: "admin",
    invitedBy: input.invitedBy,
  });

  return { householdId, enlace };
}

async function hogarParaCambio(householdId: string) {
  const [h] = await getSql()<
    { name: string; archivado_en: Date | null; tiene_superadmin: boolean }[]
  >`
    select h.name, h.archivado_en,
           exists (
             select 1 from members m join usuarios u on u.id = m.user_id
             where m.household_id = h.id and u.es_superadmin
           ) as tiene_superadmin
    from households h where h.id = ${householdId}`;

  if (!h) throw new ErrorCuenta("El hogar no existe.");
  if (h.tiene_superadmin) {
    throw new ErrorCuenta("Este hogar tiene al super-admin: no se puede archivar ni eliminar.");
  }
  return h;
}

// Archivar: nadie del hogar entra (las sesiones caen en segundos) y los
// datos se conservan. Es reversible.
export async function archivarHogar(householdId: string, actorUserId: string): Promise<void> {
  const h = await hogarParaCambio(householdId);
  if (h.archivado_en) throw new ErrorCuenta("El hogar ya está archivado.");

  await getSql()`update households set archivado_en = now() where id = ${householdId}`;
  await registrarEvento({ accion: "archivar_hogar", actorUserId, householdId, detalle: h.name });
}

export async function restaurarHogar(householdId: string, actorUserId: string): Promise<void> {
  const h = await hogarParaCambio(householdId);
  if (!h.archivado_en) throw new ErrorCuenta("El hogar no está archivado.");

  await getSql()`update households set archivado_en = null where id = ${householdId}`;
  await registrarEvento({ accion: "restaurar_hogar", actorUserId, householdId, detalle: h.name });
}

// Borrado definitivo: solo de un hogar ya archivado y escribiendo su nombre.
// Se llevan sus datos y las cuentas de sus miembros.
export async function eliminarHogar(
  householdId: string,
  confirmacion: string,
  actorUserId: string
): Promise<void> {
  const h = await hogarParaCambio(householdId);

  if (!h.archivado_en) {
    throw new ErrorCuenta("Primero archiva el hogar; solo uno archivado se puede eliminar.");
  }
  if (confirmacion.trim() !== h.name) {
    throw new ErrorCuenta("El nombre no coincide: no se eliminó nada.");
  }

  await getSql().begin(async (tx) => {
    const miembros = await tx<{ user_id: string }[]>`
      select user_id from members where household_id = ${householdId}`;

    // Las tablas del hogar caen en cascada (categorías, cuentas, presupuesto,
    // transacciones, invitaciones, miembros).
    await tx`delete from households where id = ${householdId}`;

    for (const m of miembros) {
      await tx`delete from usuarios where id = ${m.user_id} and not es_superadmin`;
    }
  });

  await registrarEvento({ accion: "eliminar_hogar", actorUserId, detalle: h.name });
}
