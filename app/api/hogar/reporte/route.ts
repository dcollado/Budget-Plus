import { moduloApagado } from "@/lib/modulos-datos";
import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import { listBudgets, listCategories, listMembers } from "@/lib/household/datos";
import { mesActual } from "@/lib/household/formato";
import { armarReporteAnual } from "@/lib/household/reporte";

// Reporte anual del hogar de quien está conectado (el hogar sale de la
// sesión). Todos los miembros ven el mismo reporte, con el desglose por persona.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const apagado = await moduloApagado("reportes", r.contexto.householdId);
    if (apagado) return apagado;
    const { contexto } = r;

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

    return exito(reporte);
  } catch (error) {
    console.error("Error building the annual report:", error);
    return fallo("Could not build the report.", 500);
  }
}
