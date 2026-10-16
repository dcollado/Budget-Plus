import { describe, expect, it } from "vitest";
import { fechaEnPanama, recordatoriosDePago, sumarDias } from "./notificaciones";
import type { CategoriaDelMes } from "./household/presupuesto";

function item(opts: {
  id?: string;
  nombre?: string;
  kind?: "expense" | "income";
  fixed?: boolean;
  monto?: number;
  fechaPago?: string;
  fechaPago2?: string;
  pagado?: boolean;
}): CategoriaDelMes {
  return {
    category: {
      id: opts.id ?? "c1",
      name: opts.nombre ?? "Rent",
      kind: opts.kind ?? "expense",
      fixed: opts.fixed ?? true,
    },
    plannedAmountCents: opts.monto ?? 100000,
    inherited: false,
    actualCents: 0,
    fechaPago: opts.fechaPago ?? "",
    fechaPago2: opts.fechaPago2 ?? "",
    nota: "",
    pagado: opts.pagado ?? false,
  } as unknown as CategoriaDelMes;
}

describe("recordatorios de pago", () => {
  const hoy = "2026-10-15";

  it("avisa de los pagos de hoy y de mañana", () => {
    const r = recordatoriosDePago(
      [
        item({ id: "a", fechaPago: "2026-10-15" }),
        item({ id: "b", fechaPago: "2026-10-16" }),
        item({ id: "c", fechaPago: "2026-10-20" }),
      ],
      hoy
    );

    expect(r.map((x) => [x.clave, x.tipo])).toEqual([
      ["pago:a:2026-10-15:hoy", "pago_hoy"],
      ["pago:b:2026-10-16:manana", "pago_manana"],
    ]);
  });

  it("ignora ingresos, montos en cero y ítems sin fecha", () => {
    const r = recordatoriosDePago(
      [
        item({ kind: "income", fechaPago: "2026-10-15" }),
        item({ monto: 0, fechaPago: "2026-10-15" }),
        item({ fechaPago: "" }),
      ],
      hoy
    );

    expect(r).toEqual([]);
  });

  it("en un gasto quincenal cada pago es la mitad y avisa cada fecha", () => {
    const r = recordatoriosDePago(
      [item({ monto: 100000, fechaPago: "2026-10-15", fechaPago2: "2026-10-31" })],
      hoy
    );

    expect(r).toHaveLength(1);
    expect(r[0].datos.montoCentavos).toBe(50000);
  });

  it("pago vencido: apagado por defecto, y solo para gastos extra sin pagar cuando se enciende", () => {
    const extra = item({ id: "x", fixed: false, fechaPago: "2026-10-10" });
    const extraPagado = item({ id: "y", fixed: false, fechaPago: "2026-10-10", pagado: true });
    const fijo = item({ id: "z", fixed: true, fechaPago: "2026-10-10" });

    expect(recordatoriosDePago([extra, extraPagado, fijo], hoy)).toEqual([]);

    const r = recordatoriosDePago([extra, extraPagado, fijo], hoy, true);
    expect(r.map((x) => x.clave)).toEqual(["pago:x:2026-10-10:vencido"]);
  });
});

describe("fechas", () => {
  it("usa la fecha de Panamá (UTC-5)", () => {
    // 2026-10-16 02:00 UTC = 2026-10-15 21:00 en Panamá.
    expect(fechaEnPanama(Date.UTC(2026, 9, 16, 2, 0, 0))).toBe("2026-10-15");
    expect(fechaEnPanama(Date.UTC(2026, 9, 16, 6, 0, 0))).toBe("2026-10-16");
  });

  it("suma días cruzando fin de mes y de año", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
});
