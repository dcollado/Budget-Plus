import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  guardarProyectoAporteMes,
  listMembers,
  listProyectos,
  marcarProyectoAporteHecho,
} from "@/lib/household/datos";
import { mesDeAporte } from "@/lib/household/proyectos-datos";
import { centavosDe, mesValido } from "@/lib/validacion";

// El aporte de una persona a un proyecto, mes a mes. Por defecto es el de quien
// tiene la sesión; con `memberId` es el de otra persona del hogar (en el hogar
// todo se puede editar entre sí, como el presupuesto). En cada mes no puede
// pasar de lo que a esa persona le queda libre.
//
//   { projectId, mes, monto, memberId? }   el aporte de ese mes (0 lo quita)
//   { projectId, mes, hecho, memberId? }   marca o desmarca ese mes como hecho
export async function PUT(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const projectId = String(body.projectId ?? "").trim();
    const mes = body.mes === undefined || body.mes === "" ? null : String(body.mes).trim();
    const hecho = typeof body.hecho === "boolean" ? body.hecho : null;
    // Vacío = 0.
    const montoCents = body.monto === undefined || body.monto === "" ? 0 : centavosDe(body.monto);

    if (!projectId) {
      return fallo("Project is missing.", 400);
    }

    if (montoCents === null) {
      return fallo("The amount is not valid.", 400);
    }

    if (mes !== null && !mesValido(mes)) {
      return fallo("Invalid month.", 400);
    }

    const proyectos = await listProyectos(contexto.householdId);

    if (!proyectos.some((p) => p.id === projectId)) {
      return fallo("That project is not part of this household.", 404);
    }

    // De quién es el aporte: el mío, o el de otra persona de este hogar.
    const pedido = typeof body.memberId === "string" ? body.memberId.trim() : "";
    let memberId = contexto.member.id;

    if (pedido && pedido !== memberId) {
      const miembros = await listMembers(contexto.householdId);

      if (!miembros.some((m) => m.id === pedido)) {
        return fallo("That person is not part of this household.", 404);
      }

      memberId = pedido;
    }

    const base = {
      projectId,
      memberId,
      householdId: contexto.householdId,
    };

    if (mes === null) {
      return fallo("Invalid month.", 400);
    }

    const delMes = await mesDeAporte(contexto.householdId, memberId, projectId, mes);

    if (!delMes) {
      return fallo("That month is not part of the saving period.", 400);
    }

    // ---- marcar o desmarcar como hecho
    if (hecho !== null) {
      // Si todavía era solo la sugerencia, se confirma al marcarla.
      if (!delMes.definido) {
        if (delMes.aporteCents <= 0) {
          return fallo("There is nothing to mark as done.", 400);
        }
        await guardarProyectoAporteMes({ ...base, month: mes, montoCents: delMes.aporteCents });
      }

      const ok = await marcarProyectoAporteHecho(
        contexto.householdId,
        projectId,
        memberId,
        mes,
        hecho
      );

      if (!ok) {
        return fallo("There is nothing to mark as done.", 400);
      }

      return exito({ mes, hecho });
    }

    // ---- el aporte de un mes
    if (delMes.hecho) {
      return fallo("Undo it before changing the amount.", 400);
    }

    if (montoCents > delMes.topeCents) {
      return fallo("That is more than you have available.", 400);
    }

    await guardarProyectoAporteMes({ ...base, month: mes, montoCents });

    return exito({ montoCents, mes });
  } catch (error) {
    console.error("Error saving project contribution:", error);
    return fallo("Could not save the project.", 500);
  }
}
