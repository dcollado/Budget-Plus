// Mismas funciones que backend-sheets.ts, contra Postgres (Supabase).
// La app sigue usando "" para "sin dueño / sin cuenta / sin fecha"; acá se
// traduce a NULL al escribir y de vuelta a "" al leer.

import { getSql } from "@/lib/db";
import { primerColorLibre } from "./colores";
import { mesSiguiente } from "./formato";
import type {
  Account,
  Budget,
  Category,
  Cuenta,
  Household,
  Member,
  Proyecto,
  ProyectoAporteMes,
  ProyectoItem,
  Transaction,
} from "./schema";

// Columnas explícitas (no select *): no se arrastra lo que la app no usa y
// una columna nueva no cambia lo que viaja por la red sin querer.
const COLS_MEMBER = ["id", "household_id", "user_id", "display_name", "role", "color"];
const COLS_ACCOUNT = ["id", "household_id", "name", "type", "owner_member_id", "opening_balance_cents", "archived"];
const COLS_CATEGORY = ["id", "household_id", "name", "kind", "archived", "fixed", "due_day", "owner_member_id", "cuenta_id", "es_ahorro", "quincenal", "due_day_2", "bisemanal_desde"];
const COLS_CUENTA = ["id", "household_id", "name", "archived"];
const COLS_BUDGET = ["id", "household_id", "category_id", "month", "planned_amount_cents", "due_date", "nota", "pagado"];
const COLS_TRANSACTION = ["id", "household_id", "account_id", "transfer_account_id", "category_id", "type", "amount_cents", "date", "payee", "note", "created_by_member_id", "owner_member_id", "source", "external_id", "created_at"];

const nulo = (v: string | undefined | null) => (v ? v : null);
const texto = (v: unknown) => (v == null ? "" : String(v));
// Las columnas date vuelven como Date; la app usa "YYYY-MM-DD".
const fecha = (v: unknown) =>
  v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

// ---------- Households ----------

export async function listHouseholds(): Promise<Household[]> {
  return getSql()<Household[]>`select id, name from households`;
}

export async function crearHousehold(name: string): Promise<Household> {
  const [h] = await getSql()<Household[]>`insert into households ${getSql()({ name })} returning id, name`;
  return h;
}

// ---------- Members ----------

type FilaMember = {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  role: string;
  color: number | null;
};
const aMember = (r: FilaMember): Member => ({
  id: r.id,
  householdId: r.household_id,
  userId: r.user_id,
  displayName: r.display_name,
  role: r.role,
  color: r.color ?? undefined,
});

export async function listMembers(householdId: string): Promise<Member[]> {
  const filas = await getSql()<FilaMember[]>`
    select ${getSql()(COLS_MEMBER)} from members where household_id = ${householdId}`;
  return filas.map(aMember);
}

export async function buscarMemberPorUserId(userId: string): Promise<Member | null> {
  const [fila] = await getSql()<FilaMember[]>`
    select ${getSql()(COLS_MEMBER)} from members where user_id = ${userId}`;
  return fila ? aMember(fila) : null;
}

export async function siguienteColor(householdId: string): Promise<number> {
  const usados = await getSql()<{ color: number }[]>`
    select color from members where household_id = ${householdId} and color is not null`;
  return primerColorLibre(usados.map((u) => u.color));
}

export async function crearMember(
  householdId: string,
  userId: string,
  displayName: string,
  role = "member"
): Promise<Member> {
  const sql = getSql();
  const [fila] = await sql<FilaMember[]>`
    insert into members (household_id, user_id, display_name, role, color)
    values (${householdId}, ${userId}, ${displayName}, ${role}, ${await siguienteColor(householdId)})
    returning ${getSql()(COLS_MEMBER)}`;
  return aMember(fila);
}

// ---------- Accounts ----------

type FilaAccount = {
  id: string;
  household_id: string;
  name: string;
  type: Account["type"];
  owner_member_id: string | null;
  opening_balance_cents: string | number;
  archived: boolean;
};
const aAccount = (r: FilaAccount): Account => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  type: r.type,
  ownerMemberId: texto(r.owner_member_id),
  openingBalanceCents: Number(r.opening_balance_cents),
  archived: r.archived,
});

