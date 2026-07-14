import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import type { ItemFijo } from "@/lib/items-fijos-store";
import { validarItemFijo } from "@/lib/validar-item-fijo";
import {
  buildItemFijo,
  eliminarMovimientoMesActualDeItem,
  sincronizarMovimientoFijo,
} from "@/lib/sincronizar-items-fijos";

const SHEET_NAME = "ItemsFijos";
const ITEMS_RANGE = `${SHEET_NAME}!A:F`;

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

    const items: ItemFijo[] = rows.slice(1).map((row) => buildItemFijo(row));

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

    // Sincroniza de inmediato, sin depender de si el mes ya fue "abierto".
    await sincronizarMovimientoFijo(sheets, sheetId, item);

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

    const dataIndex = dataRows.findIndex((row) => (row[0] ?? "").trim() === id);

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

    // Cubre los 4 casos: creado→editado, activo→activo (monto/categoría
    // cambian), activo→inactivo (borra el movimiento) e inactivo→activo
    // (lo vuelve a crear). sincronizarMovimientoFijo decide según
    // item.activo, siempre de inmediato.
    await sincronizarMovimientoFijo(sheets, sheetId, item);

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

    const dataIndex = dataRows.findIndex((row) => (row[0] ?? "").trim() === id);

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
