import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth-session";
import { buscarUsuarioPorNombreDeUsuario } from "@/lib/usuarios-sheet";
import { passwordNecesitaRehash, verifyPassword, hashPassword } from "@/lib/password-hash";
import { getSql, usaPostgres } from "@/lib/db";
import {
  limpiarFallos,
  loginBloqueado,
  registrarFallo,
} from "@/lib/auth/login-limite";
import { obtenerAcceso } from "@/lib/auth/acceso";

const MENSAJE_BLOQUEO =
  "Demasiados intentos. Espera unos minutos e intenta de nuevo.";

function ipDe(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  return (reenviada?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "desconocida").trim();
}

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

    const ip = ipDe(request);

    if (await loginBloqueado(username, ip)) {
      return NextResponse.json({ error: MENSAJE_BLOQUEO }, { status: 429 });
    }

    const usuario = await buscarUsuarioPorNombreDeUsuario(username);

    if (!usuario || !usuario.activo) {
      await registrarFallo(username, ip);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const passwordValida = await verifyPassword(password, usuario.passwordHash);

    if (!passwordValida) {
      await registrarFallo(username, ip);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    await limpiarFallos(username);

    // Contraseñas guardadas con el formato o las iteraciones viejas: se
    // actualizan solas ahora que tenemos la contraseña en claro.
    if (usaPostgres() && passwordNecesitaRehash(usuario.passwordHash)) {
      const nuevoHash = await hashPassword(password);
      await getSql()`update usuarios set password_hash = ${nuevoHash} where id = ${usuario.id}`;
    }

    const acceso = await obtenerAcceso(usuario.id);
    const token = await createSessionToken(
      usuario.id,
      usuario.usuario,
      acceso?.usaModulosLegacy ?? false,
      usuario.sesionVersion
    );
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
