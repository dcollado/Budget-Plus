import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { ErrorCuenta } from "@/lib/auth/cuentas";
import { listHouseholds } from "@/lib/household/datos";
import {
  listarExcepcionesDeModulos,
  listarModulosPorDefecto,
  ponerModuloDeHogar,
  ponerModuloPorDefecto,
} from "@/lib/modulos-datos";
import { esModulo, type EstadoDeModulos } from "@/lib/modulos";

async function estado(): Promise<EstadoDeModulos> {
  const [porDefecto, excepciones, hogares] = await Promise.all([
    listarModulosPorDefecto(),
    listarExcepcionesDeModulos(),
    listHouseholds(),
  ]);

  return {
    porDefecto,
    hogares: hogares
      .map((h) => ({ id: h.id, nombre: h.name, excepciones: excepciones[h.id] ?? {} }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

// Super-admin: el estado de los módulos, por defecto y por hogar.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return NextResponse.json({ success: true, data: await estado() });
  } catch (error) {
    return manejarError(error, "Could not load the modules.");
  }
}

// { clave, activo: boolean }                    el valor por defecto de todos los hogares
// { clave, activo: boolean | null, hogarId }    la excepción de un hogar (null la quita)
export async function PUT(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as { clave?: unknown; activo?: unknown; hogarId?: unknown };
    if (!esModulo(body.clave)) throw new ErrorCuenta("Invalid request.");

    if (body.hogarId === undefined || body.hogarId === null || body.hogarId === "") {
      if (typeof body.activo !== "boolean") throw new ErrorCuenta("Invalid request.");
      await ponerModuloPorDefecto(r.acceso.usuarioId, body.clave, body.activo);
    } else {
      const hogarId = String(body.hogarId);
      if (body.activo !== null && typeof body.activo !== "boolean") throw new ErrorCuenta("Invalid request.");

      const hogares = await listHouseholds();
      if (!hogares.some((h) => h.id === hogarId)) throw new ErrorCuenta("Household not found.");

      await ponerModuloDeHogar(r.acceso.usuarioId, hogarId, body.clave, body.activo);
    }

    return NextResponse.json({ success: true, data: await estado() });
  } catch (error) {
    return manejarError(error, "Could not save the module.");
  }
}
