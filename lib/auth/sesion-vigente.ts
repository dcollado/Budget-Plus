import { getSql, usaPostgres } from "@/lib/db";

// Una sesión firmada puede seguir "válida" por firma y fecha pero ya no
// valer: la cuenta se desactivó, el hogar se archivó o se cambió la
// contraseña (sesion_version). Se comprueba contra la base en cada
// petición, con un cachecito corto por instancia para no sumar una consulta
// a cada recurso de una misma página.

const TTL_MS = 10_000;

type Estado = { vigente: boolean; version: number; hasta: number };
const cache = new Map<string, Estado>();

type Fila = {
  activo: boolean;
  sesion_version: number;
  es_superadmin: boolean;
  archivado_en: Date | null;
};

async function leerEstado(usuarioId: string): Promise<Estado> {
  const [fila] = await getSql()<Fila[]>`
    select u.activo, u.sesion_version, u.es_superadmin, h.archivado_en
    from usuarios u
    left join members m on m.user_id = u.id
    left join households h on h.id = m.household_id
    where u.id = ${usuarioId}`;

  const vigente =
    Boolean(fila) &&
    fila.activo &&
    // Un hogar archivado deja a todos afuera, salvo al super-admin.
    (fila.archivado_en === null || fila.es_superadmin);

  return { vigente, version: fila?.sesion_version ?? 0, hasta: Date.now() + TTL_MS };
}

// `version` es la del token: si no coincide con la guardada (o la guardada
// dice "no vigente"), puede que el caché esté viejo (ej. recién restablecida
// la contraseña y esta es la sesión nueva), así que se relee de la base.
async function estadoDe(usuarioId: string, version?: number): Promise<Estado> {
  const guardado = cache.get(usuarioId);
  if (
    guardado &&
    guardado.hasta > Date.now() &&
    guardado.vigente &&
    (version === undefined || guardado.version === version)
  ) {
    return guardado;
  }

  const nuevo = await leerEstado(usuarioId);
  cache.set(usuarioId, nuevo);
  return nuevo;
}

export async function sesionVigente(usuarioId: string, version: number): Promise<boolean> {
  if (!usaPostgres()) return true;

  const estado = await estadoDe(usuarioId, version);
  return estado.vigente && estado.version === version;
}

// Versión actual de la cuenta (para emitir la sesión de desarrollo).
export async function versionDeSesion(usuarioId: string): Promise<number> {
  if (!usaPostgres()) return 0;
  return (await leerEstado(usuarioId)).version;
}

// Tras cambiar contraseña o estado en esta misma instancia, no esperar al TTL.
export function olvidarEstado(usuarioId: string): void {
  cache.delete(usuarioId);
}