export async function listAccounts(householdId: string): Promise<Account[]> {
  const filas = await getSql()<FilaAccount[]>`
    select ${getSql()(COLS_ACCOUNT)} from accounts where household_id = ${householdId} and not archived`;
  return filas.map(aAccount);
}

export async function crearAccount(input: Omit<Account, "id" | "archived">): Promise<Account> {
  const sql = getSql();
  const [fila] = await sql<FilaAccount[]>`
    insert into accounts ${sql({
      household_id: input.householdId,
      name: input.name,
      type: input.type,
      owner_member_id: nulo(input.ownerMemberId),
      opening_balance_cents: input.openingBalanceCents,
    })}
    returning ${getSql()(COLS_ACCOUNT)}`;
  return aAccount(fila);
}

// ---------- Categories ----------

type FilaCategory = {
  id: string;
  household_id: string;
  name: string;
  kind: Category["kind"];
  archived: boolean;
  fixed: boolean;
  due_day: number | null;
  quincenal: boolean | null;
  due_day_2: number | null;
  bisemanal_desde: unknown;
  owner_member_id: string | null;
  cuenta_id: string | null;
  es_ahorro: boolean;
};
const aCategory = (r: FilaCategory): Category => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  kind: r.kind,
  archived: r.archived,
  fixed: r.fixed,
  dueDay: r.due_day,
  quincenal: r.quincenal === true,
  dueDay2: r.due_day_2,
  bisemanalDesde: fecha(r.bisemanal_desde),
  ownerMemberId: texto(r.owner_member_id),
  cuentaId: texto(r.cuenta_id),
  ahorro: r.es_ahorro,
});

export async function listCategories(householdId: string): Promise<Category[]> {
  const filas = await getSql()<FilaCategory[]>`
    select ${getSql()(COLS_CATEGORY)} from categories where household_id = ${householdId} and not archived`;
  return filas.map(aCategory);
}

export async function crearCategory(
  input: Omit<
    Category,
    "id" | "archived" | "dueDay" | "quincenal" | "dueDay2" | "ownerMemberId" | "cuentaId" | "ahorro"
  > & {
    dueDay?: number | null;
    quincenal?: boolean;
    dueDay2?: number | null;
    ownerMemberId?: string;
    bisemanalDesde?: string;
  }
): Promise<Category> {
  const sql = getSql();
  const [fila] = await sql<FilaCategory[]>`
    insert into categories ${sql({
      household_id: input.householdId,
      name: input.name,
      kind: input.kind,
      fixed: input.fixed,
      due_day: input.dueDay ?? null,
      quincenal: input.quincenal ?? false,
      due_day_2: input.quincenal ? (input.dueDay2 ?? null) : null,
      bisemanal_desde: nulo(input.bisemanalDesde),
      owner_member_id: nulo(input.ownerMemberId),
    })}
    returning ${getSql()(COLS_CATEGORY)}`;
  return aCategory(fila);
}

// "Borrar" = archivar, igual que en la hoja.
export async function archivarCategory(id: string, householdId: string): Promise<boolean> {
  const r = await getSql()`
    update categories set archived = true where id = ${id} and household_id = ${householdId}`;
  return r.count > 0;
}

export async function actualizarCategoria(
  id: string,
  householdId: string,
  cambios: {
    name?: string;
    ownerMemberId?: string;
    dueDay?: number | null;
    quincenal?: boolean;
    dueDay2?: number | null;
    bisemanalDesde?: string;
    cuentaId?: string;
    ahorro?: boolean;
  }
): Promise<boolean> {
  const sql = getSql();
  const set: Record<string, unknown> = {};
  if ("name" in cambios && cambios.name) set.name = cambios.name;
  if ("ownerMemberId" in cambios) set.owner_member_id = nulo(cambios.ownerMemberId);
  if ("dueDay" in cambios) set.due_day = cambios.dueDay ?? null;
  if ("quincenal" in cambios) set.quincenal = Boolean(cambios.quincenal);
  if ("dueDay2" in cambios) set.due_day_2 = cambios.dueDay2 ?? null;
  if ("bisemanalDesde" in cambios) set.bisemanal_desde = nulo(cambios.bisemanalDesde);
  if ("cuentaId" in cambios) set.cuenta_id = nulo(cambios.cuentaId);
  if ("ahorro" in cambios) set.es_ahorro = Boolean(cambios.ahorro);

  const r = Object.keys(set).length
    ? await sql`update categories set ${sql(set)} where id = ${id} and household_id = ${householdId}`
    : await sql`select 1 from categories where id = ${id} and household_id = ${householdId}`;
  return r.count > 0;
}

