import { getSheetsClient } from "@/lib/google-sheets";
import type { ItemFijo } from "@/lib/items-fijos-store";

const ITEMS_FIJOS_SHEET = "ItemsFijos";
const ITEMS_FIJOS_RANGE = `${ITEMS_FIJOS_SHEET}!A:G`;

const MOVIMIENTOS_SHEET = "Movimientos";
const MOVIMIENTOS_RANGE = `${MOVIMIENTOS_SHEET}!A:O`;

type SheetsClient = Awaited<ReturnType<typeof getSheetsClient>>;

export function getPeriodoActual() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return {
    periodo: `${hoy.getFullYear()}-${mes}`,
    anio: String(hoy.getFullYear()),
    mes,
  };
}

export function buildItemFijo(row: string[]): ItemFijo {
  return {
    id: row[0] ?? "",
    label: row[1] ?? "",
    tipo: row[2] === "ingreso" ? "ingreso" : "gasto",
    monto: Number(row[3]) || 0,
    categoria: row[4] ?? "",
    activo: (row[5] ?? "").trim().toLowerCase() !== "false",
    usuarioId: row[6] ?? "",
  };
}

async function getMovimientosSheetId(sheets: SheetsClient, sheetId: string) {
  const spreadsheetResponse = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties",
  });

  const targetSheet = spreadsheetResponse.data.sheets?.find(
    (sheet) => sheet.properties?.title === MOVIMIENTOS_SHEET
  );

  const numericId = targetSheet?.properties?.sheetId;

  if (numericId === undefined) {
    throw new Error(`No se encontró la hoja ${MOVIMIENTOS_SHEET}`);
  }

  return numericId;
}

async function eliminarFilasMovimiento(
  sheets: SheetsClient,
  sheetId: string,
  rowNumbers: number[]
) {
  if (rowNumbers.length === 0) return;

  const movimientosSheetId = await getMovimientosSheetId(sheets, sheetId);

  const requests = [...rowNumbers]
    .sort((a, b) => b - a)
    .map((rowNumber) => ({
      deleteDimension: {
        range: {
          sheetId: movimientosSheetId,
          dimension: "ROWS" as const,
          startIndex: rowNumber - 1,
          endIndex: rowNumber,
        },
      },
    }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests },
  });
}

// Filtra también por usuarioId — evita que un ítem fijo de un usuario
// pudiera, en teoría, emparejarse con el movimiento de otro.
async function buscarCoincidenciasDelMes(
  sheets: SheetsClient,
  sheetId: string,
  itemFijoId: string,
  usuarioId: string,
  mes: string,
  anio: string
) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: MOVIMIENTOS_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => {
      const origen = (row[3] ?? "").trim();
      const movimientoMes = (row[7] ?? "").trim();
      const movimientoAnio = (row[8] ?? "").trim();
      const movimientoItemFijoId = (row[12] ?? "").trim();
      const movimientoUsuarioId = (row[14] ?? "").trim();

      return (
        origen === "fijo" &&
        movimientoMes === mes &&
        movimientoAnio === anio &&
        movimientoItemFijoId === itemFijoId &&
        movimientoUsuarioId === usuarioId
      );
    });
}

/**
 * Sincroniza UN ítem fijo con su movimiento del mes actual. Idempotente:
 * llamarla varias veces para el mismo ítem en el mismo mes nunca crea
 * duplicados — actualiza la fila existente si ya hay una.
 *
 * A propósito NO depende de MesesGenerados. Se puede (y se debe) llamar
 * inmediatamente cada vez que un ítem fijo se crea, edita, activa o
 * desactiva, sin esperar a que el mes haya sido "abierto" por el
 * dashboard.
 */
export async function sincronizarMovimientoFijo(
  sheets: SheetsClient,
  sheetId: string,
  item: ItemFijo
) {
  const { periodo, anio, mes } = getPeriodoActual();

  const coincidencias = await buscarCoincidenciasDelMes(
    sheets,
    sheetId,
    item.id,
    item.usuarioId,
    mes,
    anio
  );

  if (!item.activo) {
    await eliminarFilasMovimiento(
      sheets,
      sheetId,
      coincidencias.map((c) => c.rowNumber)
    );
    return;
  }

  const movimientoValues = [
    coincidencias[0]?.row[0] || crypto.randomUUID(),
    `${periodo}-01`,
    item.tipo,
    "fijo",
    String(item.monto),
    item.categoria,
    item.label,
    mes,
    anio,
    "",
    "",
    "",
    item.id,
    "",
    item.usuarioId,
  ];

  if (coincidencias.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
      valueInputOption: "RAW",
      requestBody: { values: [movimientoValues] },
    });
    return;
  }

  const primeraCoincidencia = coincidencias[0];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${MOVIMIENTOS_SHEET}!A${primeraCoincidencia.rowNumber}:O${primeraCoincidencia.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [movimientoValues] },
  });

  // Si por alguna razón existían duplicados de antes, conserva uno y
  // elimina el resto.
  await eliminarFilasMovimiento(
    sheets,
    sheetId,
    coincidencias.slice(1).map((c) => c.rowNumber)
  );
}

export async function eliminarMovimientoMesActualDeItem(
  sheets: SheetsClient,
  sheetId: string,
  itemFijoId: string,
  usuarioId: string
) {
  const { anio, mes } = getPeriodoActual();

  const coincidencias = await buscarCoincidenciasDelMes(
    sheets,
    sheetId,
    itemFijoId,
    usuarioId,
    mes,
    anio
  );

  await eliminarFilasMovimiento(
    sheets,
    sheetId,
    coincidencias.map((c) => c.rowNumber)
  );
}

/**
 * Recorre TODOS los ítems fijos activos DE UN USUARIO y sincroniza cada
 * uno con su movimiento del mes actual. Se usa solo al abrir un mes por
 * primera vez para ese usuario (ver MesesGenerados en
 * app/api/movimientos/route.ts) — cubre los ítems que ya existían antes
 * de que empezara el mes y que por lo tanto nunca dispararon su propio
 * POST/PUT durante este período.
 *
 * Es seguro llamarla aunque algunos ítems ya tengan su movimiento
 * sincronizado por su propio CRUD — sincronizarMovimientoFijo es
 * idempotente, así que no genera duplicados.
 */
export async function sincronizarTodosLosActivos(
  sheets: SheetsClient,
  sheetId: string,
  usuarioId: string
) {
  const itemsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: ITEMS_FIJOS_RANGE,
  });

  const itemsRows = itemsResponse.data.values ?? [];
  const itemsFijos: ItemFijo[] = itemsRows.slice(1).map((row) => buildItemFijo(row));
  const activos = itemsFijos.filter(
    (item) => item.activo && item.usuarioId === usuarioId
  );

  for (const item of activos) {
    await sincronizarMovimientoFijo(sheets, sheetId, item);
  }
}
