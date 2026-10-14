import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { aprobarSolicitud, editarSolicitud, rechazarSolicitud } from "@/lib/solicitudes";

type Contexto = { params: Promise<{ id: string }> };

// Super-admin: { accion: "editar" | "aprobar" | "rechazar", nombre?, email?, hogar? }.
// Aprobar crea el hogar y envía la invitación; antes se pueden corregir los datos.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id } = await params;
    const body = (await req.json()) as {
      accion?: unknown;
      nombre?: unknown;
      email?: unknown;
      hogar?: unknown;
    };

    switch (body.accion) {
      case "editar":
        await editarSolicitud(id, body);
        break;
      case "aprobar":
        await aprobarSolicitud(id, r.acceso.usuarioId, body);
        break;
      case "rechazar":
        await rechazarSolicitud(id, r.acceso.usuarioId);
        break;
      default:
        return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "Could not update the request.");
  }
}
