import { afterEach, describe, expect, it, vi } from "vitest";
import { formatearMes, mesActual, mesSiguiente } from "./formato";

afterEach(() => {
  vi.useRealTimers();
});

describe("mesSiguiente", () => {
  it("advances a month and rolls over the year", () => {
    expect(mesSiguiente("2026-03")).toBe("2026-04");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
  });
});

describe("formatearMes", () => {
  it("writes the month in English", () => {
    expect(formatearMes("2026-09")).toBe("September 2026");
  });
});

describe("mesActual (Panama time)", () => {
  it("at 23:00 Panama time on the last day it is still that month even if UTC is already the next", () => {
    // 2026-10-01T04:00Z = 2026-09-30 23:00 in Panama.
    expect(mesActual(Date.parse("2026-10-01T04:00:00Z"))).toBe("2026-09");
  });

  it("moves to the next month at midnight Panama time", () => {
    // 2026-10-01T05:00Z = 2026-10-01 00:00 in Panama.
    expect(mesActual(Date.parse("2026-10-01T05:00:00Z"))).toBe("2026-10");
  });

  it("with no argument uses the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T03:00:00Z"));
    expect(mesActual()).toBe("2026-12");
  });
});
