import { after, NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  actualizarCategoria,
  archivarCategory,
  crearCategory,
  listCuentas,
  listMembers,
} from "@/lib/household/datos";
import type { CategoryKind } from "@/lib/household/schema";
import {
  borrarEventosDeCategoria,
  sincronizarDosMeses,
  sincronizarSinFallar,
} from "@/lib/household/calendario";
import { mesActual } from "@/lib/household/formato";

const KINDS: CategoryKind[] = ["expense", "income"];

// "" / null / fuera de rango = sin día.
function parseDueDay(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

// Crea una categoría nueva. `fixed` decide si es un gasto/ingreso
// comprometido (se da de alta desde Configuración) o variable (se agrega
// al vuelo desde Presupuesto, sin estar atado a una lista cerrada).
export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const kind = String(body.kind ?? "expense");
    const fixed = Boolean(body.fixed);
    const dueDay = parseDueDay(body.dueDay);
    const ownerMemberId = String(body.ownerMemberId ?? "").trim();

    if (!name) {
      return fallo("Category name is missing.", 400);
    }

    if (!KINDS.includes(kind as CategoryKind)) {
      return fallo("Invalid category type.", 400);
    }

    if (ownerMemberId) {
      const members = await listMembers(contexto.householdId);

      if (!members.some((m) => m.id === ownerMemberId)) {
        return fallo("That member is not part of this household.", 400);
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

    return exito(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return fallo("Could not create the category.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return fallo("Category id is missing.", 400);
    }

    const archivada = await archivarCategory(id, contexto.householdId);

    if (!archivada) {
      return fallo("Category not found.", 404);
    }

    const householdId = contexto.householdId;
    after(() => sincronizarSinFallar(() => borrarEventosDeCategoria(householdId, id)));

    return Response.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return fallo("Could not delete the category.", 500);
  }
}

// Cambios parciales de una categoría fija: el día de pago (dueDay) y/o la
// cuenta a la que va la plata (cuentaId). Solo se tocan los que vengan.
export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();

    if (!id) {
      return fallo("Category id is missing.", 400);
    }

    const cambios: { dueDay?: number | null; cuentaId?: string; ahorro?: boolean } = {};

    if ("ahorro" in body) {
      cambios.ahorro = body.ahorro === true;
    }

    if ("dueDay" in body) {
      cambios.dueDay = parseDueDay(body.dueDay);
    }

    if ("cuentaId" in body) {
      const cuentaId = String(body.cuentaId ?? "").trim();

      if (cuentaId) {
        const cuentas = await listCuentas(contexto.householdId);

        if (!cuentas.some((c) => c.id === cuentaId)) {
          return fallo("That account does not exist.", 400);
        }
      }

      cambios.cuentaId = cuentaId;
    }

    const ok = await actualizarCategoria(id, contexto.householdId, cambios);

    if (!ok) {
      return fallo("Category not found.", 404);
    }

    // La cuenta no sale en el calendario; solo un cambio de día lo afecta.
    if ("dueDay" in cambios) {
      const householdId = contexto.householdId;
      after(() =>
        sincronizarSinFallar(() => sincronizarDosMeses(householdId, mesActual()))
      );
    }

    return exito({ id, ...cambios });
  } catch (error) {
    console.error("Error updating category:", error);
    return fallo("Could not save the change.", 500);
  }
}
