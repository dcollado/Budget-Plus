import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  actualizarProyectoItem,
  crearProyectoItem,
  eliminarProyectoItem,
  listProyectos,
} from "@/lib/household/datos";
import { centavosDe, fechaValida } from "@/lib/validacion";

const MAX_CONCEPTO = 120;

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const projectId = String(body.projectId ?? "").trim();
    const concepto = String(body.concepto ?? "").trim();
    const montoCents = centavosDe(body.monto);
    // Vacío = sin fecha (rige la del proyecto).
    const fecha = String(body.fecha ?? "").trim();

    if (!concepto || concepto.length > MAX_CONCEPTO) {
      return fallo("The item name is missing.", 400);
    }

    if (montoCents === null) {
      return fallo("The amount is not valid.", 400);
    }

    if (montoCents <= 0) {
      return fallo("The amount must be greater than zero.", 400);
    }

    if (fecha && !fechaValida(fecha)) {
      return fallo("Pick a valid target date.", 400);
    }

    const proyectos = await listProyectos(contexto.householdId);

    if (!proyectos.some((p) => p.id === projectId)) {
      return fallo("That project is not part of this household.", 404);
    }

    const item = await crearProyectoItem({
      projectId,
      householdId: contexto.householdId,
      concepto,
      montoCents,
      fecha,
    });

    return exito(item);
  } catch (error) {
    console.error("Error creating project item:", error);
    return fallo("Could not save the project.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();

    if (!id) {
      return fallo("Project is missing.", 400);
    }

    const cambios: Parameters<typeof actualizarProyectoItem>[2] = {};

    if (body.concepto !== undefined) {
      const concepto = String(body.concepto).trim();
      if (!concepto || concepto.length > MAX_CONCEPTO) {
        return fallo("The item name is missing.", 400);
      }
      cambios.concepto = concepto;
    }

    if (body.monto !== undefined) {
      const cents = centavosDe(body.monto);
      if (cents === null) return fallo("The amount is not valid.", 400);
      if (cents <= 0) return fallo("The amount must be greater than zero.", 400);
      cambios.montoCents = cents;
    }

    if (body.fecha !== undefined) {
      const fecha = String(body.fecha ?? "").trim();
      if (fecha && !fechaValida(fecha)) return fallo("Pick a valid target date.", 400);
      cambios.fecha = fecha;
    }

    if (body.pagado !== undefined) {
      cambios.pagado = body.pagado === true;
    }

    const item = await actualizarProyectoItem(contexto.householdId, id, cambios);

    if (!item) {
      return fallo("That project is not part of this household.", 404);
    }

    return exito(item);
  } catch (error) {
    console.error("Error updating project item:", error);
    return fallo("Could not save the project.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return fallo("Project is missing.", 400);
    }

    const borrado = await eliminarProyectoItem(contexto.householdId, id);

    if (!borrado) {
      return fallo("That project is not part of this household.", 404);
    }

    return exito({ id });
  } catch (error) {
    console.error("Error deleting project item:", error);
    return fallo("Could not delete the item.", 500);
  }
}
