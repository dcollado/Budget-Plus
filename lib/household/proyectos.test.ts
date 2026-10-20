import { describe, expect, it } from "vitest";
import {
  aportesSugeridos,
  sugerirAportes,
  coberturaConAportes,
  disponibleDeLaPersona,
  mesesEntre,
  planDelProyecto,
  type ProyectoParaPlan,
} from "./proyectos";
import type { CategoriaDelMes } from "./presupuesto";

const viaje = (parcial: Partial<ProyectoParaPlan> = {}): ProyectoParaPlan => ({
  fechaObjetivo: "2027-07-15",
  objetivoCents: 0,
  ahorradoCents: 0,
  items: [
    { id: "1", concepto: "Vuelos", montoCents: 90000, fecha: "2027-01-15" },
    { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
    { id: "3", concepto: "Comida y paseos", montoCents: 150000, fecha: "" },
  ],
  ...parcial,
});

describe("mesesEntre", () => {
  it("cuenta meses completos, también entre años", () => {
    expect(mesesEntre("2026-10", "2027-01")).toBe(3);
    expect(mesesEntre("2026-10", "2026-10")).toBe(0);
    expect(mesesEntre("2026-10", "2026-08")).toBe(-2);
  });
});

describe("planDelProyecto", () => {
  it("la cuota la fija el pago más exigente, no el promedio hasta el viaje", () => {
    const plan = planDelProyecto(viaje(), "2026-10");

    expect(plan.comprometidoCents).toBe(360000);
    // Enero: 900 / 3 = 300. Marzo: 2.100 / 5 = 420. Julio: 3.600 / 9 = 400.
    expect(plan.cuotaMensualCents).toBe(42000);
    expect(plan.cuotaQuincenalCents).toBe(21000);
    expect(plan.fechaLimitante).toBe("2027-03-01");
    expect(plan.urgenteCents).toBe(0);
  });

  it("un ítem sin fecha usa la fecha del proyecto", () => {
    const plan = planDelProyecto(
      viaje({ items: [{ id: "1", concepto: "Todo", montoCents: 90000, fecha: "" }] }),
      "2026-10"
    );

    // 900 / 9 meses (octubre a julio) = 100.
    expect(plan.cuotaMensualCents).toBe(10000);
    expect(plan.fechaLimitante).toBe("2027-07-15");
  });

  it("lo ya ahorrado se descuenta y puede dejar la cuota en cero", () => {
    const plan = planDelProyecto(viaje({ ahorradoCents: 360000 }), "2026-10");

    expect(plan.faltaCents).toBe(0);
    expect(plan.cuotaMensualCents).toBe(0);
    expect(plan.fechaLimitante).toBe("");
  });

  it("lo ya ahorrado baja la cuota", () => {
    const plan = planDelProyecto(viaje({ ahorradoCents: 60000 }), "2026-10");

    // Enero: 300 / 3 = 100. Marzo: 1.500 / 5 = 300. Julio: 3.000 / 9 = 333,34.
    expect(plan.cuotaMensualCents).toBe(33334);
    expect(plan.fechaLimitante).toBe("2027-07-15");
    expect(plan.faltaCents).toBe(300000);
  });

  it("un pago que vence este mes o ya venció va a urgente, no a la cuota", () => {
    const plan = planDelProyecto(
      viaje({ items: [{ id: "1", concepto: "Depósito", montoCents: 50000, fecha: "2026-10-25" }] }),
      "2026-10"
    );

    expect(plan.urgenteCents).toBe(50000);
    expect(plan.cuotaMensualCents).toBe(0);
  });

  it("redondea la cuota hacia arriba para no quedarse corto", () => {
    const plan = planDelProyecto(
      viaje({ items: [{ id: "1", concepto: "Algo", montoCents: 10000, fecha: "2027-01-15" }] }),
      "2026-10"
    );

    // 10.000 / 3 = 3.333,33 -> 3.334.
    expect(plan.cuotaMensualCents).toBe(3334);
  });

  it("compara contra el presupuesto objetivo solo como referencia", () => {
    const debajo = planDelProyecto(viaje({ objetivoCents: 400000 }), "2026-10");
    expect(debajo.porAsignarCents).toBe(40000);
    expect(debajo.sobreObjetivoCents).toBe(0);

    const encima = planDelProyecto(viaje({ objetivoCents: 300000 }), "2026-10");
    expect(encima.sobreObjetivoCents).toBe(60000);
    expect(encima.porAsignarCents).toBe(0);

    // El objetivo no cambia la cuota.
    expect(encima.cuotaMensualCents).toBe(debajo.cuotaMensualCents);
  });

  it("sin objetivo no hay comparación", () => {
    const plan = planDelProyecto(viaje(), "2026-10");

    expect(plan.sobreObjetivoCents).toBe(0);
    expect(plan.porAsignarCents).toBe(0);
  });

  it("un proyecto sin ítems no pide nada", () => {
    const plan = planDelProyecto(viaje({ items: [] }), "2026-10");

    expect(plan.comprometidoCents).toBe(0);
    expect(plan.cuotaMensualCents).toBe(0);
  });
});

describe("disponibleDeLaPersona", () => {
  const item = (parcial: Partial<CategoriaDelMes["category"]>, plannedAmountCents: number): CategoriaDelMes => ({
    category: {
      id: "c",
      householdId: "h",
      name: "x",
      kind: "expense",
      archived: false,
      fixed: true,
      dueDay: null,
      quincenal: false,
      dueDay2: null,
      ownerMemberId: "david",
      cuentaId: "",
      ahorro: false,
      ...parcial,
    },
    plannedAmountCents,
    inherited: false,
    actualCents: 0,
    fechaPago: "",
    fechaPago2: "",
    nota: "",
    pagado: false,
  });

  it("resta los gastos fijos y los extras del salario, solo lo suyo", () => {
    const items = [
      item({ kind: "income" }, 300000),
      item({}, 120000),
      item({ fixed: false }, 20000),
      // De otra persona y conjuntos: no se le restan.
      item({ ownerMemberId: "caro" }, 99999),
      item({ ownerMemberId: "" }, 88888),
      // Ingreso extra: no cuenta.
      item({ kind: "income", fixed: false }, 50000),
    ];

    expect(disponibleDeLaPersona(items, "david")).toEqual({
      salarioCents: 300000,
      fijosCents: 120000,
      extrasCents: 20000,
      disponibleCents: 160000,
    });
  });

  it("puede quedar en negativo", () => {
    const items = [item({ kind: "income" }, 10000), item({}, 30000)];

    expect(disponibleDeLaPersona(items, "david").disponibleCents).toBe(-20000);
  });
});

describe("aportesSugeridos", () => {
  it("reparte la cuota en proporción a lo libre, en dólares enteros hacia arriba", () => {
    const r = aportesSugeridos(42000, [
      { memberId: "david", libreCents: 150000 },
      { memberId: "caro", libreCents: 100000 },
    ]);

    // 420 * 60% = 252 ; 420 * 40% = 168.
    expect(r).toEqual({ david: 25200, caro: 16800 });
  });

  it("no sugiere pasar del 70% de lo libre", () => {
    const r = aportesSugeridos(42000, [
      { memberId: "david", libreCents: 30000 },
      { memberId: "caro", libreCents: 30000 },
    ]);

    // Le tocarían 210 a cada uno, pero el 70% de 300 es 210: justo.
    expect(r).toEqual({ david: 21000, caro: 21000 });

    const apretado = aportesSugeridos(60000, [
      { memberId: "david", libreCents: 30000 },
      { memberId: "caro", libreCents: 30000 },
    ]);

    // Les tocarían 300 a cada uno; se queda en 210 y la suma (420) no cubre 600.
    expect(apretado).toEqual({ david: 21000, caro: 21000 });
  });

  it("a quien no tiene nada libre no se le sugiere nada", () => {
    const r = aportesSugeridos(42000, [
      { memberId: "david", libreCents: -5000 },
      { memberId: "caro", libreCents: 100000 },
    ]);

    expect(r.david).toBe(0);
    expect(r.caro).toBe(42000);
  });

  it("sin cuota o sin nadie con libre, todo en cero", () => {
    expect(aportesSugeridos(0, [{ memberId: "a", libreCents: 100000 }])).toEqual({ a: 0 });
    expect(aportesSugeridos(42000, [{ memberId: "a", libreCents: 0 }])).toEqual({ a: 0 });
  });
});

describe("coberturaConAportes", () => {
  it("avisa en qué fecha falta plata si los aportes no alcanzan", () => {
    // La cuota mínima es 420/mes; con 300/mes no llega al hotel de marzo.
    const c = coberturaConAportes(viaje(), 30000, "2026-10");

    expect(c.alcanza).toBe(false);
    expect(c.fechaProblema).toBe("2027-03-01");
    // En marzo vencen 2.100 y se reúnen 5 * 300 = 1.500.
    expect(c.faltanteEnFechaCents).toBe(60000);
    expect(c.faltanteMensualCents).toBe(12000);
  });

  it("con la cuota mínima alcanza", () => {
    const c = coberturaConAportes(viaje(), 42000, "2026-10");

    expect(c.alcanza).toBe(true);
    expect(c.fechaProblema).toBe("");
    expect(c.faltanteMensualCents).toBe(0);
  });

  it("calcula en cuántos meses se junta todo", () => {
    const c = coberturaConAportes(viaje(), 50000, "2026-10");

    // 3.600 / 500 = 7,2 -> 8 meses.
    expect(c.mesesParaCubrirTodo).toBe(8);
  });

  it("sin aportes no se completa nunca, y sin faltante ya está cubierto", () => {
    expect(coberturaConAportes(viaje(), 0, "2026-10").mesesParaCubrirTodo).toBeNull();
    expect(
      coberturaConAportes(viaje({ ahorradoCents: 360000 }), 0, "2026-10").mesesParaCubrirTodo
    ).toBe(0);
  });

  it("lo ya ahorrado cuenta", () => {
    const c = coberturaConAportes(viaje({ ahorradoCents: 60000 }), 33334, "2026-10");

    expect(c.alcanza).toBe(true);
  });
});

describe("lo ya pagado", () => {
  const sinVuelos = [
    { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
    { id: "3", concepto: "Comida y paseos", montoCents: 150000, fecha: "" },
  ];

  it("se descuenta de lo apartado: pagar con el ahorro no cuenta dos veces", () => {
    // Se habían apartado 900 y con eso se pagaron los vuelos (900).
    const plan = planDelProyecto(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(plan.pagadoCents).toBe(90000);
    expect(plan.apartadoDisponibleCents).toBe(0);
    expect(plan.comprometidoCents).toBe(270000);
    // Julio manda: 2.700 / 9 = 300. Sin el descuento sería 200.
    expect(plan.cuotaMensualCents).toBe(30000);
  });

  it("si lo pagado supera lo apartado, no queda negativo", () => {
    const plan = planDelProyecto(
      viaje({ ahorradoCents: 50000, pagadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(plan.apartadoDisponibleCents).toBe(0);
  });

  it("el objetivo es del proyecto entero: lo pagado también cuenta", () => {
    const plan = planDelProyecto(
      viaje({ objetivoCents: 400000, pagadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    // 900 pagados + 2.700 pendientes = 3.600; quedan 400 por asignar.
    expect(plan.porAsignarCents).toBe(40000);
    expect(plan.sobreObjetivoCents).toBe(0);

    const pasado = planDelProyecto(
      viaje({ objetivoCents: 300000, pagadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(pasado.sobreObjetivoCents).toBe(60000);
  });

  it("la cobertura también parte de lo apartado que queda", () => {
    const c = coberturaConAportes(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, items: sinVuelos }),
      30000,
      "2026-10"
    );

    expect(c.alcanza).toBe(true);
    expect(coberturaConAportes(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, items: sinVuelos }),
      29000,
      "2026-10"
    ).alcanza).toBe(false);
  });
});

describe("sugerirAportes (con lo ya confirmado)", () => {
  const dos = (david: number | null, caro: number | null) => [
    { memberId: "david", libreCents: 172000, confirmadoCents: david },
    { memberId: "caro", libreCents: 168000, confirmadoCents: caro },
  ];

  it("sin nadie confirmado reparte la cuota completa en proporción a lo libre", () => {
    const r = sugerirAportes(28334, dos(null, null));

    // 283,34 * 172/340 = 143,3 -> 144 ; * 168/340 = 140,0 -> 141.
    expect(r).toEqual({ david: 14400, caro: 14100 });
  });

  it("si una persona baja su aporte, la sugerencia de la otra compensa", () => {
    const r = sugerirAportes(28334, dos(10000, null));

    // A Caro le toca lo que falta: 283,34 - 100 = 183,34 -> 184.
    expect(r.caro).toBe(18400);
    // A David (que ya confirmó) se le sugiere lo que le tocaría si Caro no hubiera confirmado nada.
    expect(r.david).toBe(14400);
  });

  it("si la otra persona ya cubre la cuota, la sugerencia es cero", () => {
    const r = sugerirAportes(28334, dos(null, 30000));

    expect(r.david).toBe(0);
  });

  it("respeta el 70% de lo libre aunque falte mucho", () => {
    const r = sugerirAportes(500000, dos(null, 10000));

    // Faltan 4.900, pero a David nunca se le sugiere más del 70% de 1.720 = 1.204.
    expect(r.david).toBe(120400);
  });
});

describe("coberturaConAportes: pago ya vencido", () => {
  it("marca que el problema es un pago ya vencido, que aportar más cada mes no arregla", () => {
    const c = coberturaConAportes(
      viaje({ items: [{ id: "1", concepto: "Depósito", montoCents: 5000, fecha: "2026-10-25" }] }),
      30000,
      "2026-10"
    );

    expect(c.alcanza).toBe(false);
    expect(c.problemaYaVencido).toBe(true);
    expect(c.fechaProblema).toBe("2026-10-25");
  });

  it("un faltante a futuro no es un pago vencido", () => {
    const c = coberturaConAportes(viaje(), 30000, "2026-10");

    expect(c.alcanza).toBe(false);
    expect(c.problemaYaVencido).toBe(false);
  });
});
