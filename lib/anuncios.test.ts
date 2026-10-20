import { describe, expect, it } from "vitest";
import { ANUNCIOS, anunciosVigentes } from "./anuncios";

// Los anuncios los ve cualquier persona del hogar: no pueden mencionar
// herramientas de administración de la plataforma.
const PROHIBIDAS = [/\badmin\b/i, /super-?admin/i, /administrat/i, /administraci/i, /administrador/i];

describe("anuncios de lanzamiento", () => {
  it("tienen id único, textos en los dos idiomas y un enlace dentro de la app", () => {
    const ids = ANUNCIOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const a of ANUNCIOS) {
      expect(a.fecha, a.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const texto of [a.titulo.en, a.titulo.es, a.texto.en, a.texto.es]) {
        expect(texto.trim().length, `${a.id}: texto vacío`).toBeGreaterThan(0);
        for (const patron of PROHIBIDAS) expect(texto, `${a.id}: "${texto}"`).not.toMatch(patron);
      }
      expect(a.enlace, a.id).toMatch(/^\/[a-z]/);
    }
  });

  it("están del más reciente al más antiguo", () => {
    const fechas = ANUNCIOS.map((a) => a.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });
});

describe("anunciosVigentes", () => {
  it("solo los ya lanzados y dentro de su ventana de 30 días", () => {
    const fecha = ANUNCIOS[0].fecha;

    expect(anunciosVigentes("2000-01-01")).toEqual([]); // todavía no se lanza
    expect(anunciosVigentes(fecha).map((a) => a.id)).toContain(ANUNCIOS[0].id);
    expect(anunciosVigentes("2099-01-01")).toEqual([]); // ya venció
  });

  it("el día 29 sigue vigente y el día 30 ya no", () => {
    const fecha = ANUNCIOS[0].fecha;
    const [a, m, d] = fecha.split("-").map(Number);
    const mas = (n: number) => new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);

    expect(anunciosVigentes(mas(29)).map((x) => x.id)).toContain(ANUNCIOS[0].id);
    expect(anunciosVigentes(mas(30)).map((x) => x.id)).not.toContain(ANUNCIOS[0].id);
  });

});
