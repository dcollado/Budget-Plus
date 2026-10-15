import { describe, expect, it } from "vitest";
import { CHANGELOG } from "./changelog";

// /cambios es pública: no puede mencionar herramientas de administración de la
// plataforma (panel Admin, super-admin, registro de actividad…). Si un cambio es
// solo de administración, no va en el changelog.
const PROHIBIDAS = [/\badmin\b/i, /super-?admin/i, /administrat/i, /administraci/i, /administrador/i];

describe("changelog público", () => {
  it("no menciona cambios de administración", () => {
    for (const entrada of CHANGELOG) {
      const textos = [
        entrada.titulo.en,
        entrada.titulo.es,
        ...entrada.cambios.flatMap((c) => [c.texto.en, c.texto.es]),
      ];

      for (const texto of textos) {
        for (const patron of PROHIBIDAS) {
          expect(texto, `${entrada.fecha}: "${texto}"`).not.toMatch(patron);
        }
      }
    }
  });

  it("está ordenado del más reciente al más antiguo y con cambios en cada entrada", () => {
    const fechas = CHANGELOG.map((e) => e.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
    for (const entrada of CHANGELOG) expect(entrada.cambios.length).toBeGreaterThan(0);
  });
});
