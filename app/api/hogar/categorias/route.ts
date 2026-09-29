import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import { crearCategory } from "@/lib/household/sheets";
import type { CategoryKind } from "@/lib/household/schema";

const KINDS: CategoryKind[] = ["expense", "income"];

// Crea una categoría "variable" nueva (fixed siempre false acá — las
// fijas se dan de alta a mano, esto es para que Presupuesto pueda
// agregar gastos/ingresos puntuales del mes sin estar atado a una lista
// cerrada de categorías).
export async function POST(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tu usuario todavía no tiene un hogar configurado. Corré el script de seed.",
        },
        { status: 409 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const kind = String(body.kind ?? "expense");

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Falta el nombre de la categoría." },
        { status: 400 }
      );
    }

    if (!KINDS.includes(kind as CategoryKind)) {
      return NextResponse.json(
        { success: false, message: "Tipo de categoría inválido." },
        { status: 400 }
      );
    }

    const category = await crearCategory({
      householdId: contexto.householdId,
      name,
      kind: kind as CategoryKind,
      fixed: false,
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Error creando categoría:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo crear la categoría." },
      { status: 500 }
    );
  }
}
