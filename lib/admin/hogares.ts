import { randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/password-hash";

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
  usaModulosLegacy: boolean;
  miembros: { userId: string; nombre: string; email: string | null; role: string; activo: boolean }[];
};

export async function listarHogares(): Promise<HogarResumen[]> {
  const sql = getSql();
  const hogares = await sql<{ id: string; name: string; usa_modulos_legacy: boolean }[]>`
    select id, name, usa_modulos_legacy from households order by name`;
  const miembros = await sql<
    { household_id: string; user_id: string; display_name: string; email: string | null; role: string; activo: boolean }[]
  >`
    select m.household_id, m.user_id, m.display_name, u.email, m.role, u.activo
    from members m join usuarios u on u.id = m.user_id
    order by m.role, m.display_name`;

  return hogares.map((h) => ({
    id: h.id,
    name: h.name,
    usaModulosLegacy: h.usa_modulos_legacy,
    miembros: miembros
      .filter((m) => m.household_id === h.id)
      .map((m) => ({
        userId: m.user_id,
        nombre: m.display_name,
        email: m.email,
        role: m.role,
        activo: m.activo,
      })),
  }));
}

export class ErrorAdmin extends Error {}

export async function crearHogarConAdmin(input: {
  nombreHogar: string;
  adminNombre: string;
  adminEmail: string;
}): Promise<{ householdId: string; usuario: string; passwordTemporal: string }> {
  const email = input.adminEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErrorAdmin("El correo no es válido.");
  }
  if (!input.nombreHogar.trim() || !input.adminNombre.trim()) {
    throw new ErrorAdmin("Falta el nombre del hogar o del administrador.");
  }

  const sql = getSql();

  const [existe] = await sql`
    select 1 from usuarios where lower(email) = ${email} or lower(usuario) = ${email}`;
  if (existe) {
    throw new ErrorAdmin("Ese correo ya tiene una cuenta.");
  }

  // Provisional hasta que existan las invitaciones por correo: se entrega
  // una vez al super-admin para que se la pase al administrador.
  const passwordTemporal = randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(passwordTemporal);
  const userId = randomUUID();

  const householdId = await sql.begin(async (tx) => {
    const [h] = await tx<{ id: string }[]>`
      insert into households (name) values (${input.nombreHogar.trim()}) returning id`;

    // El login busca por "usuario": usamos el correo.
    await tx`
      insert into usuarios (id, nombre, usuario, password_hash, activo, email)
      values (${userId}, ${input.adminNombre.trim()}, ${email}, ${passwordHash}, true, ${email})`;

    await tx`
      insert into members (household_id, user_id, display_name, role)
      values (${h.id}, ${userId}, ${input.adminNombre.trim()}, 'admin')`;

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

  return { householdId, usuario: email, passwordTemporal };
}
