import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { archivarHogar, eliminarHogar, restaurarHogar } from "@/lib/admin/hogares";
import { ErrorCuenta } from "@/lib/auth/cuentas";

type Contexto = { params: Promise<{ id: string }> };

function manejarError(error: unknown, mensaje: string) {
  if (error instanceof ErrorCuenta) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ success: false, message: mensaje }, { status: 500 });
}

// Archivar o restaurar un hogar: { accion: "archivar" | "restaurar" }.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id } = await params;
    const body = (await req.json()) as { accion?: unknown };

    if (body.accion === "archivar") {
      await archivarHogar(id, r.acceso.usuarioId);
    } else if (body.accion === "restaurar") {
      await restaurarHogar(id, r.acceso.usuarioId);
    } else {
      return NextResponse.json({ success: false, message: "Acción inválida." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "No se pudo actualizar el hogar.");
  }
}

// Eliminar definitivamente: ?confirmar=<nombre exacto del hogar>. Solo
// hogares ya archivados.
export async function DELETE(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const { id } = await params;
    const confirmar = req.nextUrl.searchParams.get("confirmar") ?? "";

    await eliminarHogar(id, confirmar, r.acceso.usuarioId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return manejarError(error, "No se pudo eliminar el hogar.");
  }
}
