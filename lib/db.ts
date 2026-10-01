import postgres from "postgres";

// Una sola conexión por instancia del servidor (y por recarga en dev).
// prepare: false porque Supabase usa un pooler en modo transacción.
const global = globalThis as unknown as { __sql?: postgres.Sql };

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
  return process.env.DATA_BACKEND === "postgres";
}
