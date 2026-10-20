// Anuncios de lanzamiento: lo que se avisa a las personas cuando sale una
// funcionalidad nueva. De aquí salen dos cosas, ambas cuando la persona ya
// entró a la app:
//   - una notificación especial en la campana (una vez por persona), y
//   - un aviso arriba que se cierra y deja esa notificación como leída.
// Cada anuncio dura DIAS_DE_ANUNCIO días desde su fecha.
//
// Cada lanzamiento de una funcionalidad nueva = una entrada aquí + la entrada
// de /cambios + la sección de la guía (lib/guia.ts). Ver CLAUDE.md.
// Va aparte del changelog para que el aviso no cargue todo ese texto.

import type { Locale } from "@/lib/i18n/config";

type Texto = Record<Locale, string>;

export type Anuncio = {
  // Único y estable: es la clave de la notificación (no se repite por persona).
  id: string;
  fecha: string; // YYYY-MM-DD de cuando se lanzó
  titulo: Texto;
  // Una o dos líneas para el aviso de arriba.
  texto: Texto;
  // A dónde lleva la notificación (dentro de la app).
  enlace: string;
};

export const DIAS_DE_ANUNCIO = 30;

// Del más reciente al más antiguo.
export const ANUNCIOS: Anuncio[] = [
  {
    id: "guia-2026-10",
    fecha: "2026-10-20",
    titulo: { en: "A guide inside the app", es: "Una guía dentro de la app" },
    texto: {
      en: "There is a new Guide that explains how each part of the app works. Look for the ? icon at the top.",
      es: "Hay una nueva Guía que explica cómo funciona cada parte de la app. Busca el ícono ? de arriba.",
    },
    enlace: "/guia",
  },
  {
    id: "proyectos-2026-10",
    fecha: "2026-10-20",
    titulo: { en: "Projects for big expenses", es: "Proyectos para gastos grandes" },
    texto: {
      en: "Plan a trip or any big expense: list what you have to pay and see how much to set aside each month.",
      es: "Planifica un viaje o cualquier gasto grande: anota lo que hay que pagar y mira cuánto apartar cada mes.",
    },
    enlace: "/proyectos",
  },
];

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

// Los anuncios que siguen vigentes hoy (ya lanzados y dentro de su ventana).
export function anunciosVigentes(hoy: string, dias: number = DIAS_DE_ANUNCIO): Anuncio[] {
  return ANUNCIOS.filter((a) => {
    const pasados = diasEntre(a.fecha, hoy);
    return pasados >= 0 && pasados < dias;
  });
}
