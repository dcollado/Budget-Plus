import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { ErrorCuenta } from "@/lib/auth/cuentas";
import { listarModulos, ponerModulo } from "@/lib/modulos-datos";
import { esModulo } from "@/lib/modulos";

// Super-admin: el estado de los módulos.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return NextResponse.json({ success: true, data: await listarModulos() });
  } catch (error) {
    return manejarError(error, "Could not load the modules.");
  }
}

// { clave: "proyectos" | "reportes", activo: boolean }
export async function PUT(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as { clave?: unknown; activo?: unknown };
    if (!esModulo(body.clave) || typeof body.activo !== "boolean") {
      throw new ErrorCuenta("Invalid request.");
    }

    await ponerModulo(r.acceso.usuarioId, body.clave, body.activo);
    return NextResponse.json({ success: true, data: await listarModulos() });
  } catch (error) {
    return manejarError(error, "Could not save the module.");
  }
}
