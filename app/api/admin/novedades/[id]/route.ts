import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { editarAnuncio, eliminarAnuncio } from "@/lib/anuncios-datos";

type Contexto = { params: Promise<{ id: string }> };

// Super-admin: reemplaza los datos de la novedad (mismo cuerpo que al crearla).
export async function PUT(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    const { id } = await params;
    await editarAnuncio(r.acceso.usuarioId, id, await req.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "Could not save the notice.");
  }
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    const { id } = await params;
    await eliminarAnuncio(r.acceso.usuarioId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "Could not save the notice.");
  }
}
