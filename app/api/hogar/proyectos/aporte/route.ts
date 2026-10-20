import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import { guardarProyectoAporte, listProyectos } from "@/lib/household/datos";
import { topeDeAporte } from "@/lib/household/proyectos-datos";
import { centavosDe } from "@/lib/validacion";

// Cada persona fija SU aporte mensual a un proyecto. Siempre es el de quien
// tiene la sesión (no se puede escribir el de otra persona), y no puede pasar
// de lo que le queda libre.
export async function PUT(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const projectId = String(body.projectId ?? "").trim();
    // Vacío = 0.
    const montoCents = body.monto === undefined || body.monto === "" ? 0 : centavosDe(body.monto);

    if (!projectId) {
      return fallo("Project is missing.", 400);
    }

    if (montoCents === null) {
      return fallo("The amount is not valid.", 400);
    }

    const proyectos = await listProyectos(contexto.householdId);

    if (!proyectos.some((p) => p.id === projectId)) {
      return fallo("That project is not part of this household.", 404);
    }

    const tope = await topeDeAporte(contexto.householdId, contexto.member.id, projectId);

    if (montoCents > tope) {
      return fallo("That is more than you have available.", 400);
    }

    await guardarProyectoAporte({
      projectId,
      memberId: contexto.member.id,
      householdId: contexto.householdId,
      montoCents,
    });

    return exito({ montoCents });
  } catch (error) {
    console.error("Error saving project contribution:", error);
    return fallo("Could not save the project.", 500);
  }
}
