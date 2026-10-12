import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { obtenerAcceso } from "@/lib/auth/acceso";

// Lo mínimo que la UI necesita para decidir qué mostrar (links de admin).
// La autorización real siempre se vuelve a verificar en cada ruta.
export async function GET(req: NextRequest) {
  const usuarioId = getUsuarioId(req);
  const acceso = usuarioId ? await obtenerAcceso(usuarioId) : null;

  if (!acceso) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: { esSuperadmin: acceso.esSuperadmin, rol: acceso.rol },
  });
}
