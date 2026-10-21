import { describe, expect, it } from "vitest";
import { armarVistaMes, montoRealDelMes } from "./presupuesto";
import { armarReporteAnual } from "./reporte";
import type { Budget, Category } from "./schema";

// Un sueldo de 1.000 por pago (2.000 al mes) que se cobra cada 2 semanas desde el
// 1 de mayo de 2027: mayo tiene 3 pagos (1, 15 y 29); abril y junio, 2.
const sueldo: Category = {
  id: "sueldo",
  householdId: "h",
  name: "Sueldo",
  kind: "income",
  archived: false,
  fixed: true,
  dueDay: null,
  quincenal: true,
  dueDay2: null,
  bisemanalDesde: "2027-05-01",
  ownerMemberId: "david",
  cuentaId: "",
  ahorro: false,
};

const mensual: Category = { ...sueldo, id: "otro", name: "Otro", bisemanalDesde: "", dueDay: 15, quincenal: false };

const presupuesto = (categoryId: string): Budget => ({
  id: `b-${categoryId}`,
  householdId: "h",
  categoryId,
  month: "2027-01",
  plannedAmountCents: 200000,
  dueDate: "",
  nota: "",
  pagado: false,
});

describe("meses con 3 pagos (cobro cada 2 semanas)", () => {
  it("en un mes con 3 pagos el ingreso suma el pago de más, sin tocar el monto guardado", () => {
    const [mayo] = armarVistaMes([sueldo], [presupuesto("sueldo")], [], "2027-05");

    expect(mayo.plannedAmountCents).toBe(200000); // lo que se edita
    expect(mayo.pagosDelMes).toBe(3);
    expect(mayo.extraPorPagosCents).toBe(100000);
    expect(montoRealDelMes(mayo)).toBe(300000);
  });

  it("en un mes normal no hay pago de más", () => {
    const [abril] = armarVistaMes([sueldo], [presupuesto("sueldo")], [], "2027-04");

    expect(abril.pagosDelMes).toBe(2);
    expect(abril.extraPorPagosCents).toBe(0);
    expect(montoRealDelMes(abril)).toBe(200000);
  });

  it("lo que no es cada 2 semanas no cambia", () => {
    const [mayo] = armarVistaMes([mensual], [presupuesto("otro")], [], "2027-05");

    expect(mayo.pagosDelMes).toBeUndefined();
    expect(mayo.extraPorPagosCents).toBeUndefined();
    expect(montoRealDelMes(mayo)).toBe(200000);
  });

  it("el reporte anual suma los 3 pagos de mayo (26 pagos al año)", () => {
    const reporte = armarReporteAnual(2027, [sueldo], [presupuesto("sueldo")], []);
    const porMes = Object.fromEntries(reporte.meses.map((m) => [m.month, m.ingresosCents]));

    expect(porMes["2027-04"]).toBe(200000);
    expect(porMes["2027-05"]).toBe(300000);
    expect(porMes["2027-06"]).toBe(200000);
  });
});
