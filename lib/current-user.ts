import type { NextRequest } from "next/server";

// El middleware ya verificó la sesión y puso estos headers en la
// request — las rutas no necesitan re-verificar la cookie, solo leerlos.
export function getUsuarioId(req: NextRequest): string | null {
  return req.headers.get("x-usuario-id");
}

export function getUsuarioNombre(req: NextRequest): string | null {
  return req.headers.get("x-usuario-nombre");
}
