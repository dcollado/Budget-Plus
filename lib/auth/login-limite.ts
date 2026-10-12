import { getSql, usaPostgres } from "@/lib/db";

// Freno a la fuerza bruta. Los intentos fallidos se guardan en la base (no
// en memoria: en serverless cada petición puede caer en otra instancia).
// Con la hoja de Google (sin Postgres) no hay dónde guardarlos y no limita.

const VENTANA_MINUTOS = 15;
const MAX_POR_USUARIO = 5;
const MAX_POR_IP = 20;

const claveUsuario = (usuario: string) => `u:${usuario.trim().toLowerCase()}`;
const claveIp = (ip: string) => `ip:${ip}`;

export async function loginBloqueado(usuario: string, ip: string): Promise<boolean> {
  if (!usaPostgres()) return false;

  const filas = await getSql()<{ clave: string; n: number }[]>`
    select clave, count(*)::int as n
    from login_intentos
    where clave in (${claveUsuario(usuario)}, ${claveIp(ip)})
      and at > now() - ${VENTANA_MINUTOS + " minutes"}::interval
    group by clave`;

  return filas.some((f) =>
    f.clave.startsWith("u:") ? f.n >= MAX_POR_USUARIO : f.n >= MAX_POR_IP
  );
}

export async function registrarFallo(usuario: string, ip: string): Promise<void> {
  if (!usaPostgres()) return;

  const sql = getSql();
  await sql`
    insert into login_intentos (clave, at)
    values (${claveUsuario(usuario)}, now()), (${claveIp(ip)}, now())`;
  // Limpieza barata de lo viejo para que la tabla no crezca.
  await sql`delete from login_intentos where at < now() - interval '1 day'`;
}

export async function limpiarFallos(usuario: string): Promise<void> {
  if (!usaPostgres()) return;
  await getSql()`delete from login_intentos where clave = ${claveUsuario(usuario)}`;
}
