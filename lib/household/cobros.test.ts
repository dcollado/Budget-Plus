import { describe, expect, it } from "vitest";
import { fechasDeCobro } from "./cobros";
import { disponibleHastaFecha } from "./proyectos";
import type { CategoriaDelMes } from "./presupuesto";
import type { Category } from "./schema";

const categoria = (parcial: Partial<Category> = {}): Category => ({
  id: "c",
  householdId: "h",
  name: "Ingreso",
  kind: "income",
  archived: false,
  fixed: true,
  dueDay: null,
  quincenal: false,
  dueDay2: null,
  ownerMemberId: "david",
  cuentaId: "",
  ahorro: false,
  ...parcial,
});

const item = (
  parcial: Partial<Category>,
  plannedAmountCents: number,
  fechas: { fechaPago?: string } = {}
): CategoriaDelMes => ({
  category: categoria(parcial),
  plannedAmountCents,
  inherited: false,
  actualCents: 0,
  fechaPago: fechas.fechaPago ?? "",
  fechaPago2: "",
  nota: "",
  pagado: false,
});

describe("fechasDeCobro", () => {
  it("cada 2 semanas: de 14 en 14 días desde la referencia", () => {
    const c = { quincenal: true, dueDay: null, dueDay2: null, bisemanalDesde: "2026-12-11" };
    expect(fechasDeCobro(c, "2026-12")).toEqual(["2026-12-11", "2026-12-25"]);
    expect(fechasDeCobro(c, "2027-01")).toEqual(["2027-01-08", "2027-01-22"]);
  });

  it("también hacia atrás y con meses de 3 pagos", () => {
    const c = { quincenal: true, dueDay: null, dueDay2: null, bisemanalDesde: "2026-12-25" };
    expect(fechasDeCobro(c, "2026-12")).toEqual(["2026-12-11", "2026-12-25"]);
    // 2026-10-02, 16, 30: tres pagos en el mes
    const d = { quincenal: true, dueDay: null, dueDay2: null, bisemanalDesde: "2026-10-02" };
    expect(fechasDeCobro(d, "2026-10")).toEqual(["2026-10-02", "2026-10-16", "2026-10-30"]);
  });

  it("quincenal con días fijos y mensual con un día", () => {
    expect(fechasDeCobro({ quincenal: true, dueDay: 15, dueDay2: 31, bisemanalDesde: "" }, "2026-11")).toEqual([
      "2026-11-15",
      "2026-11-30",
    ]);
    expect(fechasDeCobro({ quincenal: false, dueDay: 30, dueDay2: null }, "2026-12")).toEqual(["2026-12-30"]);
  });

  it("sin día no se sabe cuándo", () => {
    expect(fechasDeCobro({ quincenal: false, dueDay: null, dueDay2: null }, "2026-12")).toEqual([]);
  });
});

describe("disponibleHastaFecha", () => {
  it("solo cuenta el sueldo que ya entró para la fecha del pago", () => {
    const items = [
      // 2 pagos de 1000 al mes (monto del mes: 2000), días 11 y 25
      item({ quincenal: true, bisemanalDesde: "2026-12-11" }, 200000),
    ];
    expect(disponibleHastaFecha(items, "david", "2026-12-24")).toBe(100000);
    expect(disponibleHastaFecha(items, "david", "2026-12-25")).toBe(200000);
    expect(disponibleHastaFecha(items, "david", "2026-12-10")).toBe(0);
  });

  it("un sueldo del 28 y otro del 30 entran si el último pago es después", () => {
    const items = [
      item({ dueDay: 28 }, 150000),
      item({ dueDay: 30, ownerMemberId: "caro" }, 120000),
    ];
    expect(disponibleHastaFecha(items, "david", "2026-12-26")).toBe(0);
    expect(disponibleHastaFecha(items, "david", "2027-01-03")).toBe(0); // enero aún no tiene sueldos
    expect(disponibleHastaFecha(items, "david", "2026-12-31")).toBe(150000);
    expect(disponibleHastaFecha(items, "caro", "2026-12-31")).toBe(120000);
  });

  it("los gastos con fecha restan solo si ya salieron", () => {
    const items = [
      item({ dueDay: 1 }, 300000),
      item({ kind: "expense", dueDay: 20 }, 100000),
      item({ kind: "expense", fixed: false }, 40000, { fechaPago: "2026-12-30" }),
    ];
    expect(disponibleHastaFecha(items, "david", "2026-12-26")).toBe(200000);
    expect(disponibleHastaFecha(items, "david", "2026-12-31")).toBe(160000);
  });

  it("sin fechas se supone la mitad del mes", () => {
    const items = [item({}, 100000), item({ kind: "expense" }, 40000)];
    expect(disponibleHastaFecha(items, "david", "2026-12-26")).toBe(30000);
  });

  it("solo cuenta lo de esa persona", () => {
    expect(disponibleHastaFecha([item({ ownerMemberId: "caro", dueDay: 1 }, 100000)], "david", "2026-12-26")).toBe(0);
  });
});
