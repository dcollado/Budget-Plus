import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { sesionVigente } from "@/lib/auth/sesion-vigente";

// Identidad de quien hace la petición, sacada de la cookie FIRMADA: cada ruta
// la verifica por sí misma y no confía en que el proxy haya corrido antes
// (si el proxy se saltara por un fallo del framework, una cabecera se podría
// falsificar; una firma HMAC no). Se revalida contra la base igual que en el
// proxy (cuenta activa, hogar no archivado, versión de sesión); el caché de
// sesion-vigente evita consultas repetidas.
export type Identidad = { usuarioId: string; nombre: string };

export async function getIdentidad(req: NextRequest): Promise<Identidad | null> {
  const sesion = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);

  if (sesion) {
    if (!(await sesionVigente(sesion.usuarioId, sesion.sv ?? 0))) return null;
    return { usuarioId: sesion.usuarioId, nombre: sesion.username };
  }

  // Solo con `next dev`: el proxy deja la identidad de DEV_AUTO_LOGIN_* en
  // cabeceras la primera vez (todavía no hay cookie). Nunca en producción.
  if (process.env.NODE_ENV === "development") {
    const usuarioId = req.headers.get("x-usuario-id");
    const nombre = req.headers.get("x-usuario-nombre");
    if (usuarioId && nombre) return { usuarioId, nombre };
  }

  return null;
}

export async function getUsuarioId(req: NextRequest): Promise<string | null> {
  return (await getIdentidad(req))?.usuarioId ?? null;
}

export async function getUsuarioNombre(req: NextRequest): Promise<string | null> {
  return (await getIdentidad(req))?.nombre ?? null;
}
