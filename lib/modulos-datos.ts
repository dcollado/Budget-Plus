import { getSql, usaPostgres } from "@/lib/db";
import { fallo } from "@/lib/api";
import { registrarEvento } from "@/lib/auth/eventos";
import { TODOS_ENCENDIDOS, type ModuloClave, type Modulos } from "@/lib/modulos";

// El estado de cada módulo. Si algo falla (tabla sin crear, base caída) todos se
// ven encendidos: apagar es una decisión explícita, nunca un efecto de un error.
export async function listarModulos(): Promise<Modulos> {
  const modulos = { ...TODOS_ENCENDIDOS };
  if (!usaPostgres()) return modulos;

  try {
    const filas = await getSql()<{ clave: string; activo: boolean }[]>`select clave, activo from modulos`;
    for (const f of filas) {
      if (f.clave in modulos) modulos[f.clave as ModuloClave] = f.activo;
    }
  } catch (error) {
    console.error("Could not read the modules:", error);
  }

  return modulos;
}

export async function moduloActivo(clave: ModuloClave): Promise<boolean> {
  return (await listarModulos())[clave];
}

// Para las rutas de un módulo: la respuesta de "apagado", o null si está encendido.
export async function moduloApagado(clave: ModuloClave): Promise<Response | null> {
  return (await moduloActivo(clave)) ? null : fallo("This module is turned off.", 403);
}

export async function ponerModulo(actorUserId: string, clave: ModuloClave, activo: boolean): Promise<void> {
  if (!usaPostgres()) throw new Error("Modules require the Postgres database.");

  await getSql()`
    insert into modulos (clave, activo) values (${clave}, ${activo})
    on conflict (clave) do update set activo = excluded.activo, actualizado_en = now()`;

  await registrarEvento({
    accion: "cambiar_modulo",
    actorUserId,
    objetivo: clave,
    detalle: activo ? "on" : "off",
  });
}