// ---------- Cuentas ----------

type FilaCuenta = { id: string; household_id: string; name: string; archived: boolean };
const aCuenta = (r: FilaCuenta): Cuenta => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  archived: r.archived,
});

export async function listCuentas(householdId: string): Promise<Cuenta[]> {
  const filas = await getSql()<FilaCuenta[]>`
    select ${getSql()(COLS_CUENTA)} from cuentas where household_id = ${householdId} and not archived`;
  return filas.map(aCuenta);
}

export async function crearCuenta(householdId: string, name: string): Promise<Cuenta> {
  const sql = getSql();
  const [fila] = await sql<FilaCuenta[]>`
    insert into cuentas ${sql({ household_id: householdId, name })} returning ${getSql()(COLS_CUENTA)}`;
  return aCuenta(fila);
}

export async function actualizarCuenta(
  id: string,
  householdId: string,
  cambios: { name?: string; archived?: boolean }
): Promise<boolean> {
  const sql = getSql();
  const set: Record<string, unknown> = {};
  if (cambios.name !== undefined) set.name = cambios.name;
  if (cambios.archived !== undefined) set.archived = cambios.archived;

  const r = Object.keys(set).length
    ? await sql`update cuentas set ${sql(set)} where id = ${id} and household_id = ${householdId}`
    : await sql`select 1 from cuentas where id = ${id} and household_id = ${householdId}`;
  return r.count > 0;
}

// ---------- Budgets ----------

type FilaBudget = {
  id: string;
  household_id: string;
  category_id: string;
  month: string;
  planned_amount_cents: string | number;
  due_date: Date | string | null;
  nota: string | null;
  pagado: boolean | null;
};
const aBudget = (r: FilaBudget): Budget => ({
  id: r.id,
  householdId: r.household_id,
  categoryId: r.category_id,
  month: r.month,
  plannedAmountCents: Number(r.planned_amount_cents),
  dueDate: fecha(r.due_date),
  nota: r.nota ?? "",
  pagado: r.pagado === true,
});

export async function listBudgets(householdId: string): Promise<Budget[]> {
  const filas = await getSql()<FilaBudget[]>`
    select ${getSql()(COLS_BUDGET)} from budgets where household_id = ${householdId}`;
  return filas.map(aBudget);
}

// Un monto por categoría y mes (lo garantiza la base con unique).
// dueDate: undefined = no tocar la fecha que ya tenga; "" = borrarla.
// extras.nota / extras.pagado: undefined = no tocar lo que ya tenga.
export async function upsertBudget(
  householdId: string,
  categoryId: string,
  month: string,
  plannedAmountCents: number,
  dueDate?: string,
  extras: { nota?: string; pagado?: boolean } = {}
): Promise<Budget> {
  const sql = getSql();
  const fechaNueva = dueDate === undefined ? null : nulo(dueDate);
  const [fila] = await sql<FilaBudget[]>`
    insert into budgets
      (household_id, category_id, month, planned_amount_cents, due_date, nota, pagado)
    values
      (${householdId}, ${categoryId}, ${month}, ${plannedAmountCents}, ${fechaNueva},
       ${extras.nota ?? ""}, ${extras.pagado ?? false})
    on conflict (category_id, month) do update set
      planned_amount_cents = excluded.planned_amount_cents,
      due_date = ${dueDate === undefined ? sql`budgets.due_date` : sql`excluded.due_date`},
      nota = ${extras.nota === undefined ? sql`budgets.nota` : sql`excluded.nota`},
      pagado = ${extras.pagado === undefined ? sql`budgets.pagado` : sql`excluded.pagado`}
    returning ${getSql()(COLS_BUDGET)}`;
  return aBudget(fila);
}

