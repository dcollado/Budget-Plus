import { after, NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import {
  actualizarDiaPago,
  archivarCategory,
  crearCategory,
  listMembers,
} from "@/lib/household/sheets";
import type { CategoryKind } from "@/lib/household/schema";
import {
  borrarEventosDeCategoria,
  mesActual,
  sincronizarDosMeses,
  sincronizarSinFallar,
} from "@/lib/household/calendario";

const KINDS: CategoryKind[] = ["expense", "income"];

// "" / null / fuera de rango = sin día.
function parseDueDay(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

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
    const dueDay = parseDueDay(body.dueDay);
    const ownerMemberId = String(body.ownerMemberId ?? "").trim();

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

    if (ownerMemberId) {
      const members = await listMembers(contexto.householdId);

      if (!members.some((m) => m.id === ownerMemberId)) {
        return NextResponse.json(
          { success: false, message: "Ese miembro no es de este hogar." },
          { status: 400 }
        );
      }
    }

    const category = await crearCategory({
      householdId: contexto.householdId,
      name,
      kind: kind as CategoryKind,
      fixed,
      dueDay,
      ownerMemberId,
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

    const householdId = contexto.householdId;
    after(() => sincronizarSinFallar(() => borrarEventosDeCategoria(householdId, id)));

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

// Cambia el día del mes en que se paga una categoría fija.
export async function PATCH(req: NextRequest) {
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
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Falta el id de la categoría." },
        { status: 400 }
      );
    }

    const dueDay = parseDueDay(body.dueDay);
    const ok = await actualizarDiaPago(id, contexto.householdId, dueDay);

    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Categoría no encontrada." },
        { status: 404 }
      );
    }

    const householdId = contexto.householdId;
    after(() =>
      sincronizarSinFallar(() => sincronizarDosMeses(householdId, mesActual()))
    );

    return NextResponse.json({ success: true, data: { id, dueDay } });
  } catch (error) {
    console.error("Error actualizando día de pago:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo guardar el día de pago." },
      { status: 500 }
    );
  }
}
