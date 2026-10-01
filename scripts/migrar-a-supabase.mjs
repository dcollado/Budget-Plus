// Copia todo el spreadsheet (GOOGLE_SHEET_ID) a Postgres (DATABASE_URL).
// Solo LEE la hoja. En la base, vacía las tablas y las vuelve a llenar en
// una sola transacción, así que se puede correr las veces que haga falta.
//
//   node --env-file=.env.local scripts/migrar-a-supabase.mjs
//
// Al final compara cantidades de filas y sumas de montos hoja vs. base.

import { google } from "googleapis";
import postgres from "postgres";

const RANGOS = {
  usuarios: "Usuarios!A:E",
  households: "Households!A:B",
  members: "Members!A:E",
  accounts: "Accounts!A:G",
  cuentas: "Cuentas!A:D",
  categories: "Categories!A:I",
  budgets: "Budgets!A:F",
  transactions: "Transactions!A:O",
};

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

// Una sola lectura para todas las hojas (la cuota es por pedido).
const { data } = await sheets.spreadsheets.values.batchGet({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  ranges: Object.values(RANGOS),
});
const hoja = {};
Object.keys(RANGOS).forEach((nombre, i) => {
  hoja[nombre] = (data.valueRanges[i].values ?? [])
    .slice(1)
    .filter((fila) => (fila[0] ?? "").trim() !== "");
});

const txt = (v) => (v ?? "").trim();
const bool = (v) => txt(v).toLowerCase() === "true";
const num = (v) => {
  const n = Number(txt(v));
  return Number.isFinite(n) ? Math.round(n) : 0;
};
const avisos = [];

// "" o un id que no existe → null (con aviso si no estaba vacío).
function ref(valor, existentes, que) {
  const id = txt(valor);
  if (!id) return null;
  if (existentes.has(id)) return id;
  avisos.push(`${que}: "${id}" no existe, queda vacío`);
  return null;
}
const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(v)) ? txt(v) : null);

const usuarios = hoja.usuarios.map((f) => ({
  id: txt(f[0]),
  nombre: txt(f[1]),
  usuario: txt(f[2]),
  password_hash: txt(f[3]),
  activo: txt(f[4]).toLowerCase() !== "false",
}));
const households = hoja.households.map((f) => ({ id: txt(f[0]), name: txt(f[1]) }));
const idsHogar = new Set(households.map((h) => h.id));
const idsUsuario = new Set(usuarios.map((u) => u.id));

const members = hoja.members
  .filter((f) => {
    const ok = idsHogar.has(txt(f[1])) && idsUsuario.has(txt(f[2]));
    if (!ok) avisos.push(`member ${txt(f[0])} sin hogar o usuario válido, se omite`);
    return ok;
  })
  .map((f) => ({
    id: txt(f[0]),
    household_id: txt(f[1]),
    user_id: txt(f[2]),
    display_name: txt(f[3]),
    role: txt(f[4]) || "member",
  }));
const idsMember = new Set(members.map((m) => m.id));

const accounts = hoja.accounts.map((f) => ({
  id: txt(f[0]),
  household_id: txt(f[1]),
  name: txt(f[2]),
  type: ["cash", "bank", "card", "loan"].includes(txt(f[3])) ? txt(f[3]) : "cash",
  owner_member_id: ref(f[4], idsMember, `account ${txt(f[0])} dueño`),
  opening_balance_cents: num(f[5]),
  archived: bool(f[6]),
}));
const idsAccount = new Set(accounts.map((a) => a.id));

const cuentas = hoja.cuentas.map((f) => ({
  id: txt(f[0]),
  household_id: txt(f[1]),
  name: txt(f[2]),
  archived: bool(f[3]),
}));
const idsCuenta = new Set(cuentas.map((c) => c.id));

