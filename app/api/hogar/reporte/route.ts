import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import { listBudgets, listCategories, listMembers } from "@/lib/household/datos";
import { armarReporteAnual } from "@/lib/household/reporte";
import { mesActual } from "@/lib/household/calendario";

// Reporte anual del hogar de quien está conectado (el hogar sale de la
// sesión). Todos los miembros ven el mismo reporte, con el desglose por persona.
export async function GET(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return NextResponse.json(
        {
          success: false,
          message: "Tu cuenta todavía no tiene un hogar. Pídele a quien administra tu hogar que te invite.",
        },
        { status: 409 }
      );
    }

    const actual = Number(mesActual().slice(0, 4));
    const pedido = Number(req.nextUrl.searchParams.get("year"));
    const year =
      Number.isInteger(pedido) && pedido >= actual - 5 && pedido <= actual + 5 ? pedido : actual;

    const [categories, budgets, members] = await Promise.all([
      listCategories(contexto.householdId),
      listBudgets(contexto.householdId),
      listMembers(contexto.householdId),
    ]);

    const reporte = armarReporteAnual(
      year,
      categories,
      budgets,
      members.map((m) => ({ id: m.id, displayName: m.displayName, color: m.color }))
    );

    return NextResponse.json({ success: true, data: reporte });
  } catch (error) {
    console.error("Error armando el reporte anual:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo armar el reporte." },
      { status: 500 }
    );
  }
}