// ---------- Transactions ----------

type FilaTransaction = {
  id: string;
  household_id: string;
  account_id: string | null;
  transfer_account_id: string | null;
  category_id: string | null;
  type: Transaction["type"];
  amount_cents: string | number;
  date: Date | string;
  payee: string;
  note: string;
  created_by_member_id: string | null;
  owner_member_id: string | null;
  source: Transaction["source"];
  external_id: string;
  created_at: Date | string;
};
const aTransaction = (r: FilaTransaction): Transaction => ({
  id: r.id,
  householdId: r.household_id,
  accountId: texto(r.account_id),
  transferAccountId: texto(r.transfer_account_id),
  categoryId: texto(r.category_id),
  type: r.type,
  amountCents: Number(r.amount_cents),
  date: fecha(r.date),
  payee: r.payee,
  note: r.note,
  createdByMemberId: texto(r.created_by_member_id),
  ownerMemberId: texto(r.owner_member_id),
  source: r.source,
  externalId: r.external_id,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
});

// meses (YYYY-MM): solo las de ese rango, filtradas en la base (usa el
// índice household_id + date). Sin meses, todas.
export async function listTransactions(
  householdId: string,
  meses?: string[]
): Promise<Transaction[]> {
  const sql = getSql();
  const ordenados = meses?.length ? [...meses].sort() : null;
  const desde = ordenados ? `${ordenados[0]}-01` : null;
  const hasta = ordenados ? `${mesSiguiente(ordenados[ordenados.length - 1])}-01` : null;

  const filas = await sql<FilaTransaction[]>`
    select ${sql(COLS_TRANSACTION)} from transactions
    where household_id = ${householdId}
      ${desde ? sql`and date >= ${desde}::date and date < ${hasta}::date` : sql``}`;
  return filas.map(aTransaction);
}

export async function crearTransaction(
  input: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const sql = getSql();
  const [fila] = await sql<FilaTransaction[]>`
    insert into transactions ${sql({
      household_id: input.householdId,
      account_id: nulo(input.accountId),
      transfer_account_id: nulo(input.transferAccountId),
      category_id: nulo(input.categoryId),
      type: input.type,
      amount_cents: input.amountCents,
      date: input.date,
      payee: input.payee,
      note: input.note,
      created_by_member_id: nulo(input.createdByMemberId),
      owner_member_id: nulo(input.ownerMemberId),
      source: input.source,
      external_id: input.externalId,
    })}
    returning ${getSql()(COLS_TRANSACTION)}`;
  return aTransaction(fila);
}

export async function eliminarTransaction(id: string, householdId: string): Promise<boolean> {
  const r = await getSql()`delete from transactions where id = ${id} and household_id = ${householdId}`;
  return r.count > 0;
}

// ---------- Proyectos ----------

const COLS_PROYECTO = ["id", "household_id", "name", "target_date", "ahorrado_cents", "ahorro_desde", "archived"];
const COLS_PROYECTO_ITEM = [
  "id",
  "project_id",
  "household_id",
  "concepto",
  "monto_cents",
  "fecha",
  "pagado",
  "pagado_con_apartado",
  "pagado_por",
  "pagado_fecha",
  "gasto_categoria_id",
];

type FilaProyecto = {
  id: string;
  household_id: string;
  name: string;
  target_date: unknown;
  ahorrado_cents: string | number;
  ahorro_desde: string | null;
  archived: boolean;
};
const aProyecto = (r: FilaProyecto): Proyecto => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  targetDate: fecha(r.target_date),
  ahorradoCents: Number(r.ahorrado_cents),
  ahorroDesde: r.ahorro_desde ?? "",
  archived: r.archived,
});

