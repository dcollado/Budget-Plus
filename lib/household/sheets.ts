import { randomUUID } from "crypto";
import { getSheetsClient } from "@/lib/google-sheets";
import type {
  Account,
  Budget,
  Category,
  Household,
  Member,
  Transaction,
} from "./schema";

// Nombres y rangos de las hojas. Si agregás una columna, agregala al
// final para no correr el índice de las demás (varias rutas van a
// referenciar columnas por posición, igual que en el resto del proyecto).

export const HOUSEHOLDS_SHEET = "Households";
export const HOUSEHOLDS_RANGE = `${HOUSEHOLDS_SHEET}!A:B`; // id, name

export const MEMBERS_SHEET = "Members";
export const MEMBERS_RANGE = `${MEMBERS_SHEET}!A:E`; // id, householdId, userId, displayName, role

export const ACCOUNTS_SHEET = "Accounts";
export const ACCOUNTS_RANGE = `${ACCOUNTS_SHEET}!A:G`; // id, householdId, name, type, ownerMemberId, openingBalanceCents, archived

export const CATEGORIES_SHEET = "Categories";
export const CATEGORIES_RANGE = `${CATEGORIES_SHEET}!A:F`; // id, householdId, name, kind, archived, fixed

export const BUDGETS_SHEET = "Budgets";
export const BUDGETS_RANGE = `${BUDGETS_SHEET}!A:E`; // id, householdId, categoryId, month, plannedAmountCents

export const TRANSACTIONS_SHEET = "Transactions";
export const TRANSACTIONS_RANGE = `${TRANSACTIONS_SHEET}!A:M`;
// id, householdId, accountId, transferAccountId, categoryId, type,
// amountCents, date, payee, note, createdByMemberId, ownerMemberId,
// source (externalId y createdAt se agregan al final en N:O)
export const TRANSACTIONS_FULL_RANGE = `${TRANSACTIONS_SHEET}!A:O`;

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
  }

  return sheetId;
}

function boolFrom(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function numFrom(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function readRows(range: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
  });

  const rows = response.data.values ?? [];
  // La primera fila es el encabezado.
  return rows.slice(1) as string[][];
}

async function appendRow(sheet: string, row: (string | number)[]) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: sheet,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

// ---------- Households ----------

function buildHousehold(row: string[]): Household {
  return { id: row[0] ?? "", name: row[1] ?? "" };
}

export async function listHouseholds(): Promise<Household[]> {
  return (await readRows(HOUSEHOLDS_RANGE)).map(buildHousehold);
}

export async function crearHousehold(name: string): Promise<Household> {
  const household: Household = { id: randomUUID(), name };
  await appendRow(HOUSEHOLDS_SHEET, [household.id, household.name]);
  return household;
}

// ---------- Members ----------

function buildMember(row: string[]): Member {
  return {
    id: row[0] ?? "",
    householdId: row[1] ?? "",
    userId: row[2] ?? "",
    displayName: row[3] ?? "",
    role: row[4] ?? "member",
  };
}

export async function listMembers(householdId: string): Promise<Member[]> {
  return (await readRows(MEMBERS_RANGE))
    .map(buildMember)
    .filter((m) => m.householdId === householdId);
}

export async function buscarMemberPorUserId(
  userId: string
): Promise<Member | null> {
  const member = (await readRows(MEMBERS_RANGE))
    .map(buildMember)
    .find((m) => m.userId === userId);

  return member ?? null;
}

export async function crearMember(
  householdId: string,
  userId: string,
  displayName: string,
  role = "member"
): Promise<Member> {
  const member: Member = {
    id: randomUUID(),
    householdId,
    userId,
    displayName,
    role,
  };

  await appendRow(MEMBERS_SHEET, [
    member.id,
    member.householdId,
    member.userId,
    member.displayName,
    member.role,
  ]);

  return member;
}

// ---------- Accounts ----------

function buildAccount(row: string[]): Account {
  return {
    id: row[0] ?? "",
    householdId: row[1] ?? "",
    name: row[2] ?? "",
    type: (row[3] as Account["type"]) || "cash",
    ownerMemberId: row[4] ?? "",
    openingBalanceCents: numFrom(row[5]),
    archived: boolFrom(row[6]),
  };
}

export async function listAccounts(householdId: string): Promise<Account[]> {
  return (await readRows(ACCOUNTS_RANGE))
    .map(buildAccount)
    .filter((a) => a.householdId === householdId && !a.archived);
}

export async function crearAccount(
  input: Omit<Account, "id" | "archived">
): Promise<Account> {
  const account: Account = { ...input, id: randomUUID(), archived: false };

  await appendRow(ACCOUNTS_SHEET, [
    account.id,
    account.householdId,
    account.name,
    account.type,
    account.ownerMemberId,
    account.openingBalanceCents,
    "false",
  ]);

  return account;
}

// ---------- Categories ----------

function buildCategory(row: string[]): Category {
  return {
    id: row[0] ?? "",
    householdId: row[1] ?? "",
    name: row[2] ?? "",
    kind: (row[3] as Category["kind"]) || "expense",
    archived: boolFrom(row[4]),
    fixed: boolFrom(row[5]),
  };
}

export async function listCategories(
  householdId: string
): Promise<Category[]> {
  return (await readRows(CATEGORIES_RANGE))
    .map(buildCategory)
    .filter((c) => c.householdId === householdId && !c.archived);
}

export async function crearCategory(
  input: Omit<Category, "id" | "archived">
): Promise<Category> {
  const category: Category = { ...input, id: randomUUID(), archived: false };

  await appendRow(CATEGORIES_SHEET, [
    category.id,
    category.householdId,
    category.name,
    category.kind,
    "false",
    category.fixed ? "true" : "false",
  ]);

  return category;
}

