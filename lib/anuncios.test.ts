import { describe, expect, it } from "vitest";
import {
  anunciosVigentes,
  diasRestantes,
  estadoDelAnuncio,
  fechaFinDelAnuncio,
  validarAnuncio,
  type Anuncio,
} from "./anuncios";

const base: Anuncio = {
  id: "a",
  fecha: "2026-10-20",
  dias: 30,
  activo: true,
  titulo: { en: "Title", es: "Título" },
  texto: { en: "Text", es: "Texto" },
  enlace: "/proyectos",
};

const mas = (fecha: string, n: number) => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};

describe("estado y vigencia", () => {
  it("programado antes de empezar, vigente en la ventana, vencido después", () => {
    expect(estadoDelAnuncio(base, "2026-10-19")).toBe("programado");
    expect(estadoDelAnuncio(base, "2026-10-20")).toBe("vigente");
    expect(estadoDelAnuncio(base, mas(base.fecha, 29))).toBe("vigente");
    expect(estadoDelAnuncio(base, mas(base.fecha, 30))).toBe("vencido");
  });

  it("apagado manda sobre las fechas", () => {
    expect(estadoDelAnuncio({ ...base, activo: false }, "2026-10-25")).toBe("apagado");
  });

  it("la duración es la que se configura", () => {
    const corto = { ...base, dias: 7 };
    expect(estadoDelAnuncio(corto, mas(base.fecha, 6))).toBe("vigente");
    expect(estadoDelAnuncio(corto, mas(base.fecha, 7))).toBe("vencido");
    expect(fechaFinDelAnuncio(corto)).toBe("2026-10-26");
  });

  it("cuenta los días que quedan, contando hoy", () => {
    expect(diasRestantes(base, "2026-10-20")).toBe(30);
    expect(diasRestantes(base, mas(base.fecha, 29))).toBe(1);
    expect(diasRestantes(base, mas(base.fecha, 30))).toBe(0);
  });

  it("filtra solo los vigentes", () => {
    const lista = [base, { ...base, id: "b", activo: false }, { ...base, id: "c", fecha: "2030-01-01" }];
    expect(anunciosVigentes(lista, "2026-11-01").map((a) => a.id)).toEqual(["a"]);
  });
});

describe("validarAnuncio", () => {
  const ok = {
    titulo: { en: " New ", es: "Nuevo" },
    texto: { en: "Text", es: "Texto" },
    enlace: "/proyectos",
    fecha: "2026-10-20",
    dias: 14,
    activo: true,
  };

  it("limpia espacios y acepta una entrada correcta", () => {
    const v = validarAnuncio(ok);
    expect(v.titulo.en).toBe("New");
    expect(v.dias).toBe(14);
  });

  it("pide los dos idiomas", () => {
    expect(() => validarAnuncio({ ...ok, titulo: { en: "", es: "x" } })).toThrow(/title/i);
    expect(() => validarAnuncio({ ...ok, texto: { en: "x", es: " " } })).toThrow(/text/i);
  });

  it("el enlace debe ser una ruta de la app", () => {
    for (const enlace of ["https://x.com", "//x.com", "proyectos", "/", "javascript:alert(1)"]) {
      expect(() => validarAnuncio({ ...ok, enlace }), enlace).toThrow(/link/i);
    }
    expect(() => validarAnuncio({ ...ok, enlace: "/guia#proyectos" })).not.toThrow();
  });

  it("la fecha debe existir", () => {
    expect(() => validarAnuncio({ ...ok, fecha: "2026-02-31" })).toThrow(/date/i);
    expect(() => validarAnuncio({ ...ok, fecha: "ayer" })).toThrow(/date/i);
  });

  it("los días van de 1 a 60", () => {
    for (const dias of [0, 61, 1.5, "abc"]) {
      expect(() => validarAnuncio({ ...ok, dias }), String(dias)).toThrow(/days/i);
    }
    expect(validarAnuncio({ ...ok, dias: 60 }).dias).toBe(60);
    expect(validarAnuncio({ ...ok, dias: 1 }).dias).toBe(1);
  });
});
