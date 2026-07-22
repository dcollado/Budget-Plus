import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { getUsuarioId } from "@/lib/current-user";
import type { Movimiento } from "@/lib/movimientos-store";
import { validarMovimiento } from "@/lib/validar-movimiento";
import { sincronizarTodosLosActivos } from "@/lib/sincronizar-items-fijos";
import { ajustarSaldoPorEdicion } from "@/lib/deudas";
import { DEUDAS_SHEET, DEUDAS_RANGE, buildDeuda, deudaToRow } from "@/lib/deudas-sheet";

const SHEET_NAME = "Movimientos";
const SHEET_MESES_GENERADOS = "MesesGenerados";
const MOVIMIENTOS_RANGE = `${SHEET_NAME}!A:P`;

function buildMovimiento(row: string[]): Movimiento {
  return {
    id: row[0] ?? "",
    fecha: row[1] ?? "",
    tipo: row[2] === "ingreso" ? "ingreso" : "gasto",
    origen:
      row[3] === "fijo" || row[3] === "factura" || row[3] === "deuda"
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
    itemFijoId: row[12] ?? "",
    deudaId: row[13] ?? "",
    usuarioId: row[14] ?? "",
    metodoPago:
      row[15] === "efectivo" || row[15] === "debito" || row[15] === "tarjeta"
        ? row[15]
        : undefined,
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

// Si el período pedido es el mes actual y todavía no fue "abierto" PARA
// ESTE USUARIO (no hay registro en MesesGenerados para ese periodo +
// usuarioId), sincroniza todos sus ítems fijos activos de una vez — cubre
// los que ya existían antes de este mes. El registro es por usuario:
// que el mes ya se haya abierto para uno no debe saltear al otro.
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
    range: `${SHEET_MESES_GENERADOS}!A:B`,
  });

  const mesesRows = mesesResponse.data.values ?? [];
  const yaGenerado = mesesRows
    .slice(1)
    .some(
      (row) =>
        (row[0] ?? "").trim() === periodo && (row[1] ?? "").trim() === usuarioId
    );

  if (yaGenerado) {
    return;
  }

  await sincronizarTodosLosActivos(sheets, sheetId, usuarioId);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_MESES_GENERADOS}!A:C`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[periodo, usuarioId, new Date().toISOString()]],
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
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const periodo = req.nextUrl.searchParams.get("periodo")?.trim();
    const sheets = await getSheetsClient();

    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      await asegurarMesGenerado(sheets, sheetId, periodo, usuarioId);
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
          movimiento.mes === mes && movimiento.anio === anio
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
        { success: false, message: "No autorizado." },
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

    const { fecha, tipo, monto, categoria, descripcion, notas } =
      validacion.data;

    const { mes, anio } = getMesAnioFromFecha(fecha);

    const origenRaw = String(
      (body as Record<string, unknown>)?.origen ?? "variable"
    ).trim();

    const origen =
      origenRaw === "fijo" ||
      origenRaw === "factura" ||
      origenRaw === "deuda" ||
      origenRaw === "tarjeta"
        ? origenRaw
        : "variable";

    const itemFijoId =
      typeof (body as Record<string, unknown>).itemFijoId === "string"
        ? String((body as Record<string, unknown>).itemFijoId).trim()
        : "";

    const deudaId =
      typeof (body as Record<string, unknown>).deudaId === "string"
        ? String((body as Record<string, unknown>).deudaId).trim()
        : "";

    const metodoPagoRaw = String(
      (body as Record<string, unknown>)?.metodoPago ?? ""
    ).trim();

    const metodoPago =
      metodoPagoRaw === "efectivo" || metodoPagoRaw === "debito" || metodoPagoRaw === "tarjeta"
        ? metodoPagoRaw
        : undefined;

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
      itemFijoId,
      deudaId,
      usuarioId,
      metodoPago,
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
          movimiento.itemFijoId ?? "",
          movimiento.deudaId ?? "",
          movimiento.usuarioId,
          movimiento.metodoPago ?? "",
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
        { success: false, message: "Falta el id del movimiento." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validacion = validarMovimiento(body);

    if (!validacion.ok) {
      return NextResponse.json(
        { success: false, message: validacion.errores.join(" ") },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: MOVIMIENTOS_RANGE,
    });

    const rows = valuesResponse.data.values ?? [];
    const dataRows = rows.slice(1);

    // Busca por id Y por usuarioId — no se puede editar un movimiento de
    // otro usuario ni adivinando el id.
    const dataIndex = dataRows.findIndex(
      (row) => (row[0] ?? "").trim() === id && (row[14] ?? "").trim() === usuarioId
    );

    if (dataIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Movimiento no encontrado." },
        { status: 404 }
      );
    }

    const movimientoViejo = buildMovimiento(dataRows[dataIndex]);
    const { fecha, tipo, monto, categoria, descripcion, notas } = validacion.data;
    const { mes, anio } = getMesAnioFromFecha(fecha);

    const movimientoActualizado: Movimiento = {
      ...movimientoViejo,
      fecha,
      tipo,
      monto,
      categoria,
      descripcion,
      notas,
      mes,
      anio,
    };

    const sheetRowNumber = dataIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${sheetRowNumber}:P${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          movimientoActualizado.id,
          movimientoActualizado.fecha,
          movimientoActualizado.tipo,
          movimientoActualizado.origen,
          movimientoActualizado.monto,
          movimientoActualizado.categoria,
          movimientoActualizado.descripcion,
          movimientoActualizado.mes,
          movimientoActualizado.anio,
          movimientoActualizado.numeroFactura ?? "",
          movimientoActualizado.ruc ?? "",
          movimientoActualizado.notas ?? "",
          movimientoActualizado.itemFijoId ?? "",
          movimientoActualizado.deudaId ?? "",
          movimientoActualizado.usuarioId,
          movimientoActualizado.metodoPago ?? "",
        ]],
      },
    });

    // Si el movimiento está ligado a una deuda (un pago o una compra) y
    // el monto cambió, ajustar el saldo de esa deuda por la diferencia.
    let deudaActualizada = null;
    const montoViejo = Number(movimientoViejo.monto) || 0;
    const montoNuevo = Number(monto) || 0;

    if (
      movimientoViejo.deudaId &&
      (movimientoViejo.origen === "deuda" || movimientoViejo.origen === "tarjeta") &&
      montoViejo !== montoNuevo
    ) {
      const deudasResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: DEUDAS_RANGE,
      });

      const deudasRows = deudasResponse.data.values ?? [];
      const deudaDataRows = deudasRows.slice(1);
      const deudaIndex = deudaDataRows.findIndex(
        (row) =>
          (row[0] ?? "").trim() === movimientoViejo.deudaId &&
          (row[22] ?? "").trim() === usuarioId
      );

      if (deudaIndex !== -1) {
        const deuda = buildDeuda(deudaDataRows[deudaIndex]);
        deudaActualizada = ajustarSaldoPorEdicion(
          deuda,
          montoViejo,
          montoNuevo,
          movimientoViejo.origen as "deuda" | "tarjeta"
        );

        const deudaRowNumber = deudaIndex + 2;

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${DEUDAS_SHEET}!A${deudaRowNumber}:Y${deudaRowNumber}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [deudaToRow(deudaActualizada)],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { movimiento: movimientoActualizado, deuda: deudaActualizada },
    });
  } catch (error) {
    console.error("Error actualizando movimiento:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo actualizar el movimiento." },
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
        { success: false, message: "No autorizado." },
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
      range: MOVIMIENTOS_RANGE,
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
    // Busca por id Y por usuarioId — así un usuario nunca puede borrar
    // un movimiento de otro, ni siquiera adivinando el id.
    const dataIndex = dataRows.findIndex(
      (row) =>
        (row[0] ?? "").trim() === id && (row[14] ?? "").trim() === usuarioId
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
