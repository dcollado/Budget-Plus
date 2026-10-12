import { NextResponse } from "next/server";
import {
  aceptarInvitacion,
  ErrorCuenta,
  leerInvitacion,
} from "@/lib/auth/cuentas";

// Pública (el invitado aún no tiene cuenta): el token es el secreto.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invitacion = await leerInvitacion(token);

  if (!invitacion) {
    return NextResponse.json(
      { success: false, message: "La invitación no es válida o ya venció." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: invitacion });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: unknown;
      nombre?: unknown;
      password?: unknown;
    };

    await aceptarInvitacion({
      token: typeof body.token === "string" ? body.token : "",
      nombre: typeof body.nombre === "string" ? body.nombre : "",
      password: typeof body.password === "string" ? body.password : "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ErrorCuenta) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Error aceptando invitación:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo aceptar la invitación." },
      { status: 500 }
    );
  }
}
