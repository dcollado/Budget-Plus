import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { getUsuarioId } from "@/lib/current-user";
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from "@/lib/notificaciones";

// Las notificaciones de la persona conectada (la campana).
export async function GET(req: NextRequest) {
  const usuarioId = await getUsuarioId(req);
  if (!usuarioId) return fallo("Unauthorized.", 401);

  try {
    return exito(await listarNotificaciones(usuarioId));
  } catch (e) {
    console.error("Error loading notifications:", e);
    return fallo("Could not load notifications.", 500);
  }
}

// Marca una (id) o todas (todas: true) como leídas. Solo las propias.
export async function PATCH(req: NextRequest) {
  const usuarioId = await getUsuarioId(req);
  if (!usuarioId) return fallo("Unauthorized.", 401);

  try {
    const body = (await req.json()) as { id?: unknown; todas?: unknown };

    if (body.todas === true) {
      await marcarTodasLeidas(usuarioId);
    } else if (typeof body.id === "number" && Number.isInteger(body.id)) {
      await marcarLeida(usuarioId, body.id);
    } else {
      return fallo("Invalid request.", 400);
    }

    return exito({ ok: true });
  } catch (e) {
    console.error("Error updating notifications:", e);
    return fallo("Could not update notifications.", 500);
  }
}
