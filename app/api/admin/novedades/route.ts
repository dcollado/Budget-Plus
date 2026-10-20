import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { crearAnuncio, listarAnuncios } from "@/lib/anuncios-datos";
import { fechaEnPanama } from "@/lib/notificaciones";

// Super-admin: las novedades (anuncios de lanzamiento) y la fecha de hoy en
// Panamá, para mostrar su estado.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return NextResponse.json({
      success: true,
      data: { anuncios: await listarAnuncios(), hoy: fechaEnPanama() },
    });
  } catch (error) {
    return manejarError(error, "Could not load the notices.");
  }
}

// { titulo: {en, es}, texto: {en, es}, enlace, fecha, dias, activo }
export async function POST(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    const anuncio = await crearAnuncio(r.acceso.usuarioId, await req.json());
    return NextResponse.json({ success: true, data: anuncio });
  } catch (error) {
    return manejarError(error, "Could not save the notice.");
  }
}
