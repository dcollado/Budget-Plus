import { describe, expect, it } from "vitest";
import { centavosDe, fechaValida, mesValido } from "./validacion";

describe("centavosDe", () => {
  it("converts valid amounts", () => {
    expect(centavosDe(10)).toBe(1000);
    expect(centavosDe(12.5)).toBe(1250);
    expect(centavosDe("19.99")).toBe(1999);
    expect(centavosDe(0)).toBe(0);
  });

  it("redondea sin el error del float", () => {
    expect(centavosDe(1.005)).toBe(101);
    expect(centavosDe(0.1 + 0.2)).toBe(30);
    expect(centavosDe("2.675")).toBe(268);
  });

  it("rechaza lo que no es un monto", () => {
    expect(centavosDe("")).toBeNull();
    expect(centavosDe(null)).toBeNull();
    expect(centavosDe(undefined)).toBeNull();
    expect(centavosDe("abc")).toBeNull();
    expect(centavosDe(-5)).toBeNull();
    expect(centavosDe("-5")).toBeNull();
    expect(centavosDe(NaN)).toBeNull();
    expect(centavosDe(Infinity)).toBeNull();
    expect(centavosDe(1e21)).toBeNull();
    expect(centavosDe(1e15)).toBeNull();
  });
});

describe("fechaValida", () => {
  it("acepta fechas reales", () => {
    expect(fechaValida("2026-02-28")).toBe(true);
    expect(fechaValida("2028-02-29")).toBe(true);
  });

  it("rechaza fechas que no existen o mal formadas", () => {
    expect(fechaValida("2026-02-31")).toBe(false);
    expect(fechaValida("2026-13-01")).toBe(false);
    expect(fechaValida("2026-00-10")).toBe(false);
    expect(fechaValida("2026-2-3")).toBe(false);
    expect(fechaValida(20260101)).toBe(false);
  });
});

describe("mesValido", () => {
  it("valida YYYY-MM con mes 01-12", () => {
    expect(mesValido("2026-09")).toBe(true);
    expect(mesValido("2026-13")).toBe(false);
    expect(mesValido("2026-00")).toBe(false);
    expect(mesValido("2026-9")).toBe(false);
    expect(mesValido(undefined)).toBe(false);
  });
});
