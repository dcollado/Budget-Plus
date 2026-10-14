import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth-session";
import { buscarUsuarioPorNombreDeUsuario } from "@/lib/usuarios-sheet";
import {
  gastarTiempoDeVerificacion,
  hashPassword,
  passwordNecesitaRehash,
  verifyPassword,
} from "@/lib/password-hash";
import { ipDe } from "@/lib/auth/ip";
import { fallo } from "@/lib/api";
import { getSql, usaPostgres } from "@/lib/db";
import { obtenerAcceso } from "@/lib/auth/acceso";
import {
  limpiarFallos,
  loginBloqueado,
  registrarFallo,
} from "@/lib/auth/login-limite";

const MENSAJE_BLOQUEO =
  "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
const MENSAJE_INVALIDO = "Usuario o contraseña incorrectos.";

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
      return fallo(MENSAJE_INVALIDO, 401);
    }

    const ip = ipDe(request.headers);

    if (await loginBloqueado(username, ip)) {
      return fallo(MENSAJE_BLOQUEO, 429);
    }

    const usuario = await buscarUsuarioPorNombreDeUsuario(username);

    // Siempre se gasta el mismo tiempo de verificación, exista o no la
    // cuenta, para que la demora no delate qué usuarios existen.
    if (!usuario) {
      await gastarTiempoDeVerificacion(password);
      await registrarFallo(username, ip);
      return fallo(MENSAJE_INVALIDO, 401);
    }

    const passwordValida = await verifyPassword(password, usuario.passwordHash);

    if (!passwordValida || !usuario.activo) {
      await registrarFallo(username, ip);
      return fallo(MENSAJE_INVALIDO, 401);
    }

    await limpiarFallos(username);

    // Contraseñas guardadas con el formato o las iteraciones viejas: se
    // actualizan solas ahora que tenemos la contraseña en claro.
    if (usaPostgres() && passwordNecesitaRehash(usuario.passwordHash)) {
      const nuevoHash = await hashPassword(password);
      await getSql()`update usuarios set password_hash = ${nuevoHash} where id = ${usuario.id}`;
    }

    const acceso = await obtenerAcceso(usuario.id);

    if (acceso?.hogarArchivado) {
      return fallo("Tu hogar está archivado. Contacta al administrador de Budget Plus.", 403);
    }

    const token = await createSessionToken(
      usuario.id,
      usuario.usuario,
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

    return fallo("No se pudo iniciar sesión.", 500);
  }
}
