import { NextResponse } from "next/server";
import {
  ErrorCuenta,
  restablecerPassword,
  tokenResetValido,
} from "@/lib/auth/cuentas";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const valido = await tokenResetValido(token);

  return NextResponse.json({ success: valido }, { status: valido ? 200 : 404 });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };

    await restablecerPassword(
      typeof body.token === "string" ? body.token : "",
      body.password
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ErrorCuenta) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Error restableciendo contraseña:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo restablecer la contraseña." },
      { status: 500 }
    );
  }
}
