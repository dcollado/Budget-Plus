import { NextRequest, NextResponse } from "next/server";
import { requerirAdminHogar } from "@/lib/auth/acceso";
import {
  cambiarEstadoMiembro,
  crearInvitacion,
  cancelarInvitacion,
  ErrorCuenta,
  listarInvitacionesPendientes,
  listarMiembros,
} from "@/lib/auth/cuentas";

function manejarError(error: unknown, mensaje: string) {
  if (error instanceof ErrorCuenta) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ success: false, message: mensaje }, { status: 500 });
}

// Miembros del hogar del admin y sus invitaciones pendientes.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;
    const householdId = r.acceso.householdId!;

    const [miembros, invitaciones] = await Promise.all([
      listarMiembros(householdId),
      listarInvitacionesPendientes(householdId),
    ]);

    return NextResponse.json({
      success: true,
      data: { miembros, invitaciones, yo: r.acceso.usuarioId },
    });
  } catch (error) {
    return manejarError(error, "No se pudieron cargar los miembros.");
  }
}

// Invitar por correo. El hogar sale de la sesión, nunca del cliente.
export async function POST(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as { email?: unknown };
    const { enlace } = await crearInvitacion({
      householdId: r.acceso.householdId!,
      email: typeof body.email === "string" ? body.email : "",
      role: "member",
      invitedBy: r.acceso.usuarioId,
    });

    return NextResponse.json(
      {
        success: true,
        data: { enlaceDev: process.env.NODE_ENV === "production" ? undefined : enlace },
      },
      { status: 201 }
    );
  } catch (error) {
    return manejarError(error, "No se pudo enviar la invitación.");
  }
}

// Quitar (activo=false) o reactivar (activo=true) a un miembro.
export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as { userId?: unknown; activo?: unknown };
    if (typeof body.userId !== "string" || typeof body.activo !== "boolean") {
      return NextResponse.json({ success: false, message: "Datos inválidos." }, { status: 400 });
    }

    await cambiarEstadoMiembro({
      householdId: r.acceso.householdId!,
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
export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Falta la invitación." }, { status: 400 });
    }

    await cancelarInvitacion(r.acceso.householdId!, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "No se pudo cancelar la invitación.");
  }
}
