import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Falta DATABASE_URL en las variables de entorno.");
  }

  return url;
}

export const db = drizzle(neon(getUrl()), { schema });
