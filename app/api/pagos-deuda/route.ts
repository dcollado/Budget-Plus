import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { aplicarPago } from "@/lib/deudas";
import { DEUDAS_SHEET, DEUDAS_RANGE, buildDeuda, deudaToRow } from "@/lib/deudas-sheet";
import type { Movimiento } from "@/lib/movimientos-store";

const MOVIMIENTOS_SHEET = "Movimientos";
const MOVIMIENTOS_RANGE = `${MOVIMIENTOS_SHEET}!A:N`;

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

    const body = await req.json();
    const deudaId = String((body as Record<string, unknown>)?.deudaId ?? "").trim();
    const montoRaw = String((body as Record<string, unknown>)?.monto ?? "").trim();
    const fechaRaw = String((body as Record<string, unknown>)?.fecha ?? "").trim();
    const descripcionRaw = String(
      (body as Record<string, unknown>)?.descripcion ?? ""
    ).trim();

    if (!deudaId) {
      return NextResponse.json(
        { success: false, message: "Falta la deuda a la que aplicar el pago." },
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

    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
      ? fechaRaw
      : new Date().toISOString().slice(0, 10);

    const sheets = await getSheetsClient();

    // 1. Buscar la deuda y aplicar el pago.
    const deudasResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: DEUDAS_RANGE,
    });

    const deudasRows = deudasResponse.data.values ?? [];
    const dataRows = deudasRows.slice(1);
    const dataIndex = dataRows.findIndex((row) => (row[0] ?? "").trim() === deudaId);

    if (dataIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Deuda no encontrada." },
        { status: 404 }
      );
    }

    const deuda = buildDeuda(dataRows[dataIndex]);
    const deudaActualizada = aplicarPago(deuda, monto);

    const sheetRowNumber = dataIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${DEUDAS_SHEET}!A${sheetRowNumber}:V${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [deudaToRow(deudaActualizada)],
      },
    });

    // 2. Crear el movimiento de gasto asociado.
    const { mes, anio } = getMesAnioFromFecha(fecha);

    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      fecha,
      tipo: "gasto",
      origen: "deuda",
      monto: String(monto),
      categoria: "Deuda",
      descripcion: descripcionRaw || `Pago: ${deuda.label}`,
      mes,
      anio,
      numeroFactura: "",
      ruc: "",
      notas: "",
      deudaId,
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
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      data: { movimiento, deuda: deudaActualizada },
    });
  } catch (error) {
    console.error("Error registrando pago de deuda:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo registrar el pago de la deuda." },
      { status: 500 }
    );
  }
}