type FilaProyectoItem = {
  id: string;
  project_id: string;
  household_id: string;
  concepto: string;
  monto_cents: string | number;
  fecha: unknown;
  pagado: boolean;
  pagado_con_apartado: boolean;
  pagado_por: string | null;
  pagado_fecha: unknown;
  gasto_categoria_id: string | null;
};
const aProyectoItem = (r: FilaProyectoItem): ProyectoItem => ({
  id: r.id,
  projectId: r.project_id,
  householdId: r.household_id,
  concepto: r.concepto,
  montoCents: Number(r.monto_cents),
  fecha: fecha(r.fecha),
  pagado: r.pagado,
  pagadoConApartado: r.pagado_con_apartado,
  pagadoPor: r.pagado_por ?? "",
  pagadoFecha: fecha(r.pagado_fecha),
  gastoCategoriaId: r.gasto_categoria_id ?? "",
});

export async function listProyectos(householdId: string): Promise<Proyecto[]> {
  const filas = await getSql()<FilaProyecto[]>`
    select ${getSql()(COLS_PROYECTO)} from proyectos
    where household_id = ${householdId} and not archived
    order by target_date, created_at`;
  return filas.map(aProyecto);
}

export async function listProyectosArchivados(householdId: string): Promise<Proyecto[]> {
  const filas = await getSql()<FilaProyecto[]>`
    select ${getSql()(COLS_PROYECTO)} from proyectos
    where household_id = ${householdId} and archived
    order by target_date, created_at`;
  return filas.map(aProyecto);
}

export async function crearProyecto(
  input: Omit<Proyecto, "id" | "archived" | "ahorradoCents" | "ahorroDesde"> & {
    ahorradoCents?: number;
    ahorroDesde?: string;
  }
): Promise<Proyecto> {
  const sql = getSql();
  const [fila] = await sql<FilaProyecto[]>`
    insert into proyectos ${sql({
      household_id: input.householdId,
      name: input.name,
      target_date: input.targetDate,
      ahorrado_cents: input.ahorradoCents ?? 0,
      ahorro_desde: nulo(input.ahorroDesde),
    })}
    returning ${getSql()(COLS_PROYECTO)}`;
  return aProyecto(fila);
}

// Solo cambia los campos que vienen; siempre dentro del hogar.
export async function actualizarProyecto(
  householdId: string,
  id: string,
  cambios: Partial<Pick<Proyecto, "name" | "targetDate" | "ahorradoCents" | "ahorroDesde" | "archived">>
): Promise<Proyecto | null> {
  const sql = getSql();
  const set: Record<string, unknown> = {};
  if (cambios.name !== undefined) set.name = cambios.name;
  if (cambios.targetDate !== undefined) set.target_date = cambios.targetDate;
  if (cambios.ahorradoCents !== undefined) set.ahorrado_cents = cambios.ahorradoCents;
  if (cambios.ahorroDesde !== undefined) set.ahorro_desde = nulo(cambios.ahorroDesde);
  if (cambios.archived !== undefined) set.archived = cambios.archived;

  if (Object.keys(set).length === 0) return null;

  const [fila] = await sql<FilaProyecto[]>`
    update proyectos set ${sql(set)}
    where id = ${id} and household_id = ${householdId}
    returning ${getSql()(COLS_PROYECTO)}`;
  return fila ? aProyecto(fila) : null;
}

export async function listProyectoItems(householdId: string): Promise<ProyectoItem[]> {
  const filas = await getSql()<FilaProyectoItem[]>`
    select ${getSql()(COLS_PROYECTO_ITEM)} from proyecto_items
    where household_id = ${householdId}
    order by fecha nulls last, concepto`;
  return filas.map(aProyectoItem);
}

export async function crearProyectoItem(
  input: Omit<ProyectoItem, "id" | "pagado" | "pagadoConApartado" | "pagadoPor" | "pagadoFecha" | "gastoCategoriaId">
): Promise<ProyectoItem> {
  const sql = getSql();
  const [fila] = await sql<FilaProyectoItem[]>`
    insert into proyecto_items ${sql({
      project_id: input.projectId,
      household_id: input.householdId,
      concepto: input.concepto,
      monto_cents: input.montoCents,
      fecha: nulo(input.fecha),
    })}
    returning ${getSql()(COLS_PROYECTO_ITEM)}`;
  return aProyectoItem(fila);
}

