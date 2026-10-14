import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId, getUsuarioNombre } from "@/lib/current-user";
import { obtenerAcceso } from "@/lib/auth/acceso";
import { getSql, usaPostgres } from "@/lib/db";

// Quién está conectado y lo mínimo que la UI necesita (cabecera, perfil,
// links de admin). La autorización real se vuelve a verificar en cada ruta.
export async function GET(req: NextRequest) {
  const usuarioId = getUsuarioId(req);
  const acceso = usuarioId ? await obtenerAcceso(usuarioId) : null;

  if (!usuarioId || !acceso) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let nombre = getUsuarioNombre(req) ?? "";
  let email: string | null = null;
  let hogar: string | null = null;
  let usuario = getUsuarioNombre(req) ?? "";
  let idioma: string | null = null;

  if (usaPostgres()) {
    const [fila] = await getSql()<
      { nombre: string; usuario: string; email: string | null; hogar: string | null; idioma: string | null }[]
    >`
      select u.nombre, u.usuario, u.email, h.name as hogar, u.idioma
      from usuarios u
      left join members m on m.user_id = u.id
      left join households h on h.id = m.household_id
      where u.id = ${usuarioId}`;

    if (fila) {
      nombre = fila.nombre || fila.usuario;
      usuario = fila.usuario;
      email = fila.email;
      hogar = fila.hogar;
      idioma = fila.idioma;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      nombre,
      usuario,
      email,
      hogar,
      idioma,
      esSuperadmin: acceso.esSuperadmin,
      rol: acceso.rol,
    },
  });
}
