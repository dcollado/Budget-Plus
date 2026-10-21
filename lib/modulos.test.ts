import { describe, expect, it } from "vitest";
import { MODULOS, TODOS_ENCENDIDOS, combinarModulos, esModulo, moduloDeLaRuta } from "./modulos";

describe("módulos", () => {
  it("todos están encendidos por defecto", () => {
    for (const m of MODULOS) expect(TODOS_ENCENDIDOS[m.clave], m.clave).toBe(true);
    expect(Object.keys(TODOS_ENCENDIDOS).sort()).toEqual(MODULOS.map((m) => m.clave).sort());
  });

  it("reconoce las claves válidas", () => {
    expect(esModulo("proyectos")).toBe(true);
    expect(esModulo("reportes")).toBe(true);
    expect(esModulo("presupuesto")).toBe(false);
    expect(esModulo(undefined)).toBe(false);
  });

  it("encuentra el módulo de una ruta", () => {
    expect(moduloDeLaRuta("/proyectos")).toBe("proyectos");
    expect(moduloDeLaRuta("/reporte")).toBe("reportes");
    expect(moduloDeLaRuta("/reporte/2026")).toBe("reportes");
    expect(moduloDeLaRuta("/presupuesto")).toBeNull();
    expect(moduloDeLaRuta("/proyectosx")).toBeNull();
  });

  it("la excepción del hogar manda sobre el valor por defecto", () => {
    const apagados = { proyectos: false, reportes: false };

    // Apagado para todos, encendido solo para un hogar.
    expect(combinarModulos(apagados, { proyectos: true })).toEqual({ proyectos: true, reportes: false });
    // Encendido por defecto, apagado solo para un hogar.
    expect(combinarModulos(TODOS_ENCENDIDOS, { reportes: false })).toEqual({ proyectos: true, reportes: false });
    // Sin excepciones: el valor por defecto.
    expect(combinarModulos(apagados)).toEqual(apagados);
    expect(combinarModulos(apagados, {})).toEqual(apagados);
  });

  it("ignora valores que no son sí o no", () => {
    expect(combinarModulos(TODOS_ENCENDIDOS, { proyectos: undefined })).toEqual(TODOS_ENCENDIDOS);
  });

  it("no modifica el valor por defecto que recibe", () => {
    const base = { proyectos: false, reportes: false };
    combinarModulos(base, { proyectos: true });
    expect(base).toEqual({ proyectos: false, reportes: false });
  });
});