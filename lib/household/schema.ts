// Modelo de "household" (revamp de presupuesto) sobre Google Sheets.
//
// Cada tipo de fila vive en su propia hoja dentro del mismo spreadsheet
// (GOOGLE_SHEET_ID). El dinero siempre se guarda en centavos (entero) para
// evitar errores de redondeo con floats.

export type AccountType = "cash" | "bank" | "card" | "loan";
export type CategoryKind = "expense" | "income";
export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "manual" | "import" | "chat" | "qr";

export type Household = {
  id: string;
  name: string;
};

export type Member = {
  id: string;
  householdId: string;
  userId: string;
  displayName: string;
  role: string;
};

export type Account = {
  id: string;
  householdId: string;
  name: string;
  type: AccountType;
  // "" = cuenta conjunta (no pertenece a un solo miembro)
  ownerMemberId: string;
  openingBalanceCents: number;
  archived: boolean;
};

export type Category = {
  id: string;
  householdId: string;
  name: string;
  kind: CategoryKind;
  archived: boolean;
};

export type Transaction = {
  id: string;
  householdId: string;
  accountId: string;
  // solo si type === "transfer"
  transferAccountId: string;
  categoryId: string;
  type: TransactionType;
  // siempre positivo; el signo lo da `type`
  amountCents: number;
  date: string; // YYYY-MM-DD
  payee: string;
  note: string;
  createdByMemberId: string;
  // "" = gasto/ingreso conjunto
  ownerMemberId: string;
  source: TransactionSource;
  externalId: string;
  createdAt: string; // ISO
};
