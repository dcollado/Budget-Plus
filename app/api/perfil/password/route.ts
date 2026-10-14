import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth-session";
import { getUsuarioId } from "@/lib/current-user";
import { getSql, usaPostgres } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import { ErrorCuenta, validarPassword } from "@/lib/auth/cuentas";
import { limpiarFallos, loginBloqueado, registrarFallo } from "@/lib/auth/login-limite";
import { olvidarEstado } from "@/lib/auth/sesion-vigente";
import { registrarEvento } from "@/lib/auth/eventos";
import { ipDe } from "@/lib/auth/ip";

function error(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Cambiar la contraseña estando dentro: pide la actual. Sube la versión de
// sesión (las demás sesiones, en otros dispositivos, caen) y vuelve a emitir
// la cookie de ESTA sesión para que no se salga.
export async function POST(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);
    if (!usuarioId) return error("Unauthorized.", 401);

    if (!usaPostgres()) {
      return error("Changing the password requires the Postgres database.", 400);
    }

    const body = (await req.json()) as { actual?: unknown; nueva?: unknown };
    const actual = typeof body.actual === "string" ? body.actual : "";

    const sql = getSql();
    const [u] = await sql<
      { usuario: string; password_hash: string; sesion_version: number; activo: boolean }[]
    >`select usuario, password_hash, sesion_version, activo from usuarios where id = ${usuarioId}`;

    if (!u || !u.activo) return error("Unauthorized.", 401);

    // Misma protección que el login: la "actual" no se puede adivinar a ciegas.
    const ip = ipDe(req.headers);
    if (await loginBloqueado(u.usuario, ip)) {
      return error("Too many attempts. Wait a few minutes and try again.", 429);
    }

    if (!actual || !(await verifyPassword(actual, u.password_hash))) {
      await registrarFallo(u.usuario, ip);
      return error("The current password is not correct.", 400);
    }

    const nueva = validarPassword(body.nueva);

    if (nueva === actual) {
      return error("The new password must be different from the current one.", 400);
    }

    await limpiarFallos(u.usuario);

    const [{ sesion_version: version }] = await sql<{ sesion_version: number }[]>`
      update usuarios
      set password_hash = ${await hashPassword(nueva)}, sesion_version = sesion_version + 1
      where id = ${usuarioId}
      returning sesion_version`;

    olvidarEstado(usuarioId);
    await registrarEvento({ accion: "contrasena_cambiada", actorUserId: usuarioId });

    const respuesta = NextResponse.json({ success: true });
    respuesta.cookies.set(COOKIE_NAME, await createSessionToken(usuarioId, u.usuario, version), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return respuesta;
  } catch (e) {
    if (e instanceof ErrorCuenta) return error(e.message, 400);
    console.error("Error changing password:", e);
    return error("Could not change the password.", 500);
  }
}
