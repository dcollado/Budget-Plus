import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
  debeRenovarSesion,
  duracionSesionSegundos,
  verifySessionToken,
} from "@/lib/auth-session";
import type { SessionPayload } from "@/lib/auth-session";
import { sesionVigente, versionDeSesion } from "@/lib/auth/sesion-vigente";

// /api/cron: lo llama Vercel sin sesión; la ruta verifica CRON_SECRET.
// Invitación y recuperación de contraseña: el token del enlace es el secreto.
const PUBLIC_ROUTES = [
  "/login",
  "/api/login",
  "/api/cron",
  "/invitacion",
  "/api/invitacion",
  "/olvide",
  "/restablecer",
  "/api/password",
  // Registro público de cambios de UI (contenido estático, sin datos).
  "/cambios",
  // Inicio público y solicitud de acceso (nada se crea sin aprobación).
  "/inicio",
  "/solicitar",
  "/api/solicitudes",
];


// Solo con `next dev` (NODE_ENV=development, nunca en un build de producción)
// y si .env.local define DEV_AUTO_LOGIN_ID y DEV_AUTO_LOGIN_USER: entra solo
// como ese usuario, sin pasar por /login.
function usuarioDevAuto(): { id: string; usuario: string } | null {
  if (process.env.NODE_ENV !== "development") return null;

  const id = process.env.DEV_AUTO_LOGIN_ID;
  const usuario = process.env.DEV_AUTO_LOGIN_USER;

  return id && usuario ? { id, usuario } : null;
}

export async function proxy(req: NextRequest) {
  let real = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
  let expulsada = false;

  // Firma y fecha buenas no bastan: la cuenta pudo desactivarse, el hogar
  // archivarse o cambiarse la contraseña (ver lib/auth/sesion-vigente.ts).
  if (real && !(await sesionVigente(real.usuarioId, real.sv ?? 0))) {
    real = null;
    expulsada = true;
  }

  const dev = real ? null : usuarioDevAuto();

  if (!dev) {
    const respuesta = await manejar(req, real);
    if (expulsada) respuesta.cookies.delete(COOKIE_NAME);

    // "Recordarme": cada visita renueva los 30 días (ver debeRenovarSesion).
    if (real && debeRenovarSesion(real)) {
      respuesta.cookies.set(
        COOKIE_NAME,
        await createSessionToken(real.usuarioId, real.username, real.sv ?? 0, true),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: duracionSesionSegundos(true),
        }
      );
    }
    return respuesta;
  }

  const token = await createSessionToken(
    dev.id,
    dev.usuario,
    await versionDeSesion(dev.id)
  );
  const sesion = await verifySessionToken(token);
  const response = await manejar(req, sesion);

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  return response;
}

async function manejar(req: NextRequest, session: SessionPayload | null) {
  const { pathname } = req.nextUrl;

  // "/" sin sesión muestra el inicio público (sin cambiar la URL); con
  // sesión, la página lleva a Presupuesto.
  if (pathname === "/" && !session) {
    return NextResponse.rewrite(new URL("/inicio", req.url));
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Las rutas verifican la cookie firmada por su cuenta (lib/current-user.ts)
  // y no confían en cabeceras. Estas dos solo existen para el auto-login de
  // `next dev`, donde la primera petición todavía no trae cookie.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-usuario-id");
  requestHeaders.delete("x-usuario-nombre");

  if (process.env.NODE_ENV === "development") {
    requestHeaders.set("x-usuario-id", session.usuarioId);
    requestHeaders.set("x-usuario-nombre", session.username);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
