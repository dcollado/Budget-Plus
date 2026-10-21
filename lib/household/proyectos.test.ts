import { describe, expect, it } from "vitest";
import {
  capacidadSugerible,
  controlesDelPlan,
  mesInicioDeAhorro,
  fraccionDelMes,
  mesesParaApartar,
  repartirEnMeses,
  coberturaConAportes,
  conjuntoDelMes,
  disponibleDeLaPersona,
  mesesEntre,
  mesMasAjustado,
  sumarMeses,
  ventanaDeAhorro,
  planDelProyecto,
  type ProyectoParaPlan,
} from "./proyectos";
import type { CategoriaDelMes } from "./presupuesto";

const viaje = (parcial: Partial<ProyectoParaPlan> = {}): ProyectoParaPlan => ({
  fechaObjetivo: "2027-07-15",
  ahorradoCents: 0,
  items: [
    { id: "1", concepto: "Vuelos", montoCents: 90000, fecha: "2027-01-15" },
    { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
    { id: "3", concepto: "Comida y paseos", montoCents: 150000, fecha: "" },
  ],
  ...parcial,
});

// Aporte igual todos los meses (12 meses desde "desde") más montos extra en meses concretos.
const cobertura = (
  proyecto: ProyectoParaPlan,
  base: number,
  mesHoy: string,
  extras: Record<string, number> = {}
) => {
  const porMes: Record<string, number> = {};
  for (let i = 0; i < 12; i++) porMes[sumarMeses(mesHoy, i)] = base;
  for (const [mes, cents] of Object.entries(extras)) porMes[mes] = (porMes[mes] ?? 0) + cents;
  return coberturaConAportes(proyecto, porMes, mesHoy);
};

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

  it("suma los ingresos extra y resta los gastos fijos y extra, solo lo suyo", () => {
    const items = [
      item({ kind: "income" }, 300000),
      item({}, 120000),
      item({ fixed: false }, 20000),
      // De otra persona y conjuntos: no se le restan.
      item({ ownerMemberId: "caro" }, 99999),
      item({ ownerMemberId: "" }, 88888),
      // Ingreso extra a su nombre: suma.
      item({ kind: "income", fixed: false }, 50000),
      // Ingreso extra de otra persona o conjunto: no cuenta para él.
      item({ kind: "income", fixed: false, ownerMemberId: "caro" }, 77777),
      item({ kind: "income", fixed: false, ownerMemberId: "" }, 66666),
    ];

    expect(disponibleDeLaPersona(items, "david")).toEqual({
      salarioCents: 300000,
      ingresosExtraCents: 50000,
      fijosCents: 120000,
      extrasCents: 20000,
      disponibleCents: 210000,
    });
  });

  it("puede quedar en negativo", () => {
    const items = [item({ kind: "income" }, 10000), item({}, 30000)];

    expect(disponibleDeLaPersona(items, "david").disponibleCents).toBe(-20000);
  });
});

describe("coberturaConAportes", () => {
  it("avisa en qué fecha falta plata si los aportes no alcanzan", () => {
    // La cuota mínima es 420/mes; con 300/mes no llega al hotel de marzo.
    const c = cobertura(viaje(), 30000, "2026-10");

    expect(c.alcanza).toBe(false);
    expect(c.fechaProblema).toBe("2027-03-01");
    // En marzo vencen 2.100 y se reúnen 5 * 300 = 1.500.
    expect(c.faltanteEnFechaCents).toBe(60000);
  });

  it("con la cuota mínima alcanza", () => {
    const c = cobertura(viaje(), 42000, "2026-10");

    expect(c.alcanza).toBe(true);
    expect(c.fechaProblema).toBe("");
  });

  it("calcula en cuántos meses se junta todo", () => {
    const c = cobertura(viaje(), 50000, "2026-10");

    // 3.600 / 500 = 7,2 -> 8 meses.
    expect(c.mesesParaCubrirTodo).toBe(8);
  });

  it("sin aportes no se completa nunca, y sin faltante ya está cubierto", () => {
    expect(cobertura(viaje(), 0, "2026-10").mesesParaCubrirTodo).toBeNull();
    expect(
      cobertura(viaje({ ahorradoCents: 360000 }), 0, "2026-10").mesesParaCubrirTodo
    ).toBe(0);
  });

  it("lo ya ahorrado cuenta", () => {
    const c = cobertura(viaje({ ahorradoCents: 60000 }), 33334, "2026-10");

    expect(c.alcanza).toBe(true);
  });
});

