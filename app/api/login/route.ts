import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth-session";
import { buscarUsuarioPorNombreDeUsuario } from "@/lib/usuarios-sheet";
import { verifyPassword } from "@/lib/password-hash";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const usuario = await buscarUsuarioPorNombreDeUsuario(username);

    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const passwordValida = await verifyPassword(password, usuario.passwordHash);

    if (!passwordValida) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(usuario.id, usuario.usuario);
    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}
