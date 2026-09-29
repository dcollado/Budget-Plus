// Crea el hogar inicial: un household, un member por cada usuario de la
// hoja Usuarios, dos cuentas conjuntas de arranque y las categorías por
// defecto. Es idempotente: si ya hay un household o un member para un
// usuario, no los duplica.
//
// Requiere que ya existan (con solo la fila de encabezado) las hojas:
// Households, Members, Accounts, Categories, Transactions — ver
// docs/SPEC.md.
//
// Uso:
//   node --env-file=.env.local scripts/seed-hogar.mjs usuario1 usuario2
//
// (usuario1/usuario2 son los valores de la columna "usuario" en la hoja
// Usuarios — no la contraseña.)

import { randomUUID } from "node:crypto";
import { google } from "googleapis";

const HOGAR_NOMBRE = "Casa";

// fixed = comprometido/inamovible (renta, sueldo base): su presupuesto se
// hereda de un mes al otro en vez de arrancar en 0. Ver docs/SPEC.md.
const CATEGORIAS_DEFAULT = [
  { name: "Renta", kind: "expense", fixed: true },
  { name: "Luz y Agua", kind: "expense", fixed: true },
  { name: "Internet y Telefonía", kind: "expense", fixed: true },
  { name: "Ahorros", kind: "expense", fixed: true },
  { name: "Bancos", kind: "expense", fixed: true }, // cuotas de deuda + comisiones
  { name: "Misceláneos", kind: "expense", fixed: false },
  { name: "Cami", kind: "expense", fixed: false },
  { name: "Comida", kind: "expense", fixed: false },
  { name: "Transporte", kind: "expense", fixed: false },
  { name: "Restaurantes", kind: "expense", fixed: false },
  { name: "Salud", kind: "expense", fixed: false },
  { name: "Entretenimiento", kind: "expense", fixed: false },
  { name: "Ingreso Base David", kind: "income", fixed: true },
  { name: "Ingreso Base Caro", kind: "income", fixed: true },
  { name: "Ingreso Variable", kind: "income", fixed: false },
];

const CUENTAS_DEFAULT = [
  { name: "Efectivo", type: "cash" },
  { name: "Cuenta banco", type: "bank" },
];

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error(
      "Faltan GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY o GOOGLE_SHEET_ID.\n" +
        "Corré el script con: node --env-file=.env.local scripts/seed-hogar.mjs <usuario1> <usuario2>"
    );
    process.exit(1);
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function getRows(sheets, sheetId, range) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return (response.data.values ?? []).slice(1);
}

async function appendRow(sheets, sheetId, sheet, row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheet,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

async function main() {
  const [usuario1, usuario2] = process.argv.slice(2);

  if (!usuario1 || !usuario2) {
    console.error(
      'Uso: node --env-file=.env.local scripts/seed-hogar.mjs "usuario1" "usuario2"'
    );
    process.exit(1);
  }

  const { sheets, sheetId } = getSheetsClient();

  const usuariosRows = await getRows(sheets, sheetId, "Usuarios!A:E");
  const usuarios = usuariosRows.map((row) => ({
    id: row[0] ?? "",
    usuario: row[2] ?? "",
  }));

  const usersToLink = [usuario1, usuario2].map((usuario) => {
    const match = usuarios.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    );

    if (!match) {
      console.error(
        `No encontré ningún usuario "${usuario}" en la hoja Usuarios. Revisá el nombre exacto.`
      );
      process.exit(1);
    }

    return match;
  });

  // Household: reusa uno existente si ya hay, si no crea "Casa".
  const householdsRows = await getRows(sheets, sheetId, "Households!A:B");
  let householdId = householdsRows[0]?.[0];

  if (!householdId) {
    householdId = randomUUID();
    await appendRow(sheets, sheetId, "Households", [householdId, HOGAR_NOMBRE]);
    console.log(`Household creado: ${HOGAR_NOMBRE} (${householdId})`);
  } else {
    console.log(`Reutilizando household existente (${householdId})`);
  }

  // Members: uno por usuario, si no existe ya.
  const membersRows = await getRows(sheets, sheetId, "Members!A:E");
  const memberIdByUserId = new Map(
    membersRows.map((row) => [row[2], row[0]])
  );

  const memberIds = [];

  for (const user of usersToLink) {
    let memberId = memberIdByUserId.get(user.id);

    if (!memberId) {
      memberId = randomUUID();
      await appendRow(sheets, sheetId, "Members", [
        memberId,
        householdId,
        user.id,
        user.usuario,
        "member",
      ]);
      console.log(`Member creado para "${user.usuario}" (${memberId})`);
    } else {
      console.log(`"${user.usuario}" ya tenía member (${memberId})`);
    }

    memberIds.push(memberId);
  }

  // Cuentas conjuntas de arranque, si el household todavía no tiene ninguna.
  const accountsRows = await getRows(sheets, sheetId, "Accounts!A:G");
  const tieneCuentas = accountsRows.some((row) => row[1] === householdId);

  if (!tieneCuentas) {
    for (const cuenta of CUENTAS_DEFAULT) {
      await appendRow(sheets, sheetId, "Accounts", [
        randomUUID(),
        householdId,
        cuenta.name,
        cuenta.type,
        "", // ownerMemberId: "" = conjunta
        0, // openingBalanceCents
        "false", // archived
      ]);
    }
    console.log(`Cuentas creadas: ${CUENTAS_DEFAULT.map((c) => c.name).join(", ")}`);
  } else {
    console.log("El household ya tenía cuentas, no se crean nuevas.");
  }

  // Categorías por defecto, si el household todavía no tiene ninguna.
  const categoriesRows = await getRows(sheets, sheetId, "Categories!A:E");
  const tieneCategorias = categoriesRows.some((row) => row[1] === householdId);

  if (!tieneCategorias) {
    for (const categoria of CATEGORIAS_DEFAULT) {
      await appendRow(sheets, sheetId, "Categories", [
        randomUUID(),
        householdId,
        categoria.name,
        categoria.kind,
        "false",
        categoria.fixed ? "true" : "false",
      ]);
    }
    console.log(
      `Categorías creadas: ${CATEGORIAS_DEFAULT.map((c) => c.name).join(", ")}`
    );
  } else {
    console.log("El household ya tenía categorías, no se crean nuevas.");
  }

  console.log("\nListo.");
}

main().catch((error) => {
  console.error("Error corriendo el seed:", error);
  process.exit(1);
});
