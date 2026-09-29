import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import { archivarCategory, crearCategory } from "@/lib/household/sheets";
import type { CategoryKind } from "@/lib/household/schema";

const KINDS: CategoryKind[] = ["expense", "income"];

function sinHogar() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Tu usuario todavía no tiene un hogar configurado. Corré el script de seed.",
    },
    { status: 409 }
  );
}

// Crea una categoría nueva. `fixed` decide si es un gasto/ingreso
// comprometido (se da de alta desde Configuración) o variable (se agrega
// al vuelo desde Presupuesto, sin estar atado a una lista cerrada).
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
      return sinHogar();
    }

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const kind = String(body.kind ?? "expense");
    const fixed = Boolean(body.fixed);

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
      fixed,
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

export async function DELETE(req: NextRequest) {
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
      return sinHogar();
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Falta el id de la categoría." },
        { status: 400 }
      );
    }

    const archivada = await archivarCategory(id, contexto.householdId);

    if (!archivada) {
      return NextResponse.json(
        { success: false, message: "Categoría no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Categoría eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando categoría:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo eliminar la categoría." },
      { status: 500 }
    );
  }
}
