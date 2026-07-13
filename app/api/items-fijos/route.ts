import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import type { ItemFijo } from "@/lib/items-fijos-store";
import { validarItemFijo } from "@/lib/validar-item-fijo";

const SHEET_NAME = "ItemsFijos";
const ITEMS_RANGE = `${SHEET_NAME}!A:F`;

const MOVIMIENTOS_SHEET = "Movimientos";
const MOVIMIENTOS_RANGE = `${MOVIMIENTOS_SHEET}!A:M`;

const MESES_GENERADOS_SHEET = "MesesGenerados";

function buildItemFijo(row: string[]): ItemFijo {
  return {
    id: row[0] ?? "",
    label: row[1] ?? "",
    tipo: row[2] === "ingreso" ? "ingreso" : "gasto",
    monto: Number(row[3]) || 0,
    categoria: row[4] ?? "",
    activo: (row[5] ?? "").trim().toLowerCase() !== "false",
  };
}

function getPeriodoActual() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return {
    periodo: `${hoy.getFullYear()}-${mes}`,
    anio: String(hoy.getFullYear()),
    mes,
  };
}

async function periodoActualYaFueGenerado(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string,
  periodo: string
) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${MESES_GENERADOS_SHEET}!A:A`,
  });

  const rows = response.data.values ?? [];

  return rows
    .slice(1)
    .some((row) => (row[0] ?? "").trim() === periodo);
}

async function getMovimientosSheetId(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string
) {
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
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string,
  rowNumbers: number[]
) {
  if (rowNumbers.length === 0) {
    return;
  }

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
    requestBody: {
      requests,
    },
  });
}

async function sincronizarMovimientoMesActual(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string,
  item: ItemFijo
) {
  const { periodo, anio, mes } = getPeriodoActual();

  const yaGenerado = await periodoActualYaFueGenerado(
    sheets,
    sheetId,
    periodo
  );

  // Si el mes todavía no fue abierto, la ruta de movimientos generará
  // todos los ítems fijos activos cuando se abra el dashboard.
  if (!yaGenerado) {
    return;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: MOVIMIENTOS_RANGE,
  });

  const rows = response.data.values ?? [];

  const coincidencias = rows
    .slice(1)
    .map((row, index) => ({
      row,
      rowNumber: index + 2,
    }))
    .filter(({ row }) => {
      const origen = (row[3] ?? "").trim();
      const movimientoMes = (row[7] ?? "").trim();
      const movimientoAnio = (row[8] ?? "").trim();
      const itemFijoId = (row[12] ?? "").trim();

      return (
        origen === "fijo" &&
        movimientoMes === mes &&
        movimientoAnio === anio &&
        itemFijoId === item.id
      );
    });

  if (!item.activo) {
    await eliminarFilasMovimiento(
      sheets,
      sheetId,
      coincidencias.map((coincidencia) => coincidencia.rowNumber)
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
  ];

  if (coincidencias.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [movimientoValues],
      },
    });

    return;
  }

  const primeraCoincidencia = coincidencias[0];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${MOVIMIENTOS_SHEET}!A${primeraCoincidencia.rowNumber}:M${primeraCoincidencia.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [movimientoValues],
    },
  });

  // Si por alguna razón existían duplicados, conserva uno y elimina el resto.
  await eliminarFilasMovimiento(
    sheets,
    sheetId,
    coincidencias.slice(1).map((coincidencia) => coincidencia.rowNumber)
  );
}

async function eliminarMovimientoMesActualDeItem(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetId: string,
  itemFijoId: string
) {
  const { anio, mes } = getPeriodoActual();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: MOVIMIENTOS_RANGE,
  });

  const rows = response.data.values ?? [];

  const rowNumbers = rows
    .slice(1)
    .map((row, index) => ({
      row,
      rowNumber: index + 2,
    }))
    .filter(({ row }) => {
      return (
        (row[3] ?? "").trim() === "fijo" &&
        (row[7] ?? "").trim() === mes &&
        (row[8] ?? "").trim() === anio &&
        (row[12] ?? "").trim() === itemFijoId
      );
    })
    .map(({ rowNumber }) => rowNumber);

  await eliminarFilasMovimiento(sheets, sheetId, rowNumbers);
}

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: ITEMS_RANGE,
    });

    const rows = response.data.values ?? [];

    if (rows.length <= 1) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const items: ItemFijo[] = rows
      .slice(1)
      .map((row) => buildItemFijo(row));

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error obteniendo ítems fijos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudieron obtener los ítems fijos.",
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

    const body = await req.json();
    const validacion = validarItemFijo(body);

    if (!validacion.ok) {
      return NextResponse.json(
        {
          success: false,
          message: validacion.errores.join(" "),
        },
        { status: 400 }
      );
    }

    const item: ItemFijo = {
      id: crypto.randomUUID(),
      ...validacion.data,
    };

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: ITEMS_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          item.id,
          item.label,
          item.tipo,
          item.monto,
          item.categoria,
          String(item.activo),
        ]],
      },
    });

    await sincronizarMovimientoMesActual(sheets, sheetId, item);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error guardando ítem fijo:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo guardar el ítem fijo.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Falta el id del ítem fijo.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validacion = validarItemFijo(body);

    if (!validacion.ok) {
      return NextResponse.json(
        {
          success: false,
          message: validacion.errores.join(" "),
        },
        { status: 400 }
      );
    }

    const item: ItemFijo = {
      id,
      ...validacion.data,
    };

    const sheets = await getSheetsClient();

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = valuesResponse.data.values ?? [];
    const dataRows = rows.slice(1);

    const dataIndex = dataRows.findIndex(
      (row) => (row[0] ?? "").trim() === id
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Ítem fijo no encontrado.",
        },
        { status: 404 }
      );
    }

    const sheetRowNumber = dataIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${sheetRowNumber}:F${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          item.id,
          item.label,
          item.tipo,
          item.monto,
          item.categoria,
          String(item.activo),
        ]],
      },
    });

    await sincronizarMovimientoMesActual(sheets, sheetId, item);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error actualizando ítem fijo:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo actualizar el ítem fijo.",
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

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Falta el id del ítem fijo.",
        },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = valuesResponse.data.values ?? [];
    const dataRows = rows.slice(1);

    const dataIndex = dataRows.findIndex(
      (row) => (row[0] ?? "").trim() === id
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Ítem fijo no encontrado.",
        },
        { status: 404 }
      );
    }

    // Borra solamente el movimiento del mes actual asociado al ítem.
    // Los meses anteriores permanecen intactos.
    await eliminarMovimientoMesActualDeItem(sheets, sheetId, id);

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
      message: "Ítem fijo eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando ítem fijo:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo eliminar el ítem fijo.",
      },
      { status: 500 }
    );
  }
}
