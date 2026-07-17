import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { getUsuarioId } from "@/lib/current-user";
import { aplicarCompra } from "@/lib/deudas";
import { DEUDAS_SHEET, DEUDAS_RANGE, buildDeuda, deudaToRow } from "@/lib/deudas-sheet";
import { categoriasFactura } from "@/lib/facturas";
import type { Movimiento } from "@/lib/movimientos-store";

const MOVIMIENTOS_SHEET = "Movimientos";
const MOVIMIENTOS_RANGE = `${MOVIMIENTOS_SHEET}!A:P`;

function getMesAnioFromFecha(fecha: string) {
  const parts = fecha.split("-");
  if (parts.length !== 3) return { mes: "", anio: "" };
  return { anio: parts[0], mes: parts[1] };
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
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const deudaId = String((body as Record<string, unknown>)?.deudaId ?? "").trim();
    const montoRaw = String((body as Record<string, unknown>)?.monto ?? "").trim();
    const categoria = String((body as Record<string, unknown>)?.categoria ?? "").trim();
    const descripcion = String((body as Record<string, unknown>)?.descripcion ?? "").trim();
    const fechaRaw = String((body as Record<string, unknown>)?.fecha ?? "").trim();

    if (!deudaId) {
      return NextResponse.json(
        { success: false, message: "Falta la tarjeta con la que se hizo la compra." },
        { status: 400 }
      );
    }

    const monto = Number(montoRaw.replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { success: false, message: "El monto debe ser un número mayor que cero." },
        { status: 400 }
      );
    }

    if (!descripcion) {
      return NextResponse.json(
        { success: false, message: "La descripción es obligatoria." },
        { status: 400 }
      );
    }

    if (!categoria || !categoriasFactura.includes(categoria)) {
      return NextResponse.json(
        { success: false, message: "La categoría seleccionada no es válida." },
        { status: 400 }
      );
    }

    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
      ? fechaRaw
      : new Date().toISOString().slice(0, 10);

    const sheets = await getSheetsClient();

    // 1. Buscar la tarjeta (del usuario actual) y aumentar el saldo.
    const deudasResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: DEUDAS_RANGE,
    });

    const deudasRows = deudasResponse.data.values ?? [];
    const dataRows = deudasRows.slice(1);
    const dataIndex = dataRows.findIndex(
      (row) =>
        (row[0] ?? "").trim() === deudaId && (row[22] ?? "").trim() === usuarioId
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Tarjeta no encontrada." },
        { status: 404 }
      );
    }

    const deuda = buildDeuda(dataRows[dataIndex]);

    if (deuda.tipo !== "tarjeta") {
      return NextResponse.json(
        { success: false, message: "Solo se pueden registrar compras sobre una tarjeta de crédito." },
        { status: 400 }
      );
    }

    const deudaActualizada = aplicarCompra(deuda, monto);
    const sheetRowNumber = dataIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${DEUDAS_SHEET}!A${sheetRowNumber}:Y${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [deudaToRow(deudaActualizada)],
      },
    });

    // 2. Crear el movimiento de gasto asociado a la compra.
    const { mes, anio } = getMesAnioFromFecha(fecha);

    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      fecha,
      tipo: "gasto",
      origen: "tarjeta",
      monto: String(monto),
      categoria,
      descripcion,
      mes,
      anio,
      numeroFactura: "",
      ruc: "",
      notas: "",
      deudaId,
      usuarioId,
      metodoPago: "tarjeta",
    };

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
          "",
          movimiento.deudaId ?? "",
          movimiento.usuarioId,
          movimiento.metodoPago ?? "",
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      data: { movimiento, deuda: deudaActualizada },
    });
  } catch (error) {
    console.error("Error registrando compra con tarjeta:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo registrar la compra." },
      { status: 500 }
    );
  }
}