describe("lo ya pagado", () => {
  const sinVuelos = [
    { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
    { id: "3", concepto: "Comida y paseos", montoCents: 150000, fecha: "" },
  ];

  it("lo pagado CON lo apartado se descuenta de lo apartado: no cuenta dos veces", () => {
    // Se habían apartado 900 y con eso se pagaron los vuelos (900).
    const plan = planDelProyecto(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, pagadoConApartadoCents: 90000, items: sinVuelos }),
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
      viaje({ ahorradoCents: 50000, pagadoCents: 90000, pagadoConApartadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(plan.apartadoDisponibleCents).toBe(0);
  });

  it("la cobertura también parte de lo apartado que queda", () => {
    const c = cobertura(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, pagadoConApartadoCents: 90000, items: sinVuelos }),
      30000,
      "2026-10"
    );

    expect(c.alcanza).toBe(true);
    expect(cobertura(
      viaje({ ahorradoCents: 90000, pagadoCents: 90000, pagadoConApartadoCents: 90000, items: sinVuelos }),
      29000,
      "2026-10"
    ).alcanza).toBe(false);
  });
});

describe("coberturaConAportes: pago ya vencido", () => {
  it("marca que el problema es un pago ya vencido, que aportar más cada mes no arregla", () => {
    const c = cobertura(
      viaje({ items: [{ id: "1", concepto: "Depósito", montoCents: 5000, fecha: "2026-10-25" }] }),
      30000,
      "2026-10"
    );

    expect(c.alcanza).toBe(false);
    expect(c.problemaYaVencido).toBe(true);
    expect(c.fechaProblema).toBe("2026-10-25");
  });

  it("un faltante a futuro no es un pago vencido", () => {
    const c = cobertura(viaje(), 30000, "2026-10");

    expect(c.alcanza).toBe(false);
    expect(c.problemaYaVencido).toBe(false);
  });
});

describe("sumarMeses", () => {
  it("avanza meses y cambia de año", () => {
    expect(sumarMeses("2026-10", 0)).toBe("2026-10");
    expect(sumarMeses("2026-10", 2)).toBe("2026-12");
    expect(sumarMeses("2026-10", 3)).toBe("2027-01");
    expect(sumarMeses("2026-12", 13)).toBe("2028-01");
  });
});

