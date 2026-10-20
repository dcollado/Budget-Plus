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
  // Índice en la paleta de colores del hogar (ver EtiquetaDueno). Ausente
  // con la hoja de Google: ahí se usa el color por inicial de siempre.
  color?: number;
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
  // Se paga dos veces al mes: dueDay es el primer día y dueDay2 el segundo
  // (31 = último día del mes). El monto del mes sigue siendo el total.
  quincenal: boolean;
  dueDay2: number | null;
  // De quién es el gasto (member id). "" = conjunto.
  ownerMemberId: string;
  // A qué cuenta va la plata de este fijo (Cuenta.id). "" = sin asignar.
  cuentaId: string;
  // Es plata que se aparta (ahorros, emergencias): el reporte la suma aparte.
  // Solo se guarda con Postgres; con la hoja siempre es false.
  ahorro: boolean;
};

// Destino de la plata: "Cuenta Chippu" (conjunta), "Caro", "Emergencias"...
// Es del hogar, no de una persona: cada uno asigna SUS fijos a las cuentas
// que quiera, y una cuenta conjunta aparece en el cuadro de los dos.
export type Cuenta = {
  id: string;
  householdId: string;
  name: string;
  archived: boolean;
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
  // Nota libre y marca de "ya se pagó / ya se hizo" (gastos extra del mes).
  nota: string;
  pagado: boolean;
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

// Un proyecto grande del hogar (viaje, remodelación…). Lo que se va a pagar
// son sus ítems; el objetivo es solo una referencia. Solo con Postgres.
export type Proyecto = {
  id: string;
  householdId: string;
  name: string;
  targetDate: string; // YYYY-MM-DD (fecha del viaje o del último pago)
  // Presupuesto objetivo de referencia; 0 = sin objetivo.
  objetivoCents: number;
  // Lo que ya se apartó para este proyecto.
  ahorradoCents: number;
  archived: boolean;
};

export type ProyectoItem = {
  id: string;
  projectId: string;
  householdId: string;
  concepto: string;
  montoCents: number;
  // YYYY-MM-DD; "" = sin fecha (se asume la del proyecto).
  fecha: string;
  pagado: boolean;
};

// Lo que una persona decidió apartar cada mes para un proyecto. Sin fila =
// no lo ha decidido (se usa la sugerencia). Solo con Postgres.
export type ProyectoAporte = {
  projectId: string;
  memberId: string;
  householdId: string;
  montoCents: number;
};
