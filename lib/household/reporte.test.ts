import { describe, expect, it } from "vitest";
import { armarReporteAnual } from "./reporte";
import type { Budget, Category } from "./schema";

const categoria = (parcial: Partial<Category>): Category => ({
  id: "c1",
  householdId: "h1",
  name: "Sueldo",
  kind: "expense",
  archived: false,
  fixed: true,
  dueDay: null,
  ownerMemberId: "",
  cuentaId: "",
  ahorro: false,
  ...parcial,
});

const presupuesto = (parcial: Partial<Budget>): Budget => ({
  id: "b",
  householdId: "h1",
  categoryId: "c1",
  month: "2026-01",
  plannedAmountCents: 0,
  dueDate: "",
  ...parcial,
});

describe("armarReporteAnual", () => {
  const categories = [
    categoria({ id: "sueldo", name: "Sueldo", kind: "income", ownerMemberId: "m1" }),
    categoria({ id: "alquiler", name: "Alquiler", ownerMemberId: "" }),
    categoria({ id: "fondo", name: "Fondo", ahorro: true, ownerMemberId: "m1" }),
    categoria({ id: "viaje", name: "Viaje", fixed: false, ownerMemberId: "m1" }),
  ];

  const budgets = [
    presupuesto({ id: "1", categoryId: "sueldo", month: "2026-01", plannedAmountCents: 300000 }),
    presupuesto({ id: "2", categoryId: "alquiler", month: "2026-01", plannedAmountCents: 100000 }),
    presupuesto({ id: "3", categoryId: "fondo", month: "2026-01", plannedAmountCents: 20000 }),
    presupuesto({
      id: "4",
      categoryId: "viaje",
      month: "2026-06",
      plannedAmountCents: 50000,
      dueDate: "2026-06-15",
    }),
  ];

  const reporte = armarReporteAnual(2026, categories, budgets, [
    { id: "m1", displayName: "Ana", color: 1 },
  ]);

  it("trae los 12 meses", () => {
    expect(reporte.meses).toHaveLength(12);
    expect(reporte.meses[0].month).toBe("2026-01");
    expect(reporte.meses[11].month).toBe("2026-12");
  });

  it("los fijos se heredan hasta el final del año; las variables no", () => {
    const enero = reporte.meses[0];
    const diciembre = reporte.meses[11];
    const junio = reporte.meses[5];

    expect(enero.ingresosCents).toBe(300000);
    expect(enero.fijosCents).toBe(120000);
    expect(enero.variablesCents).toBe(0);
    expect(enero.ahorroCents).toBe(20000);
    expect(enero.sobranteCents).toBe(180000);

    expect(junio.variablesCents).toBe(50000);
    expect(diciembre.ingresosCents).toBe(300000);
    expect(diciembre.variablesCents).toBe(0);
  });

  it("los totales suman los meses", () => {
    expect(reporte.totales.ingresosCents).toBe(300000 * 12);
    expect(reporte.totales.fijosCents).toBe(120000 * 12);
    expect(reporte.totales.variablesCents).toBe(50000);
    expect(reporte.totales.sobranteCents).toBe(
      reporte.totales.ingresosCents - reporte.totales.fijosCents - reporte.totales.variablesCents
    );
  });

  it("separa por persona y deja Conjunto al final", () => {
    expect(reporte.personas.map((p) => p.nombre)).toEqual(["Ana", "Conjunto"]);
    expect(reporte.personas[0].ingresosCents).toBe(300000 * 12);
    expect(reporte.personas[1].gastosCents).toBe(100000 * 12);
  });

  it("lista los extraordinarios y cuenta las categorías de ahorro", () => {
    expect(reporte.extraordinarios).toEqual([
      {
        fecha: "2026-06-15",
        month: "2026-06",
        nombre: "Viaje",
        montoCents: 50000,
        ownerMemberId: "m1",
      },
    ]);
    expect(reporte.categoriasAhorro).toBe(1);
  });
});
