// Mismas funciones que backend-sheets.ts, contra Postgres (Supabase).
// La app sigue usando "" para "sin dueño / sin cuenta / sin fecha"; acá se
// traduce a NULL al escribir y de vuelta a "" al leer.

import { getSql } from "@/lib/db";
import type {
  Account,
  Budget,
  Category,
  Cuenta,
  Household,
  Member,
  Transaction,
} from "./schema";

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

type FilaMember = { id: string; household_id: string; user_id: string; display_name: string; role: string };
const aMember = (r: FilaMember): Member => ({
  id: r.id,
  householdId: r.household_id,
  userId: r.user_id,
  displayName: r.display_name,
  role: r.role,
});

export async function listMembers(householdId: string): Promise<Member[]> {
  const filas = await getSql()<FilaMember[]>`select * from members where household_id = ${householdId}`;
  return filas.map(aMember);
}

export async function buscarMemberPorUserId(userId: string): Promise<Member | null> {
  const [fila] = await getSql()<FilaMember[]>`select * from members where user_id = ${userId}`;
  return fila ? aMember(fila) : null;
}

export async function crearMember(
  householdId: string,
  userId: string,
  displayName: string,
  role = "member"
): Promise<Member> {
  const sql = getSql();
  const [fila] = await sql<FilaMember[]>`
    insert into members ${sql({ household_id: householdId, user_id: userId, display_name: displayName, role })}
    returning *`;
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
    select * from accounts where household_id = ${householdId} and not archived`;
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
    returning *`;
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
  owner_member_id: string | null;
  cuenta_id: string | null;
};
const aCategory = (r: FilaCategory): Category => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  kind: r.kind,
  archived: r.archived,
  fixed: r.fixed,
  dueDay: r.due_day,
  ownerMemberId: texto(r.owner_member_id),
  cuentaId: texto(r.cuenta_id),
});

export async function listCategories(householdId: string): Promise<Category[]> {
  const filas = await getSql()<FilaCategory[]>`
    select * from categories where household_id = ${householdId} and not archived`;
  return filas.map(aCategory);
}

export async function crearCategory(
  input: Omit<Category, "id" | "archived" | "dueDay" | "ownerMemberId" | "cuentaId"> & {
    dueDay?: number | null;
    ownerMemberId?: string;
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
      owner_member_id: nulo(input.ownerMemberId),
    })}
    returning *`;
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
  cambios: { dueDay?: number | null; cuentaId?: string }
): Promise<boolean> {
  const sql = getSql();
  const set: Record<string, unknown> = {};
  if ("dueDay" in cambios) set.due_day = cambios.dueDay ?? null;
  if ("cuentaId" in cambios) set.cuenta_id = nulo(cambios.cuentaId);

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
    select * from cuentas where household_id = ${householdId} and not archived`;
  return filas.map(aCuenta);
}

export async function crearCuenta(householdId: string, name: string): Promise<Cuenta> {
  const sql = getSql();
  const [fila] = await sql<FilaCuenta[]>`
    insert into cuentas ${sql({ household_id: householdId, name })} returning *`;
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
};
const aBudget = (r: FilaBudget): Budget => ({
  id: r.id,
  householdId: r.household_id,
  categoryId: r.category_id,
  month: r.month,
  plannedAmountCents: Number(r.planned_amount_cents),
  dueDate: fecha(r.due_date),
});

export async function listBudgets(householdId: string): Promise<Budget[]> {
  const filas = await getSql()<FilaBudget[]>`select * from budgets where household_id = ${householdId}`;
  return filas.map(aBudget);
}

// Un monto por categoría y mes (lo garantiza la base con unique).
// dueDate: undefined = no tocar la fecha que ya tenga; "" = borrarla.
export async function upsertBudget(
  householdId: string,
  categoryId: string,
  month: string,
  plannedAmountCents: number,
  dueDate?: string
): Promise<Budget> {
  const sql = getSql();
  const fechaNueva = dueDate === undefined ? null : nulo(dueDate);
  const [fila] = await sql<FilaBudget[]>`
    insert into budgets (household_id, category_id, month, planned_amount_cents, due_date)
    values (${householdId}, ${categoryId}, ${month}, ${plannedAmountCents}, ${fechaNueva})
    on conflict (category_id, month) do update set
      planned_amount_cents = excluded.planned_amount_cents,
      due_date = ${dueDate === undefined ? sql`budgets.due_date` : sql`excluded.due_date`}
    returning *`;
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

export async function listTransactions(householdId: string): Promise<Transaction[]> {
  const filas = await getSql()<FilaTransaction[]>`
    select * from transactions where household_id = ${householdId}`;
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
    returning *`;
  return aTransaction(fila);
}

export async function eliminarTransaction(id: string, householdId: string): Promise<boolean> {
  const r = await getSql()`delete from transactions where id = ${id} and household_id = ${householdId}`;
  return r.count > 0;
}
