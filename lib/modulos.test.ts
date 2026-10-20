import { describe, expect, it } from "vitest";
import { MODULOS, TODOS_ENCENDIDOS, esModulo, moduloDeLaRuta } from "./modulos";

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
});
