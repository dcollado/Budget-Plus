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
  // Gasto fijo/comprometido (alquiler, suscripciones): el presupuesto se
  // hereda mes a mes en vez de arrancar en 0, y la UI lo marca aparte de
  // lo discrecional.
  fixed: boolean;
  // Día del mes en que se paga (1-31), solo para fijas. null = sin fecha.
  dueDay: number | null;
};

export type Budget = {
  id: string;
  householdId: string;
  categoryId: string;
  month: string; // YYYY-MM
  plannedAmountCents: number;
  // Fecha exacta de pago (YYYY-MM-DD), para los ítems variables del mes.
  // "" = sin fecha. Las fijas usan Category.dueDay en su lugar.
  dueDate: string;
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
