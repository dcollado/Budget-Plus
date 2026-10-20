import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  actualizarProyecto,
  crearProyecto,
  eliminarProyecto,
} from "@/lib/household/datos";
import { armarProyectosVista } from "@/lib/household/proyectos-datos";
import { centavosDe, fechaValida } from "@/lib/validacion";

const MAX_NOMBRE = 80;

// Los proyectos del hogar, cada uno con sus ítems y el plan de ahorro ya
// calculado (cuota mínima, lo que falta, comparación con el objetivo).
export async function GET(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    return exito(await armarProyectosVista(contexto.householdId, contexto.member.id));
  } catch (error) {
    console.error("Error getting projects:", error);
    return fallo("Could not get the projects.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const targetDate = String(body.targetDate ?? "").trim();
    // Vacío = sin presupuesto objetivo.
    const objetivoCents =
      body.objetivo === undefined || body.objetivo === "" ? 0 : centavosDe(body.objetivo);
    const ahorradoCents =
      body.ahorrado === undefined || body.ahorrado === "" ? 0 : centavosDe(body.ahorrado);

    if (!name || name.length > MAX_NOMBRE) {
      return fallo("Project name is missing.", 400);
    }

    if (!fechaValida(targetDate)) {
      return fallo("Pick a valid target date.", 400);
    }

    if (objetivoCents === null || ahorradoCents === null) {
      return fallo("The amount is not valid.", 400);
    }

    const proyecto = await crearProyecto({
      householdId: contexto.householdId,
      name,
      targetDate,
      objetivoCents,
      ahorradoCents,
    });

    return exito(proyecto);
  } catch (error) {
    console.error("Error creating project:", error);
    return fallo("Could not save the project.", 500);
  }
}

// Cambia lo que venga: nombre, fecha, objetivo, ahorrado o archivar.
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

    const cambios: Parameters<typeof actualizarProyecto>[2] = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > MAX_NOMBRE) return fallo("Project name is missing.", 400);
      cambios.name = name;
    }

    if (body.targetDate !== undefined) {
      if (!fechaValida(body.targetDate)) return fallo("Pick a valid target date.", 400);
      cambios.targetDate = body.targetDate;
    }

    if (body.objetivo !== undefined) {
      const cents = body.objetivo === "" ? 0 : centavosDe(body.objetivo);
      if (cents === null) return fallo("The amount is not valid.", 400);
      cambios.objetivoCents = cents;
    }

    if (body.ahorrado !== undefined) {
      const cents = body.ahorrado === "" ? 0 : centavosDe(body.ahorrado);
      if (cents === null) return fallo("The amount is not valid.", 400);
      cambios.ahorradoCents = cents;
    }

    if (body.archived !== undefined) {
      cambios.archived = body.archived === true;
    }

    const proyecto = await actualizarProyecto(contexto.householdId, id, cambios);

    if (!proyecto) {
      return fallo("That project is not part of this household.", 404);
    }

    return exito(proyecto);
  } catch (error) {
    console.error("Error updating project:", error);
    return fallo("Could not save the project.", 500);
  }
}

// Elimina el proyecto con todos sus ítems. No se puede deshacer (para eso
// está archivar).
export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return fallo("Project is missing.", 400);
    }

    const borrado = await eliminarProyecto(contexto.householdId, id);

    if (!borrado) {
      return fallo("That project is not part of this household.", 404);
    }

    return exito({ id });
  } catch (error) {
    console.error("Error deleting project:", error);
    return fallo("Could not delete the project.", 500);
  }
}