const categories = hoja.categories.map((f) => {
  const dia = Number(txt(f[6]));
  return {
    id: txt(f[0]),
    household_id: txt(f[1]),
    name: txt(f[2]),
    kind: txt(f[3]) === "income" ? "income" : "expense",
    archived: bool(f[4]),
    fixed: bool(f[5]),
    due_day: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
    owner_member_id: ref(f[7], idsMember, `categoría ${txt(f[2])} dueño`),
    cuenta_id: ref(f[8], idsCuenta, `categoría ${txt(f[2])} cuenta`),
  };
});
const idsCategoria = new Set(categories.map((c) => c.id));

// Un monto por categoría y mes: si la hoja tiene repetidos, gana el último
// (igual que upsertBudget, que actualiza la primera fila que encuentra...
// se avisa para revisarlo).
const porClave = new Map();
for (const f of hoja.budgets) {
  if (!idsCategoria.has(txt(f[2]))) {
    avisos.push(`budget ${txt(f[0])} de una categoría que no existe, se omite`);
    continue;
  }
  const clave = `${txt(f[2])}|${txt(f[3])}`;
  if (porClave.has(clave)) avisos.push(`budget repetido ${clave}, queda el último`);
  porClave.set(clave, {
    id: txt(f[0]),
    household_id: txt(f[1]),
    category_id: txt(f[2]),
    month: txt(f[3]),
    planned_amount_cents: num(f[4]),
    due_date: fecha(f[5]),
  });
}
const budgets = [...porClave.values()];

const transactions = hoja.transactions.map((f) => ({
  id: txt(f[0]),
  household_id: txt(f[1]),
  account_id: ref(f[2], idsAccount, `transacción ${txt(f[0])} cuenta`),
  transfer_account_id: ref(f[3], idsAccount, `transacción ${txt(f[0])} cuenta destino`),
  category_id: ref(f[4], idsCategoria, `transacción ${txt(f[0])} categoría`),
  type: ["expense", "income", "transfer"].includes(txt(f[5])) ? txt(f[5]) : "expense",
  amount_cents: Math.abs(num(f[6])),
  date: fecha(f[7]) ?? "1970-01-01",
  payee: txt(f[8]),
  note: txt(f[9]),
  created_by_member_id: ref(f[10], idsMember, `transacción ${txt(f[0])} creador`),
  owner_member_id: ref(f[11], idsMember, `transacción ${txt(f[0])} dueño`),
  source: ["manual", "import", "chat", "qr"].includes(txt(f[12])) ? txt(f[12]) : "manual",
  external_id: txt(f[13]),
  created_at: txt(f[14]) || new Date().toISOString(),
}));

const filas = { usuarios, households, members, accounts, cuentas, categories, budgets, transactions };

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

await sql.begin(async (tx) => {
  await tx`truncate usuarios, households, members, accounts, cuentas, categories, budgets, transactions cascade`;
  // En orden, para que las referencias ya existan.
  for (const [tabla, lista] of Object.entries(filas)) {
    for (let i = 0; i < lista.length; i += 500) {
      await tx`insert into ${tx(tabla)} ${tx(lista.slice(i, i + 500))}`;
    }
  }
});

// ---------- Verificación ----------
let todoBien = true;
console.log("\nTabla          Hoja  Base");
for (const [tabla, lista] of Object.entries(filas)) {
  const [{ n }] = await sql`select count(*)::int as n from ${sql(tabla)}`;
  const ok = n === lista.length;
  todoBien &&= ok;
  console.log(`${tabla.padEnd(14)} ${String(hoja[tabla].length).padStart(4)}  ${String(n).padStart(4)}${ok ? "" : "  ← distinto"}`);
}

const sumaHoja = budgets.reduce((t, b) => t + b.planned_amount_cents, 0);
const [{ s }] = await sql`select coalesce(sum(planned_amount_cents), 0)::bigint as s from budgets`;
console.log(`\nSuma de montos (budgets): hoja ${sumaHoja / 100}  base ${Number(s) / 100}`);
todoBien &&= Number(s) === sumaHoja;

if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}):`);
  for (const a of avisos) console.log(" - " + a);
}
console.log(todoBien ? "\nOK: todo copiado." : "\nHAY DIFERENCIAS, revisar.");
await sql.end();