describe("ventanaDeAhorro", () => {
  it("va desde este mes hasta el mes anterior al último pago", () => {
    expect(ventanaDeAhorro("2026-10", ["2026-12-26", "2027-01-03"], "2026-12-26")).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("usa la fecha del proyecto si es la más tardía", () => {
    expect(ventanaDeAhorro("2026-10", ["2026-11-15"], "2027-01-10")).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("siempre incluye al menos este mes, aunque todo venza ya", () => {
    expect(ventanaDeAhorro("2026-10", ["2026-10-25"], "2026-10-25")).toEqual(["2026-10"]);
    expect(ventanaDeAhorro("2026-10", [], "2026-08-01")).toEqual(["2026-10"]);
  });
});

describe("el mes del último pago cuenta a medias (pago del 16 en adelante)", () => {
  it("un pago del 16 en adelante suma un mes más a la ventana", () => {
    expect(mesesParaApartar("2026-10", "2026-12-26")).toBe(3);
    expect(mesesParaApartar("2026-10", "2026-12-15")).toBe(2);
    expect(mesesParaApartar("2026-10", "2026-11-16")).toBe(2);
  });

  it("si el pago es este mes o ya pasó, no suma nada", () => {
    expect(mesesParaApartar("2026-10", "2026-10-28")).toBe(0);
    expect(mesesParaApartar("2026-10", "2026-08-30")).toBeLessThan(0);
  });

  it("la ventana del viaje del 26 de diciembre incluye diciembre", () => {
    expect(ventanaDeAhorro("2026-10", ["2026-11-16"], "2026-12-26")).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(ventanaDeAhorro("2026-10", [], "2026-12-10")).toEqual(["2026-10", "2026-11"]);
  });

  it("solo el mes del último pago vale la mitad", () => {
    expect(fraccionDelMes("2026-12", "2026-10", "2026-12-26")).toBe(0.5);
    expect(fraccionDelMes("2026-11", "2026-10", "2026-12-26")).toBe(1);
    expect(fraccionDelMes("2026-12", "2026-10", "2026-12-10")).toBe(1);
    expect(fraccionDelMes("2026-10", "2026-10", "2026-10-28")).toBe(1);
  });

  it("la cuota mínima reparte entre los meses completos y el medio mes", () => {
    const plan = planDelProyecto(
      { fechaObjetivo: "2026-12-26", ahorradoCents: 0, items: [{ id: "1", concepto: "x", montoCents: 100000, fecha: "" }] },
      "2026-10"
    );
    expect(plan.cuotaMensualCents).toBe(40000); // 1000 / 2.5 meses
  });

  it("los aportes del mes del pago cuentan para llegar a tiempo", () => {
    const proyecto = {
      fechaObjetivo: "2026-12-26",
          ahorradoCents: 0,
      items: [{ id: "1", concepto: "x", montoCents: 100000, fecha: "" }],
    };
    const c = coberturaConAportes(proyecto, { "2026-10": 30000, "2026-11": 30000, "2026-12": 40000 }, "2026-10");
    expect(c.alcanza).toBe(true);
  });
});

describe("empezar a ahorrar desde un mes futuro", () => {
  it("el mes de inicio es el elegido si es futuro; si no, este mes", () => {
    expect(mesInicioDeAhorro("2026-10", "2027-01")).toBe("2027-01");
    expect(mesInicioDeAhorro("2026-10", "")).toBe("2026-10");
    expect(mesInicioDeAhorro("2026-10", "2026-08")).toBe("2026-10");
    expect(mesInicioDeAhorro("2026-10", "2026-10")).toBe("2026-10");
  });

  it("la ventana de ahorro empieza en ese mes y no en los de en medio", () => {
    const fechas = ["2027-04-10"];
    expect(ventanaDeAhorro("2026-10", fechas, "2027-04-10")).toEqual([
      "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03",
    ]);
    expect(ventanaDeAhorro("2027-01", fechas, "2027-04-10")).toEqual(["2027-01", "2027-02", "2027-03"]);
  });

  it("la cuota mínima se reparte solo entre los meses desde el inicio", () => {
    const proyecto = {
      fechaObjetivo: "2027-04-10",
      ahorradoCents: 0,
      items: [{ id: "1", concepto: "x", montoCents: 300000, fecha: "" }],
    };
    expect(planDelProyecto(proyecto, "2026-10").cuotaMensualCents).toBe(50000); // 6 meses
    expect(planDelProyecto(proyecto, "2027-01").cuotaMensualCents).toBe(100000); // 3 meses
  });
});

describe("mesMasAjustado", () => {
  const mes = (month: string, libreCents: number) => ({
    month,
    salarioCents: 0,
    ingresosExtraCents: 0,
    fijosCents: 0,
    extrasCents: 0,
    otrosProyectosCents: 0,
    libreCents,
    conjunto: { ingresosCents: 0, gastosCents: 0 },
    fraccion: 1,
    aprovechableCents: libreCents,
    hastaFecha: "",
  });

  it("el tope es el mes con menos libre", () => {
    expect(mesMasAjustado([mes("2026-10", 172000), mes("2026-11", 164000), mes("2026-12", 110000)])).toEqual({
      month: "2026-12",
      topeCents: 110000,
    });
  });

  it("con empate, el primero", () => {
    expect(mesMasAjustado([mes("2026-10", 5000), mes("2026-11", 5000)]).month).toBe("2026-10");
  });

  it("si algún mes queda en negativo, el tope es cero", () => {
    expect(mesMasAjustado([mes("2026-10", 100000), mes("2026-11", -2000)])).toEqual({
      month: "2026-11",
      topeCents: 0,
    });
  });

  it("sin meses, cero", () => {
    expect(mesMasAjustado([])).toEqual({ month: "", topeCents: 0 });
  });
});

describe("conjuntoDelMes", () => {
  const item = (parcial: Partial<CategoriaDelMes["category"]>, plannedAmountCents: number): CategoriaDelMes => ({
    category: {
      id: "c",
      householdId: "h",
      name: "x",
      kind: "expense",
      archived: false,
      fixed: false,
      dueDay: null,
      quincenal: false,
      dueDay2: null,
      ownerMemberId: "",
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

  it("suma por separado los ingresos y los gastos que no tienen dueño", () => {
    const items = [
      item({ kind: "income" }, 161550),
      item({}, 4800),
      item({}, 7379),
      // Con dueño o en cero: no cuentan como conjunto.
      item({ ownerMemberId: "david" }, 99999),
      item({}, 0),
    ];

    expect(conjuntoDelMes(items)).toEqual({ ingresosCents: 161550, gastosCents: 12179 });
  });
});

describe("coberturaConAportes con aportes extra en meses concretos", () => {
  it("un aporte extra a tiempo hace que alcance", () => {
    // Sin extra, 300 al mes no llega al hotel de marzo.
    expect(cobertura(viaje(), 30000, "2026-10").alcanza).toBe(false);

    // Con 900 extra en noviembre sí: marzo 1.500 + 900 >= 2.100 y julio 2.700 + 900 >= 3.600.
    const c = cobertura(viaje(), 30000, "2026-10", { "2026-11": 90000 });
    expect(c.alcanza).toBe(true);
  });

  it("un aporte extra que llega tarde no ayuda a un pago anterior", () => {
    // 900 extra en febrero llega después del pago de enero (900) pero la base
    // de 100 no alcanza para los vuelos: en enero solo hay 3 * 100.
    const c = cobertura(viaje(), 10000, "2026-10", { "2027-02": 200000 });

    expect(c.alcanza).toBe(false);
    expect(c.fechaProblema).toBe("2027-01-15");
  });

  it("con un extra insuficiente sigue avisando la fecha y lo que falta", () => {
    // Con 600 extra en noviembre, julio sigue sin alcanzar: 2.700 + 600 = 3.300 de 3.600.
    const c = cobertura(viaje(), 30000, "2026-10", { "2026-11": 60000 });

    expect(c.alcanza).toBe(false);
    expect(c.fechaProblema).toBe("2027-07-15");
    expect(c.faltanteEnFechaCents).toBe(30000);
  });

  it("los extras acortan el tiempo para juntar todo", () => {
    expect(cobertura(viaje(), 30000, "2026-10").mesesParaCubrirTodo).toBe(12);
    expect(cobertura(viaje(), 30000, "2026-10", { "2026-11": 90000 }).mesesParaCubrirTodo).toBe(9);
  });

  it("sin aporte mensual pero con un extra a futuro, se completa cuando llega", () => {
    const c = cobertura(viaje(), 0, "2026-10", { "2026-12": 360000 });

    expect(c.mesesParaCubrirTodo).toBe(3);
  });
});

describe("coberturaConAportes con montos distintos cada mes", () => {
  it("suma solo lo planeado de este mes en adelante", () => {
    const c = coberturaConAportes(
      viaje(),
      { "2026-09": 99999, "2026-10": 10000, "2026-11": 25000 },
      "2026-10"
    );

    expect(c.planeadoCents).toBe(35000);
  });

  it("un mes grande en el momento justo cubre el pago", () => {
    // Vuelos de 900 el 15 ene: aportes 100 + 800 + 0 en oct, nov y dic = 900.
    const proyecto = viaje({ items: [{ id: "1", concepto: "Vuelos", montoCents: 90000, fecha: "2027-01-15" }] });
    const c = coberturaConAportes(proyecto, { "2026-10": 10000, "2026-11": 80000 }, "2026-10");

    expect(c.alcanza).toBe(true);
    expect(c.mesesParaCubrirTodo).toBe(2);
  });

  it("si lo planeado se acaba antes de juntar todo, no se completa", () => {
    const c = coberturaConAportes(viaje(), { "2026-10": 10000, "2026-11": 10000 }, "2026-10");

    expect(c.alcanza).toBe(false);
    expect(c.mesesParaCubrirTodo).toBeNull();
  });

  it("lo ya apartado (inicial más lo hecho) cuenta antes que lo planeado", () => {
    const c = coberturaConAportes(
      viaje({ ahorradoCents: 90000, items: [{ id: "1", concepto: "Vuelos", montoCents: 90000, fecha: "2027-01-15" }] }),
      {},
      "2026-10"
    );

    expect(c.alcanza).toBe(true);
    expect(c.mesesParaCubrirTodo).toBe(0);
  });
});

describe("lo pagado por fuera no toca lo apartado", () => {
  const sinVuelos = [
    { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
    { id: "3", concepto: "Comida y paseos", montoCents: 150000, fecha: "" },
  ];

  it("pagar de tu bolsillo baja lo que falta pagar pero no lo apartado", () => {
    // Ya se apartaron 166 y los vuelos (900) se pagaron por fuera.
    const plan = planDelProyecto(
      viaje({ ahorradoCents: 16600, pagadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(plan.apartadoDisponibleCents).toBe(16600);
    expect(plan.comprometidoCents).toBe(270000);
    expect(plan.faltaCents).toBe(253400);
  });

  it("y pagar con lo apartado sí lo baja", () => {
    const plan = planDelProyecto(
      viaje({ ahorradoCents: 16600, pagadoCents: 90000, pagadoConApartadoCents: 90000, items: sinVuelos }),
      "2026-10"
    );

    expect(plan.apartadoDisponibleCents).toBe(0);
    expect(plan.faltaCents).toBe(270000);
  });
});

describe("capacidadSugerible", () => {
  it("es el 70% de lo libre, en dólares enteros hacia abajo", () => {
    expect(capacidadSugerible(172000)).toBe(120400);
    expect(capacidadSugerible(76399)).toBe(53400);
  });

  it("sin libre no hay capacidad", () => {
    expect(capacidadSugerible(0)).toBe(0);
    expect(capacidadSugerible(-5000)).toBe(0);
  });
});

describe("controlesDelPlan", () => {
  it("uno por cada fecha de pago futura, con lo que hay que tener apartado", () => {
    expect(controlesDelPlan(viaje(), "2026-10")).toEqual([
      { meses: 3, necesarioCents: 90000 },
      { meses: 5, necesarioCents: 210000 },
      { meses: 9, necesarioCents: 360000 },
    ]);
  });

  it("descuenta lo que ya está apartado y no pide nada de lo que vence ya", () => {
    const c = controlesDelPlan(
      viaje({
        ahorradoCents: 100000,
        items: [
          { id: "1", concepto: "Depósito", montoCents: 5000, fecha: "2026-10-25" },
          { id: "2", concepto: "Hotel", montoCents: 120000, fecha: "2027-03-01" },
        ],
      }),
      "2026-10"
    );

    // El depósito de este mes no tiene control; en marzo vencen 1.250 y ya hay 1.000.
    expect(c).toEqual([{ meses: 5, necesarioCents: 25000 }]);
  });
});

describe("repartirEnMeses", () => {
  it("más en los meses con más capacidad", () => {
    // 250 repartidos en capacidades 100 / 300 / 100 (proporcional: 50 / 150 / 50).
    expect(repartirEnMeses(25000, [10000, 30000, 10000], [])).toEqual([5000, 15000, 5000]);
  });

  it("con la misma capacidad en todos los meses reparte parejo", () => {
    expect(repartirEnMeses(60000, [50000, 50000, 50000], [])).toEqual([20000, 20000, 20000]);
  });

  it("adelanta lo necesario para llegar a un pago a tiempo", () => {
    // 900 en 3 meses parejos serían 300 c/u, pero al terminar el mes 1 ya hay que tener 400.
    const r = repartirEnMeses(90000, [50000, 50000, 50000], [{ meses: 1, necesarioCents: 40000 }]);

    expect(r[0]).toBe(40000);
    expect(r.reduce((t, v) => t + v, 0)).toBe(90000);
    expect(r[1]).toBe(25000);
    expect(r[2]).toBe(25000);
  });

  it("no pasa de la capacidad de un mes aunque el pago lo pida", () => {
    // El pago del mes 1 pide 600 pero solo caben 500: se sugiere lo que cabe.
    const r = repartirEnMeses(90000, [50000, 50000, 50000], [{ meses: 1, necesarioCents: 60000 }]);

    expect(r[0]).toBe(50000);
  });

  it("si entre todos los meses no caben, sugiere todo lo que cabe", () => {
    expect(repartirEnMeses(500000, [100000, 200000], [])).toEqual([100000, 200000]);
  });

  it("sin total o sin capacidad, ceros", () => {
    expect(repartirEnMeses(0, [100000, 100000], [])).toEqual([0, 0]);
    expect(repartirEnMeses(50000, [0, 0], [])).toEqual([0, 0]);
    expect(repartirEnMeses(50000, [], [])).toEqual([]);
  });
});
