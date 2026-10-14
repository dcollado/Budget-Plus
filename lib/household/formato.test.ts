import { afterEach, describe, expect, it, vi } from "vitest";
import { formatearMes, mesActual, mesSiguiente } from "./formato";

afterEach(() => {
  vi.useRealTimers();
});

describe("mesSiguiente", () => {
  it("avanza un mes y salta de año", () => {
    expect(mesSiguiente("2026-03")).toBe("2026-04");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
  });
});

describe("formatearMes", () => {
  it("escribe el mes en español", () => {
    expect(formatearMes("2026-09")).toBe("septiembre 2026");
  });
});

describe("mesActual (hora de Panamá)", () => {
  it("a las 23:00 de Panamá del último día sigue siendo ese mes aunque en UTC ya sea el siguiente", () => {
    // 2026-10-01T04:00Z = 2026-09-30 23:00 en Panamá.
    expect(mesActual(Date.parse("2026-10-01T04:00:00Z"))).toBe("2026-09");
  });

  it("pasa al mes siguiente a medianoche de Panamá", () => {
    // 2026-10-01T05:00Z = 2026-10-01 00:00 en Panamá.
    expect(mesActual(Date.parse("2026-10-01T05:00:00Z"))).toBe("2026-10");
  });

  it("sin argumento usa la hora actual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T03:00:00Z"));
    expect(mesActual()).toBe("2026-12");
  });
});