// "Borrar" una categoría = archivarla (no se elimina la fila). Así los
// Budgets y Transactions históricos que ya la referencian por id no
// quedan huérfanos ni rompen nada — listCategories ya filtra
// !archived, así que simplemente deja de aparecer en la UI.
export async function archivarCategory(
  id: string,
  householdId: string
): Promise<boolean> {
  const sheets = await getSheetsClient();
  const sheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: CATEGORIES_RANGE,
  });

  const rows = response.data.values ?? [];
  const dataRows = rows.slice(1);

  const dataIndex = dataRows.findIndex(
    (row) => (row[0] ?? "") === id && (row[1] ?? "") === householdId
  );

  if (dataIndex === -1) {
    return false;
  }

  const sheetRowNumber = dataIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${CATEGORIES_SHEET}!E${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [["true"]] },
  });

  return true;
}

// ---------- Budgets ----------

function buildBudget(row: string[]): Budget {
  return {
    id: row[0] ?? "",
    householdId: row[1] ?? "",
    categoryId: row[2] ?? "",
    month: row[3] ?? "",
    plannedAmountCents: numFrom(row[4]),
  };
}

export async function listBudgets(householdId: string): Promise<Budget[]> {
  return (await readRows(BUDGETS_RANGE))
    .map(buildBudget)
    .filter((b) => b.householdId === householdId);
}

// Crea o actualiza el monto planeado de una categoría para un mes. No hay
// un índice de fila estable para hacer un update parcial barato, así que
// lee todo, busca la fila (household+categoria+mes) y actualiza esa celda
// puntual si existe, o agrega una fila nueva si no.
export async function upsertBudget(
  householdId: string,
  categoryId: string,
  month: string,
  plannedAmountCents: number
): Promise<Budget> {
  const sheets = await getSheetsClient();
  const sheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: BUDGETS_RANGE,
  });

  const rows = response.data.values ?? [];
  const dataRows = rows.slice(1);

  const dataIndex = dataRows.findIndex(
    (row) =>
      (row[1] ?? "") === householdId &&
      (row[2] ?? "") === categoryId &&
      (row[3] ?? "") === month
  );

  if (dataIndex === -1) {
    const budget: Budget = {
      id: randomUUID(),
      householdId,
      categoryId,
      month,
      plannedAmountCents,
    };

    await appendRow(BUDGETS_SHEET, [
      budget.id,
      budget.householdId,
      budget.categoryId,
      budget.month,
      budget.plannedAmountCents,
    ]);

    return budget;
  }

  const sheetRowNumber = dataIndex + 2;
  const id = dataRows[dataIndex][0] ?? "";

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${BUDGETS_SHEET}!E${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[plannedAmountCents]] },
  });

  return { id, householdId, categoryId, month, plannedAmountCents };
}

// ---------- Transactions ----------

function buildTransaction(row: string[]): Transaction {
  return {
    id: row[0] ?? "",
    householdId: row[1] ?? "",
    accountId: row[2] ?? "",
    transferAccountId: row[3] ?? "",
    categoryId: row[4] ?? "",
    type: (row[5] as Transaction["type"]) || "expense",
    amountCents: numFrom(row[6]),
    date: row[7] ?? "",
    payee: row[8] ?? "",
    note: row[9] ?? "",
    createdByMemberId: row[10] ?? "",
    ownerMemberId: row[11] ?? "",
    source: (row[12] as Transaction["source"]) || "manual",
    externalId: row[13] ?? "",
    createdAt: row[14] ?? "",
  };
}

export async function listTransactions(
  householdId: string
): Promise<Transaction[]> {
  return (await readRows(TRANSACTIONS_FULL_RANGE))
    .map(buildTransaction)
    .filter((t) => t.householdId === householdId);
}

export async function crearTransaction(
  input: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const transaction: Transaction = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  await appendRow(TRANSACTIONS_SHEET, [
    transaction.id,
    transaction.householdId,
    transaction.accountId,
    transaction.transferAccountId,
    transaction.categoryId,
    transaction.type,
    transaction.amountCents,
    transaction.date,
    transaction.payee,
    transaction.note,
    transaction.createdByMemberId,
    transaction.ownerMemberId,
    transaction.source,
    transaction.externalId,
    transaction.createdAt,
  ]);

  return transaction;
}

// Borra por id Y por householdId — así nadie borra una transacción de
// otro hogar ni siquiera adivinando el id. Devuelve false si no la
// encontró (ya borrada, o no es de este hogar).
export async function eliminarTransaction(
  id: string,
  householdId: string
): Promise<boolean> {
  const sheets = await getSheetsClient();
  const sheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: TRANSACTIONS_FULL_RANGE,
  });

  const rows = response.data.values ?? [];
  const dataRows = rows.slice(1);

  const dataIndex = dataRows.findIndex(
    (row) =>
      (row[0] ?? "").trim() === id && (row[1] ?? "").trim() === householdId
  );

  if (dataIndex === -1) {
    return false;
  }

  const sheetRowNumber = dataIndex + 2;

  const spreadsheetResponse = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties",
  });

  const targetSheet = spreadsheetResponse.data.sheets?.find(
    (sheet) => sheet.properties?.title === TRANSACTIONS_SHEET
  );

  const sheetNumericId = targetSheet?.properties?.sheetId;

  if (sheetNumericId === undefined) {
    throw new Error(`No se encontró la hoja ${TRANSACTIONS_SHEET}`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetNumericId,
              dimension: "ROWS",
              startIndex: sheetRowNumber - 1,
              endIndex: sheetRowNumber,
            },
          },
        },
      ],
    },
  });

  return true;
}
