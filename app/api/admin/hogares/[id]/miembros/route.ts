import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import {
  cambiarEstadoMiembro,
  cancelarInvitacion,
  crearInvitacion,
  enviarResetAMiembro,
  ErrorCuenta,
  reenviarInvitacion,
} from "@/lib/auth/cuentas";

type Contexto = { params: Promise<{ id: string }> };

const enDev = (enlace: string) =>
  process.env.NODE_ENV === "production" ? undefined : enlace;

function manejarError(error: unknown, mensaje: string) {
  if (error instanceof ErrorCuenta) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ success: false, message: mensaje }, { status: 500 });
}

// Acciones del super-admin sobre cualquier hogar (el id viene de la URL;
// aquí es legítimo porque requerirSuperadmin ya lo verificó).
//   { accion: "invitar", email, role }
//   { accion: "reenviar", invitacionId }
//   { accion: "reset", userId }
export async function POST(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id: householdId } = await params;
    const body = (await req.json()) as {
      accion?: unknown;
      email?: unknown;
      role?: unknown;
      invitacionId?: unknown;
      userId?: unknown;
    };

    if (body.accion === "invitar") {
      const { enlace } = await crearInvitacion({
        householdId,
        email: typeof body.email === "string" ? body.email : "",
        role: body.role === "admin" ? "admin" : "member",
        invitedBy: r.acceso.usuarioId,
      });
      return NextResponse.json({ success: true, data: { enlaceDev: enDev(enlace) } }, { status: 201 });
    }

    if (body.accion === "reenviar" && typeof body.invitacionId === "string") {
      const { enlace } = await reenviarInvitacion({
        householdId,
        invitacionId: body.invitacionId,
        invitedBy: r.acceso.usuarioId,
      });
      return NextResponse.json({ success: true, data: { enlaceDev: enDev(enlace) } });
    }

    if (body.accion === "reset" && typeof body.userId === "string") {
      await enviarResetAMiembro(householdId, body.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Acción inválida." }, { status: 400 });
  } catch (error) {
    return manejarError(error, "No se pudo completar la acción.");
  }
}

// Quitar (activo=false) o reactivar (activo=true).
export async function PATCH(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id: householdId } = await params;
    const body = (await req.json()) as { userId?: unknown; activo?: unknown };

    if (typeof body.userId !== "string" || typeof body.activo !== "boolean") {
      return NextResponse.json({ success: false, message: "Datos inválidos." }, { status: 400 });
    }

    await cambiarEstadoMiembro({
      householdId,
      userId: body.userId,
      actorUserId: r.acceso.usuarioId,
      activo: body.activo,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "No se pudo actualizar al miembro.");
  }
}

// Cancelar una invitación pendiente: ?id=...
export async function DELETE(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id: householdId } = await params;
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Falta la invitación." }, { status: 400 });
    }

    await cancelarInvitacion(householdId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "No se pudo cancelar la invitación.");
  }
}
