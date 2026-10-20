import { describe, expect, it } from "vitest";
import { GUIA } from "./guia";
import { seccionDeLaGuia } from "./guia-seccion";

const RUTAS = ["/", "/presupuesto", "/proyectos", "/reporte", "/configuracion", "/perfil", "/miembros", "/otra"];

describe("guía", () => {
  it("las secciones tienen id único y texto en los dos idiomas", () => {
    const ids = GUIA.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const s of GUIA) {
      for (const texto of [s.titulo, s.intro]) {
        expect(texto.en.trim().length, `${s.id} en`).toBeGreaterThan(0);
        expect(texto.es.trim().length, `${s.id} es`).toBeGreaterThan(0);
      }
      for (const loc of ["en", "es"] as const) {
        expect(s.puntos[loc].length, `${s.id} ${loc}`).toBeGreaterThan(0);
        for (const p of s.puntos[loc]) expect(p.trim().length, `${s.id} ${loc}`).toBeGreaterThan(0);
      }
      expect(s.puntos.en.length, s.id).toBe(s.puntos.es.length);
    }
  });

  it("el ícono de ayuda siempre lleva a una sección que existe", () => {
    const ids = GUIA.map((s) => s.id);
    for (const ruta of RUTAS) expect(ids, ruta).toContain(seccionDeLaGuia(ruta));
  });
});
