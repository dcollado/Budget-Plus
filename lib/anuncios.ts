// Novedades (anuncios de lanzamiento): lo que se avisa a las personas cuando
// sale una funcionalidad nueva. Las administra el super-admin (Admin >
// Novedades) y viven en la tabla "anuncios". De cada una salen dos cosas, ambas
// cuando la persona ya entró a la app:
//   - una notificación especial en la campana (una vez por persona), y
//   - un aviso arriba que se cierra y deja esa notificación como leída.
// Este archivo es lo puro (tipos, vigencia, validación); el acceso a la base
// está en lib/anuncios-datos.ts.
//
// Cada lanzamiento de una funcionalidad nueva = una novedad en el Admin + la
// entrada de /cambios + la sección de la guía (lib/guia.ts). Ver CLAUDE.md.

import type { Locale } from "@/lib/i18n/config";

type Texto = Record<Locale, string>;

export type Anuncio = {
  // Único y estable: es la clave de la notificación (no se repite por persona).
  id: string;
  fecha: string; // YYYY-MM-DD en que empieza a verse
  dias: number; // cuántos días está vivo, contados desde la fecha
  activo: boolean;
  titulo: Texto;
  // Una o dos líneas para el aviso de arriba.
  texto: Texto;
  // A dónde lleva (dentro de la app).
  enlace: string;
};

// Las notificaciones se conservan 60 días (lib/notificaciones.ts): un aviso no
// puede durar más, o reaparecería después de limpiarse.
export const DIAS_MIN = 1;
export const DIAS_MAX = 60;
export const DIAS_POR_DEFECTO = 14;

export type EstadoAnuncio = "vigente" | "programado" | "vencido" | "apagado";

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

// Último día en que se ve (inclusive).
export function fechaFinDelAnuncio(a: Pick<Anuncio, "fecha" | "dias">): string {
  const [y, m, d] = a.fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + a.dias - 1)).toISOString().slice(0, 10);
}

export function estadoDelAnuncio(a: Anuncio, hoy: string): EstadoAnuncio {
  if (!a.activo) return "apagado";
  const pasados = diasEntre(a.fecha, hoy);
  if (pasados < 0) return "programado";
  if (pasados >= a.dias) return "vencido";
  return "vigente";
}

// Cuántos días le quedan (contando hoy); 0 si no está vigente.
export function diasRestantes(a: Anuncio, hoy: string): number {
  return estadoDelAnuncio(a, hoy) === "vigente" ? a.dias - diasEntre(a.fecha, hoy) : 0;
}

export function anunciosVigentes(lista: Anuncio[], hoy: string): Anuncio[] {
  return lista.filter((a) => estadoDelAnuncio(a, hoy) === "vigente");
}

export type EntradaAnuncio = {
  titulo: Texto;
  texto: Texto;
  enlace: string;
  fecha: string;
  dias: number;
  activo: boolean;
};

// Revisa y limpia lo que escribe el super-admin. Tira Error con un mensaje en
// inglés (la API lo traduce).
export function validarAnuncio(entrada: unknown): EntradaAnuncio {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const cadena = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const t = (e.titulo ?? {}) as Record<string, unknown>;
  const x = (e.texto ?? {}) as Record<string, unknown>;

  const titulo = { en: cadena(t.en), es: cadena(t.es) };
  const texto = { en: cadena(x.en), es: cadena(x.es) };
  if (!titulo.en || !titulo.es) throw new Error("Enter a title in both languages.");
  if (!texto.en || !texto.es) throw new Error("Enter the text in both languages.");
  if (titulo.en.length > 80 || titulo.es.length > 80) throw new Error("Titles can have up to 80 characters.");
  if (texto.en.length > 240 || texto.es.length > 240) throw new Error("Texts can have up to 240 characters.");

  const enlace = cadena(e.enlace);
  if (!/^\/[a-z0-9][a-z0-9\-/#?=&_]*$/i.test(enlace)) {
    throw new Error("The link must start with / and point inside the app.");
  }

  const fecha = cadena(e.fecha);
  const valida =
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
  if (!valida) throw new Error("Enter a valid start date.");

  const dias = Number(e.dias);
  if (!Number.isInteger(dias) || dias < DIAS_MIN || dias > DIAS_MAX) {
    throw new Error(`Days visible must be between ${DIAS_MIN} and ${DIAS_MAX}.`);
  }

  return { titulo, texto, enlace, fecha, dias, activo: e.activo !== false };
}
