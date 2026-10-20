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
import { fechaValida } from "@/lib/validacion";

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
    // Dos pagos al mes: solo para fijas, con los dos días elegidos.
    // Cada 2 semanas (ingresos fijos): una fecha de pago de referencia. Cuenta como dos pagos al mes.
    const bisemanalDesde = fixed && fechaValida(body.bisemanalDesde) ? body.bisemanalDesde : "";
    const quincenal = fixed && (body.quincenal === true || Boolean(bisemanalDesde));
    const dueDay2 = quincenal && !bisemanalDesde ? parseDueDay(body.dueDay2) : null;
    const ownerMemberId = String(body.ownerMemberId ?? "").trim();

    if (!name) {
      return fallo("Category name is missing.", 400);
    }

    if (!KINDS.includes(kind as CategoryKind)) {
      return fallo("Invalid category type.", 400);
    }

    if (fixed && body.bisemanalDesde && !bisemanalDesde) {
      return fallo("Pick a valid payday.", 400);
    }

    if (quincenal && !bisemanalDesde && (dueDay === null || dueDay2 === null)) {
      return fallo("Pick both payment days.", 400);
    }

    if (quincenal && !bisemanalDesde && dueDay === dueDay2) {
      return fallo("The two payment days must be different.", 400);
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
      quincenal,
      dueDay2,
      bisemanalDesde,
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

    const cambios: {
      name?: string;
      ownerMemberId?: string;
      dueDay?: number | null;
      quincenal?: boolean;
      dueDay2?: number | null;
      bisemanalDesde?: string;
      cuentaId?: string;
      ahorro?: boolean;
    } = {};

    if ("ahorro" in body) {
      cambios.ahorro = body.ahorro === true;
    }

    if ("name" in body) {
      const name = String(body.name ?? "").trim();

      if (!name) {
        return fallo("Category name is missing.", 400);
      }

      if (name.length > 80) {
        return fallo("The name is too long.", 400);
      }

      cambios.name = name;
    }

    if ("ownerMemberId" in body) {
      const ownerMemberId = String(body.ownerMemberId ?? "").trim();

      if (ownerMemberId) {
        const members = await listMembers(contexto.householdId);

        if (!members.some((m) => m.id === ownerMemberId)) {
          return fallo("That member is not part of this household.", 400);
        }
      }

      cambios.ownerMemberId = ownerMemberId;
    }

    if ("dueDay" in body) {
      cambios.dueDay = parseDueDay(body.dueDay);
    }

    if ("quincenal" in body) {
      cambios.quincenal = body.quincenal === true;
      // Al volver a mensual se borra el segundo día; al pasar a quincenal,
      // si no vino, queda el fin de mes (31).
      cambios.dueDay2 = cambios.quincenal ? (parseDueDay(body.dueDay2) ?? 31) : null;
    } else if ("dueDay2" in body) {
      cambios.dueDay2 = parseDueDay(body.dueDay2);
    }

    if ("bisemanalDesde" in body) {
      const desde = String(body.bisemanalDesde ?? "").trim();

      if (desde && !fechaValida(desde)) {
        return fallo("Pick a valid payday.", 400);
      }

      cambios.bisemanalDesde = desde;

      // Cada 2 semanas cuenta como dos pagos al mes y no usa días fijos.
      if (desde) {
        cambios.quincenal = true;
        cambios.dueDay = null;
        cambios.dueDay2 = null;
      }
    }

    if (
      cambios.quincenal === true &&
      !cambios.bisemanalDesde &&
      cambios.dueDay !== undefined &&
      cambios.dueDay !== null &&
      cambios.dueDay === cambios.dueDay2
    ) {
      return fallo("The two payment days must be different.", 400);
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
    if (
      "dueDay" in cambios ||
      "dueDay2" in cambios ||
      "bisemanalDesde" in cambios ||
      "quincenal" in cambios ||
      "name" in cambios
    ) {
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
