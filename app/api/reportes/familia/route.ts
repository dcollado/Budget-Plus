import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google-sheets";
import { getUsuarioId } from "@/lib/current-user";
import { listarUsuarios } from "@/lib/usuarios-sheet";

const MOVIMIENTOS_SHEET = "Movimientos";
const MOVIMIENTOS_RANGE = `${MOVIMIENTOS_SHEET}!A:O`;

type FilaMovimiento = {
  tipo: string;
  origen: string;
  monto: number;
  categoria: string;
  mes: string;
  anio: string;
  usuarioId: string;
};

function buildFila(row: string[]): FilaMovimiento {
  return {
    tipo: row[2] ?? "",
    origen: row[3] ?? "",
    monto: Number(row[4]) || 0,
    categoria: row[5] ?? "",
    mes: row[7] ?? "",
    anio: row[8] ?? "",
    usuarioId: row[14] ?? "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
      throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
    }

    // Solo exige estar autenticado — no filtra por usuarioId, porque este
    // es justamente el reporte consolidado. Lo que nunca hace es devolver
    // filas individuales, solo agregados (ver más abajo).
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const periodo = req.nextUrl.searchParams.get("periodo")?.trim();

    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      return NextResponse.json(
        { success: false, message: "Falta un período válido (AAAA-MM)." },
        { status: 400 }
      );
    }

    const [anio, mes] = periodo.split("-");

    const sheets = await getSheetsClient();

    const [movimientosResponse, usuarios] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: MOVIMIENTOS_RANGE,
      }),
      listarUsuarios(),
    ]);

    const nombrePorUsuarioId = new Map(usuarios.map((u) => [u.id, u.nombre]));

    const rows = movimientosResponse.data.values ?? [];
    const filas = rows
      .slice(1)
      .map((row) => buildFila(row))
      .filter((f) => f.mes === mes && f.anio === anio);

    const ingresosPorUsuario = new Map<string, number>();
    const gastosPorUsuario = new Map<string, number>();
    const montoPorCategoria = new Map<string, number>();

    let totalIngresos = 0;
    let totalGastos = 0;
    let salarioFijo = 0;
    let pagosFijos = 0;
    let ingresosExtra = 0;

    for (const fila of filas) {
      if (fila.tipo === "ingreso") {
        totalIngresos += fila.monto;
        ingresosPorUsuario.set(
          fila.usuarioId,
          (ingresosPorUsuario.get(fila.usuarioId) ?? 0) + fila.monto
        );
        if (fila.origen === "fijo") {
          salarioFijo += fila.monto;
          pagosFijos += 1;
        } else {
          ingresosExtra += fila.monto;
        }
      } else {
        totalGastos += fila.monto;
        gastosPorUsuario.set(
          fila.usuarioId,
          (gastosPorUsuario.get(fila.usuarioId) ?? 0) + fila.monto
        );
        montoPorCategoria.set(
          fila.categoria,
          (montoPorCategoria.get(fila.categoria) ?? 0) + fila.monto
        );
      }
    }

    const aSplitPorUsuario = (mapa: Map<string, number>) =>
      Array.from(mapa.entries())
        .map(([id, monto]) => ({
          usuarioId: id,
          nombre: nombrePorUsuarioId.get(id) ?? "Desconocido",
          monto,
        }))
        .sort((a, b) => b.monto - a.monto);

    const porCategoria = Array.from(montoPorCategoria.entries())
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto);

    return NextResponse.json({
      success: true,
      data: {
        ingresos: {
          total: totalIngresos,
          porUsuario: aSplitPorUsuario(ingresosPorUsuario),
          salarioFijo,
          pagosFijos,
          ingresosExtra,
        },
        gastos: {
          total: totalGastos,
          porUsuario: aSplitPorUsuario(gastosPorUsuario),
        },
        neto: totalIngresos - totalGastos,
        porCategoria,
      },
    });
  } catch (error) {
    console.error("Error generando el reporte familiar:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo generar el reporte familiar." },
      { status: 500 }
    );
  }
}
