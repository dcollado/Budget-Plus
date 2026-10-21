import { getSql, usaPostgres } from "@/lib/db";
import { fallo } from "@/lib/api";
import { registrarEvento } from "@/lib/auth/eventos";
import { TODOS_ENCENDIDOS, combinarModulos, type ModuloClave, type Modulos } from "@/lib/modulos";

// Cada módulo tiene un valor por defecto para todos los hogares (tabla "modulos") y,
// si hace falta, una excepción por hogar (tabla "modulos_hogar"): la del hogar
// manda. Si algo falla (tabla sin crear, base caída) todo se ve encendido: apagar
// es una decisión explícita, nunca un efecto de un error.

export async function listarModulosPorDefecto(): Promise<Modulos> {
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

// Las excepciones de cada hogar: { hogar: { proyectos: false } }.
export async function listarExcepcionesDeModulos(): Promise<Record<string, Partial<Modulos>>> {
  const salida: Record<string, Partial<Modulos>> = {};
  if (!usaPostgres()) return salida;

  try {
    const filas = await getSql()<{ household_id: string; clave: string; activo: boolean }[]>`
      select household_id, clave, activo from modulos_hogar`;
    for (const f of filas) {
      if (f.clave in TODOS_ENCENDIDOS) {
        (salida[f.household_id] ??= {})[f.clave as ModuloClave] = f.activo;
      }
    }
  } catch (error) {
    console.error("Could not read the household modules:", error);
  }

  return salida;
}

// Lo que ve un hogar: su excepción si la tiene, y si no, el valor por defecto.
export async function listarModulos(householdId?: string | null): Promise<Modulos> {
  const porDefecto = await listarModulosPorDefecto();
  if (!householdId || !usaPostgres()) return porDefecto;

  try {
    const filas = await getSql()<{ clave: string; activo: boolean }[]>`
      select clave, activo from modulos_hogar where household_id = ${householdId}`;
    const excepciones: Partial<Modulos> = {};
    for (const f of filas) {
      if (f.clave in porDefecto) excepciones[f.clave as ModuloClave] = f.activo;
    }
    return combinarModulos(porDefecto, excepciones);
  } catch (error) {
    console.error("Could not read the household modules:", error);
    return porDefecto;
  }
}

export async function moduloActivo(clave: ModuloClave, householdId?: string | null): Promise<boolean> {
  return (await listarModulos(householdId))[clave];
}

// Para las rutas de un módulo: la respuesta de "apagado", o null si está encendido.
export async function moduloApagado(clave: ModuloClave, householdId?: string | null): Promise<Response | null> {
  return (await moduloActivo(clave, householdId)) ? null : fallo("This module is turned off.", 403);
}

// El valor por defecto de todos los hogares.
export async function ponerModuloPorDefecto(actorUserId: string, clave: ModuloClave, activo: boolean): Promise<void> {
  if (!usaPostgres()) throw new Error("Modules require the Postgres database.");

  await getSql()`
    insert into modulos (clave, activo) values (${clave}, ${activo})
    on conflict (clave) do update set activo = excluded.activo, actualizado_en = now()`;

  await registrarEvento({
    accion: "cambiar_modulo",
    actorUserId,
    objetivo: clave,
    detalle: activo ? "default: on" : "default: off",
  });
}

// La excepción de un hogar: true/false, o null para quitarla (vuelve al valor por defecto).
export async function ponerModuloDeHogar(
  actorUserId: string,
  householdId: string,
  clave: ModuloClave,
  activo: boolean | null
): Promise<void> {
  if (!usaPostgres()) throw new Error("Modules require the Postgres database.");

  if (activo === null) {
    await getSql()`delete from modulos_hogar where household_id = ${householdId} and clave = ${clave}`;
  } else {
    await getSql()`
      insert into modulos_hogar (household_id, clave, activo) values (${householdId}, ${clave}, ${activo})
      on conflict (household_id, clave) do update set activo = excluded.activo, actualizado_en = now()`;
  }

  await registrarEvento({
    accion: "cambiar_modulo",
    actorUserId,
    householdId,
    objetivo: clave,
    detalle: activo === null ? "default" : activo ? "on" : "off",
  });
}
