import { describe, expect, it } from "vitest";
import { armarVistaMes, fechaDelDia, ordenarPorFecha } from "./presupuesto";
import type { Budget, Category, Transaction } from "./schema";

const categoria = (parcial: Partial<Category>): Category => ({
  id: "c1",
  householdId: "h1",
  name: "Alquiler",
  kind: "expense",
  archived: false,
  fixed: true,
  dueDay: 5,
  quincenal: false,
  dueDay2: null,
  ownerMemberId: "",
  cuentaId: "",
  ahorro: false,
  ...parcial,
});

const presupuesto = (parcial: Partial<Budget>): Budget => ({
  id: "b1",
  householdId: "h1",
  categoryId: "c1",
  month: "2026-01",
  plannedAmountCents: 50000,
  dueDate: "",
  nota: "",
  pagado: false,
  ...parcial,
});

const transaccion = (parcial: Partial<Transaction>): Transaction => ({
  id: "t1",
  householdId: "h1",
  accountId: "a1",
  transferAccountId: "",
  categoryId: "c1",
  type: "expense",
  amountCents: 1000,
  date: "2026-03-10",
  payee: "",
  note: "",
  createdByMemberId: "",
  ownerMemberId: "",
  source: "manual",
  externalId: "",
  createdAt: "",
  ...parcial,
});

describe("fechaDelDia", () => {
  it("builds the date with the day of the month", () => {
    expect(fechaDelDia("2026-03", 5)).toBe("2026-03-05");
  });

  it("clamps to the last day of the month (31 in February)", () => {
    expect(fechaDelDia("2026-02", 31)).toBe("2026-02-28");
    expect(fechaDelDia("2028-02", 31)).toBe("2028-02-29");
    expect(fechaDelDia("2026-04", 31)).toBe("2026-04-30");
  });

  it("with no day returns empty", () => {
    expect(fechaDelDia("2026-03", null)).toBe("");
  });
});

describe("armarVistaMes", () => {
  it("a fixed item inherits the amount from the most recent previous month", () => {
    const [item] = armarVistaMes(
      [categoria({})],
      [presupuesto({ month: "2026-01", plannedAmountCents: 50000 })],
      [],
      "2026-03"
    );

    expect(item.plannedAmountCents).toBe(50000);
    expect(item.inherited).toBe(true);
    expect(item.fechaPago).toBe("2026-03-05");
  });

  it("inherits from the most recent month, not the first", () => {
    const [item] = armarVistaMes(
      [categoria({})],
      [
        presupuesto({ id: "b2", month: "2026-02", plannedAmountCents: 70000 }),
        presupuesto({ id: "b1", month: "2026-01", plannedAmountCents: 50000 }),
      ],
      [],
      "2026-03"
    );

    expect(item.plannedAmountCents).toBe(70000);
  });

  it("no hereda de un mes posterior", () => {
    const [item] = armarVistaMes(
      [categoria({})],
      [presupuesto({ month: "2026-05" })],
      [],
      "2026-03"
    );

    expect(item.plannedAmountCents).toBe(0);
    expect(item.inherited).toBe(false);
  });

  it("the month's explicit budget wins over inheritance", () => {
    const [item] = armarVistaMes(
      [categoria({})],
      [
        presupuesto({ month: "2026-01", plannedAmountCents: 50000 }),
        presupuesto({ id: "b2", month: "2026-03", plannedAmountCents: 60000 }),
      ],
      [],
      "2026-03"
    );

    expect(item.plannedAmountCents).toBe(60000);
    expect(item.inherited).toBe(false);
  });

  it("una variable no hereda y usa la fecha guardada del mes", () => {
    const variable = categoria({ fixed: false, dueDay: null });

    const [sinMes] = armarVistaMes(
      [variable],
      [presupuesto({ month: "2026-01" })],
      [],
      "2026-03"
    );
    expect(sinMes.plannedAmountCents).toBe(0);
    expect(sinMes.fechaPago).toBe("");

    const [conMes] = armarVistaMes(
      [variable],
      [presupuesto({ month: "2026-03", dueDate: "2026-03-20" })],
      [],
      "2026-03"
    );
    expect(conMes.fechaPago).toBe("2026-03-20");
  });

  it("suma lo gastado del mes y excluye transferencias y otros meses", () => {
    const [item] = armarVistaMes(
      [categoria({})],
      [],
      [
        transaccion({ id: "t1", amountCents: 1000 }),
        transaccion({ id: "t2", amountCents: 2500, date: "2026-03-28" }),
        transaccion({ id: "t3", amountCents: 9999, type: "transfer" }),
        transaccion({ id: "t4", amountCents: 7777, date: "2026-04-01" }),
        transaccion({ id: "t5", amountCents: 5555, categoryId: "otra" }),
      ],
      "2026-03"
    );

    expect(item.actualCents).toBe(3500);
  });
});

describe("ordenarPorFecha", () => {
  it("sorts by date and leaves those without one at the end", () => {
    const base = armarVistaMes(
      [
        categoria({ id: "a", name: "A", dueDay: 20 }),
        categoria({ id: "b", name: "B", dueDay: null }),
        categoria({ id: "c", name: "C", dueDay: 2 }),
      ],
      [],
      [],
      "2026-03"
    );

    expect(ordenarPorFecha(base).map((i) => i.category.id)).toEqual(["c", "a", "b"]);
  });
});

describe("gastos quincenales", () => {
  it("calcula las dos fechas del mes y acota el fin de mes", () => {
    const cat = categoria({ id: "q", dueDay: 15, quincenal: true, dueDay2: 31 });
    const [feb] = armarVistaMes(
      [cat],
      [presupuesto({ categoryId: "q", month: "2026-02", plannedAmountCents: 20000 })],
      [],
      "2026-02"
    );

    expect(feb.fechaPago).toBe("2026-02-15");
    expect(feb.fechaPago2).toBe("2026-02-28");
    // El monto del mes sigue siendo el total.
    expect(feb.plannedAmountCents).toBe(20000);
  });

  it("un gasto mensual no tiene segunda fecha", () => {
    const cat = categoria({ id: "m", dueDay: 5, quincenal: false, dueDay2: null });
    const [item] = armarVistaMes(
      [cat],
      [presupuesto({ categoryId: "m", month: "2026-03" })],
      [],
      "2026-03"
    );

    expect(item.fechaPago).toBe("2026-03-05");
    expect(item.fechaPago2).toBe("");
  });

  it("hereda los dos días en un mes sin presupuesto propio", () => {
    const cat = categoria({ id: "q", dueDay: 10, quincenal: true, dueDay2: 25 });
    const [item] = armarVistaMes(
      [cat],
      [presupuesto({ categoryId: "q", month: "2026-01", plannedAmountCents: 30000 })],
      [],
      "2026-04"
    );

    expect(item.inherited).toBe(true);
    expect(item.fechaPago).toBe("2026-04-10");
    expect(item.fechaPago2).toBe("2026-04-25");
  });
});