export async function actualizarProyectoItem(
  householdId: string,
  id: string,
  cambios: Partial<
    Pick<
      ProyectoItem,
      "concepto" | "montoCents" | "fecha" | "pagado" | "pagadoConApartado" | "pagadoPor" | "pagadoFecha" | "gastoCategoriaId"
    >
  >
): Promise<ProyectoItem | null> {
  const sql = getSql();
  const set: Record<string, unknown> = {};
  if (cambios.concepto !== undefined) set.concepto = cambios.concepto;
  if (cambios.montoCents !== undefined) set.monto_cents = cambios.montoCents;
  if (cambios.fecha !== undefined) set.fecha = nulo(cambios.fecha);
  if (cambios.pagado !== undefined) set.pagado = cambios.pagado;
  if (cambios.pagadoConApartado !== undefined) set.pagado_con_apartado = cambios.pagadoConApartado;
  if (cambios.pagadoPor !== undefined) set.pagado_por = nulo(cambios.pagadoPor);
  if (cambios.pagadoFecha !== undefined) set.pagado_fecha = nulo(cambios.pagadoFecha);
  if (cambios.gastoCategoriaId !== undefined) set.gasto_categoria_id = nulo(cambios.gastoCategoriaId);

  if (Object.keys(set).length === 0) return null;

  const [fila] = await sql<FilaProyectoItem[]>`
    update proyecto_items set ${sql(set)}
    where id = ${id} and household_id = ${householdId}
    returning ${getSql()(COLS_PROYECTO_ITEM)}`;
  return fila ? aProyectoItem(fila) : null;
}

export async function eliminarProyectoItem(householdId: string, id: string): Promise<boolean> {
  const filas = await getSql()<{ id: string }[]>`
    delete from proyecto_items where id = ${id} and household_id = ${householdId} returning id`;
  return filas.length > 0;
}

// Borra el proyecto y, por la cascada, todos sus ítems.
export async function eliminarProyecto(householdId: string, id: string): Promise<boolean> {
  const filas = await getSql()<{ id: string }[]>`
    delete from proyectos where id = ${id} and household_id = ${householdId} returning id`;
  return filas.length > 0;
}

export async function listProyectoAportesMes(householdId: string): Promise<ProyectoAporteMes[]> {
  const filas = await getSql()<
    {
      project_id: string;
      member_id: string;
      household_id: string;
      month: string;
      monto_cents: string | number;
      hecho: boolean;
    }[]
  >`select project_id, member_id, household_id, month, monto_cents, hecho from proyecto_aportes_mes
    where household_id = ${householdId}`;
  return filas.map((f) => ({
    projectId: f.project_id,
    memberId: f.member_id,
    householdId: f.household_id,
    month: f.month,
    montoCents: Number(f.monto_cents),
    hecho: f.hecho,
  }));
}

// Crea o cambia lo que una persona aparta en un mes (no toca "hecho"); con 0 lo borra.
export async function guardarProyectoAporteMes(
  input: Omit<ProyectoAporteMes, "hecho"> & { quitar?: boolean }
): Promise<void> {
  const sql = getSql();

  // quitar = volver a la sugerencia (se borra la fila). Un 0 sí se guarda: es "este mes no aporto".
  if (input.quitar) {
    await sql`delete from proyecto_aportes_mes
      where project_id = ${input.projectId} and member_id = ${input.memberId}
        and month = ${input.month} and household_id = ${input.householdId}`;
    return;
  }

  await sql`
    insert into proyecto_aportes_mes (project_id, member_id, household_id, month, monto_cents)
    values (${input.projectId}, ${input.memberId}, ${input.householdId}, ${input.month}, ${input.montoCents})
    on conflict (project_id, member_id, month)
    do update set monto_cents = excluded.monto_cents, updated_at = now()`;
}

// Marca o desmarca un aporte como hecho. false si no existe ese aporte.
export async function marcarProyectoAporteHecho(
  householdId: string,
  projectId: string,
  memberId: string,
  month: string,
  hecho: boolean
): Promise<boolean> {
  const filas = await getSql()<{ month: string }[]>`
    update proyecto_aportes_mes set hecho = ${hecho}, updated_at = now()
    where project_id = ${projectId} and member_id = ${memberId} and month = ${month}
      and household_id = ${householdId}
    returning month`;
  return filas.length > 0;
}
