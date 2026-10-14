import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getSql, usaPostgres } from "@/lib/db";
import { registrarEvento } from "@/lib/auth/eventos";

function error(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Editar el propio nombre. El correo y el rol los cambia un administrador.
export async function PATCH(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);
    if (!usuarioId) return error("Unauthorized.", 401);

    if (!usaPostgres()) {
      return error("Editing the profile requires the Postgres database.", 400);
    }

    const body = (await req.json()) as { nombre?: unknown };
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";

    if (!nombre) return error("The name cannot be empty.", 400);
    if (nombre.length > 60) return error("The name is too long (maximum 60).", 400);

    const sql = getSql();

    await sql.begin(async (tx) => {
      await tx`update usuarios set nombre = ${nombre} where id = ${usuarioId} and activo`;
      // El nombre con el que sales en el presupuesto (dueño de cada gasto).
      await tx`update members set display_name = ${nombre} where user_id = ${usuarioId}`;
    });

    await registrarEvento({
      accion: "editar_miembro",
      actorUserId: usuarioId,
      objetivoUserId: usuarioId,
      detalle: "name (from their profile)",
    });

    return NextResponse.json({ success: true, data: { nombre } });
  } catch (e) {
    console.error("Error editing profile:", e);
    return error("Could not save the name.", 500);
  }
}
