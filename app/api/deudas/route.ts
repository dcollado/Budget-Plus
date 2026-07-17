import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { getUsuarioId } from "@/lib/current-user";
import type { Deuda } from "@/lib/deudas";
import { DEUDAS_SHEET, DEUDAS_RANGE, buildDeuda, deudaToRow } from "@/lib/deudas-sheet";

const SHEET_NAME = DEUDAS_SHEET;
const RANGE = DEUDAS_RANGE;

export async function GET(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: RANGE,
    });

    const rows = response.data.values ?? [];

    if (rows.length <= 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const dataRows = rows.slice(1);
    const deudas: Deuda[] = dataRows
      .map((row) => buildDeuda(row))
      .filter((deuda) => deuda.usuarioId === usuarioId);

    return NextResponse.json({ success: true, data: deudas });
  } catch (error) {
    console.error("Error obteniendo deudas:", error);

    return NextResponse.json(
      { success: false, message: "No se pudieron obtener las deudas." },
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

    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Falta el id de la deuda." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Deuda;

    if (!body || body.id !== id) {
      return NextResponse.json(
        { success: false, message: "El id del cuerpo no coincide con el de la URL." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(body.pagoMensual) || body.pagoMensual <= 0) {
      return NextResponse.json(
        { success: false, message: "El pago mensual debe ser mayor que cero." },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: RANGE,
    });

    const rows = valuesResponse.data.values ?? [];

    if (rows.length <= 1) {
      return NextResponse.json(
        { success: false, message: "No se encontraron deudas." },
        { status: 404 }
      );
    }

    const dataRows = rows.slice(1);
    // Busca por id Y por usuarioId — no se puede editar una deuda de otro
    // usuario ni adivinando el id.
    const dataIndex = dataRows.findIndex(
      (row) =>
        (row[0] ?? "").trim() === id && (row[22] ?? "").trim() === usuarioId
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Deuda no encontrada." },
        { status: 404 }
      );
    }

    const sheetRowNumber = dataIndex + 2;

    // El usuarioId lo pone el servidor, nunca el cliente.
    const deudaActualizada: Deuda = { ...body, usuarioId };

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${sheetRowNumber}:Y${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [deudaToRow(deudaActualizada)],
      },
    });

    return NextResponse.json({ success: true, data: deudaActualizada });
  } catch (error) {
    console.error("Error actualizando deuda:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo actualizar la deuda." },
      { status: 500 }
    );
  }
}
