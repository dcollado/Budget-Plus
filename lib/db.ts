import postgres from "postgres";

// Una sola conexión por instancia del servidor (y por recarga en dev).
// prepare: false porque Supabase usa un pooler en modo transacción.
const global = globalThis as unknown as { __sql?: postgres.Sql; __avisoBackend?: boolean };

export function getSql(): postgres.Sql {
  if (!global.__sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL en las variables de entorno.");
    global.__sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  }
  return global.__sql;
}

// Qué guarda los datos: "postgres" (Supabase) o, por defecto, la hoja de
// Google. Cambiar DATA_BACKEND permite volver a la hoja sin tocar código.
export function usaPostgres(): boolean {
  const backend = process.env.DATA_BACKEND;

  // Sin definir cae en la hoja: sin roles, sin freno de login y sin
  // revocación de sesiones. En producción casi seguro es un olvido.
  if (!backend && process.env.NODE_ENV === "production" && !global.__avisoBackend) {
    global.__avisoBackend = true;
    console.warn(
      "DATA_BACKEND no está definido: se usa la hoja de Google (sin roles ni revocación de sesión). Define DATA_BACKEND=postgres."
    );
  }

  return backend === "postgres";
}
