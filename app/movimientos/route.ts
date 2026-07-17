import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { getUsuarioId } from "@/lib/current-user";
import type { Movimiento } from "@/lib/movimientos-store";
import { validarMovimiento } from "@/lib/validar-movimiento";
import type { ItemFijo } from "@/lib/items-fijos-store";

const SHEET_NAME = "Movimientos";
const SHEET_ITEMS_FIJOS = "ItemsFijos";
const SHEET_MESES_GENERADOS = "MesesGenerados";

// Columnas de Movimientos:
// A id
// B fecha
// C tipo
// D origen
// E monto
// F categoria
// G descripcion
// H mes
// I anio
// J numeroFactura
// K ruc
// L notas
// M usuarioId
const MOVIMIENTOS_RANGE = `${SHEET_NAME}!A:M`;

function buildMovimiento(row: string[]): Movimiento {
  return {
    id: row[0] ?? "",
    fecha: row[1] ?? "",
    tipo: row[2] === "ingreso" ? "ingreso" : "gasto",
    origen:
      row[3] === "fijo" ||
      row[3] === "factura" ||
      row[3] === "deuda"
        ? row[3]
        : "variable",
    monto: row[4] ?? "",
    categoria: row[5] ?? "",
    descripcion: row[6] ?? "",
    mes: row[7] ?? "",
    anio: row[8] ?? "",
    numeroFactura: row[9] ?? "",
    ruc: row[10] ?? "",
    notas: row[11] ?? "",
    usuarioId: row[12] ?? "",
  };
}

function buildItemFijo(row: string[]): ItemFijo {
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

function getMesAnioFromFecha(fecha: string) {
  if (!fecha) {
    return { mes: "", anio: "" };
  }

  const parts = fecha.split("-");

  if (parts.length !== 3) {
    return { mes: "", anio: "" };
  }

  return {
    anio: parts[0],
    mes: parts[1],
  };
}

function getPeriodoActual(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return `${hoy.getFullYear()}-${mes}`;
}

/**
 * Si el período solicitado es el mes actual y todavía no fue generado
 * para este usuario, crea los movimientos correspondientes a sus ítems
 * fijos activos.
 */
async function asegurarMesGenerado(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string,
  periodo: string,
  usuarioId: string
) {
  if (periodo !== getPeriodoActual()) {
    return;
  }

  const mesesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_MESES_GENERADOS}!A:C`,
  });

  const mesesRows = mesesResponse.data.values ?? [];

  const yaGenerado = mesesRows
    .slice(1)
    .some(
      (row) =>
        (row[0] ?? "").trim() === periodo &&
        (row[2] ?? "").trim() === usuarioId
    );

  if (yaGenerado) {
    return;
  }

  const itemsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_ITEMS_FIJOS}!A:G`,
  });

  const itemsRows = itemsResponse.data.values ?? [];

  const itemsFijos: ItemFijo[] = itemsRows
    .slice(1)
    .map((row) => buildItemFijo(row))
    .filter((item) => item.usuarioId === usuarioId);

  const activos = itemsFijos.filter((item) => item.activo);

  if (activos.length > 0) {
    const [anio, mes] = periodo.split("-");
    const fecha = `${periodo}-01`;

    const filas = activos.map((item) => [
      crypto.randomUUID(),
      fecha,
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
      usuarioId,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: filas,
      },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_MESES_GENERADOS}!A:C`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[periodo, new Date().toISOString(), usuarioId]],
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const periodo = req.nextUrl.searchParams.get("periodo")?.trim();
    const sheets = await getSheetsClient();

    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      await asegurarMesGenerado(
        sheets,
        sheetId,
        periodo,
        usuarioId
      );
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
    });

    const rows = response.data.values ?? [];

    if (rows.length <= 1) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    let movimientos: Movimiento[] = rows
      .slice(1)
      .map((row) => buildMovimiento(row))
      .filter((movimiento) => movimiento.usuarioId === usuarioId);

    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      const [anio, mes] = periodo.split("-");

      movimientos = movimientos.filter(
        (movimiento) =>
          movimiento.mes === mes &&
          movimiento.anio === anio
      );
    }

    return NextResponse.json({
      success: true,
      data: movimientos,
    });
  } catch (error) {
    console.error("Error obteniendo movimientos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudieron obtener los movimientos.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validacion = validarMovimiento(body);

    if (!validacion.ok) {
      return NextResponse.json(
        {
          success: false,
          message: validacion.errores.join(" "),
        },
        { status: 400 }
      );
    }

    const {
      fecha,
      tipo,
      monto,
      categoria,
      descripcion,
      notas,
    } = validacion.data;

    const { mes, anio } = getMesAnioFromFecha(fecha);

    const origenRaw = String(
      (body as Record<string, unknown>)?.origen ?? "variable"
    ).trim();

    const origen =
      origenRaw === "fijo" ||
      origenRaw === "factura" ||
      origenRaw === "deuda"
        ? origenRaw
        : "variable";

    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      fecha,
      tipo,
      origen,
      monto,
      categoria,
      descripcion,
      mes,
      anio,
      numeroFactura: "",
      ruc: "",
      notas,
      usuarioId,
    };

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          movimiento.id,
          movimiento.fecha,
          movimiento.tipo,
          movimiento.origen,
          movimiento.monto,
          movimiento.categoria,
          movimiento.descripcion,
          movimiento.mes,
          movimiento.anio,
          movimiento.numeroFactura ?? "",
          movimiento.ruc ?? "",
          movimiento.notas ?? "",
          movimiento.usuarioId,
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      data: movimiento,
    });
  } catch (error) {
    console.error("Error guardando movimiento:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo guardar el movimiento.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Falta el id del movimiento.",
        },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:M`,
    });

    const rows = valuesResponse.data.values ?? [];

    if (rows.length <= 1) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontraron movimientos.",
        },
        { status: 404 }
      );
    }

    const dataRows = rows.slice(1);

    const dataIndex = dataRows.findIndex(
      (row) =>
        (row[0] ?? "").trim() === id &&
        (row[12] ?? "").trim() === usuarioId
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Movimiento no encontrado.",
        },
        { status: 404 }
      );
    }

    const sheetRowNumber = dataIndex + 2;

    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "sheets.properties",
    });

    const targetSheet = spreadsheetResponse.data.sheets?.find(
      (sheet) => sheet.properties?.title === SHEET_NAME
    );

    const sheetNumericId = targetSheet?.properties?.sheetId;

    if (sheetNumericId === undefined) {
      throw new Error(`No se encontró la hoja ${SHEET_NAME}`);
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

    return NextResponse.json({
      success: true,
      message: "Movimiento eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando movimiento:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo eliminar el movimiento.",
      },
      { status: 500 }
    );
  }
}