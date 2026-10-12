import { NextRequest, NextResponse } from "next/server";
import type { Acceso } from "@/lib/auth/acceso";
import {
  cambiarEstadoMiembro,
  cancelarInvitacion,
  crearInvitacion,
  editarMiembro,
  enviarResetAMiembro,
  ErrorCuenta,
  reenviarInvitacion,
} from "@/lib/auth/cuentas";

// Acciones sobre las personas de UN hogar. Las comparten el panel del
// super-admin (cualquier hogar) y el del admin del hogar (solo el suyo):
// quien llama ya verificó el permiso y decide qué householdId pasar.

const enDev = (enlace: string) =>
  process.env.NODE_ENV === "production" ? undefined : enlace;

export function manejarError(error: unknown, mensaje: string): NextResponse {
  if (error instanceof ErrorCuenta) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ success: false, message: mensaje }, { status: 500 });
}

const invalida = () =>
  NextResponse.json({ success: false, message: "Acción inválida." }, { status: 400 });

// { accion: "invitar", email, role } | { accion: "reenviar", invitacionId }
// | { accion: "reset", userId }
export async function accionPost(
  req: NextRequest,
  householdId: string,
  actor: Acceso
): Promise<NextResponse> {
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
      invitedBy: actor.usuarioId,
    });
    return NextResponse.json({ success: true, data: { enlaceDev: enDev(enlace) } }, { status: 201 });
  }

  if (body.accion === "reenviar" && typeof body.invitacionId === "string") {
    const { enlace } = await reenviarInvitacion({
      householdId,
      invitacionId: body.invitacionId,
      invitedBy: actor.usuarioId,
    });
    return NextResponse.json({ success: true, data: { enlaceDev: enDev(enlace) } });
  }

  if (body.accion === "reset" && typeof body.userId === "string") {
    await enviarResetAMiembro(householdId, body.userId, actor.esSuperadmin, actor.usuarioId);
    return NextResponse.json({ success: true });
  }

  return invalida();
}

// Quitar/reactivar ({ userId, activo }) o editar ({ userId, nombre?, email?, role? }).
export async function accionPatch(
  req: NextRequest,
  householdId: string,
  actor: Acceso
): Promise<NextResponse> {
  const body = (await req.json()) as {
    userId?: unknown;
    activo?: unknown;
    nombre?: unknown;
    email?: unknown;
    role?: unknown;
  };

  if (typeof body.userId !== "string") return invalida();

  if (typeof body.activo === "boolean") {
    await cambiarEstadoMiembro({
      householdId,
      userId: body.userId,
      actorUserId: actor.usuarioId,
      actorEsSuperadmin: actor.esSuperadmin,
      activo: body.activo,
    });
  } else {
    await editarMiembro({
      householdId,
      userId: body.userId,
      actorUserId: actor.usuarioId,
      actorEsSuperadmin: actor.esSuperadmin,
      nombre: typeof body.nombre === "string" ? body.nombre : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      role: body.role === "admin" || body.role === "member" ? body.role : undefined,
    });
  }

  return NextResponse.json({ success: true });
}

// Cancelar una invitación pendiente: ?id=...
export async function accionDelete(
  req: NextRequest,
  householdId: string,
  actor: Acceso
): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "Falta la invitación." }, { status: 400 });
  }
  await cancelarInvitacion(householdId, id, actor.usuarioId);
  return NextResponse.json({ success: true });
}
