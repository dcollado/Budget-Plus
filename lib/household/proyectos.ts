import type { CategoriaDelMes } from "./presupuesto";
import { quincena } from "./transferencias";

// Un proyecto grande (viaje, remodelación…): lo que se va a pagar y cuándo.
// "Comprometido" es la suma de los precios de los ítems; el "presupuesto
// objetivo" es solo una referencia que escribe la persona (0 = sin objetivo).

export type ItemProyecto = {
  id: string;
  concepto: string;
  montoCents: number;
  // YYYY-MM-DD. "" = sin fecha: se asume la fecha del proyecto.
  fecha: string;
};

export type ProyectoParaPlan = {
  fechaObjetivo: string; // YYYY-MM-DD
  objetivoCents: number; // 0 = sin presupuesto objetivo
  // Total que se ha apartado hasta hoy, incluido lo que ya se usó para pagar.
  ahorradoCents: number;
  // Suma de los ítems ya pagados. Se pagaron con lo apartado, así que se
  // descuentan de él. 0 si no viene.
  pagadoCents?: number;
  // Solo los ítems que faltan por pagar.
  items: ItemProyecto[];
};

export type PlanProyecto = {
  // Suma de los precios de los ítems que faltan por pagar.
  comprometidoCents: number;
  // Lo ya pagado, y lo que queda apartado después de pagarlo.
  pagadoCents: number;
  apartadoDisponibleCents: number;
  // Lo que falta por apartar (comprometido - apartado disponible, nunca negativo).
  faltaCents: number;
  // Cuota mínima para pagar cada ítem a tiempo.
  cuotaMensualCents: number;
  cuotaQuincenalCents: number;
  // Fecha del pago que fija la cuota ("" si no hace falta apartar nada).
  fechaLimitante: string;
  // Lo que ya venció (o vence este mes) y no está cubierto: la cuota no lo
  // alcanza porque no queda ningún mes para apartarlo.
  urgenteCents: number;
  // (Pagado + comprometido) - objetivo: positivo = por encima del objetivo;
  // 0 si no hay objetivo. El objetivo es del proyecto entero, así que lo ya
  // pagado también cuenta.
  sobreObjetivoCents: number;
  // Objetivo - (pagado + comprometido): lo que queda por asignar; 0 si no hay objetivo.
  porAsignarCents: number;
};

// Lo apartado que queda después de pagar lo que ya se pagó (nunca negativo:
// si se pagó más de lo apartado, el resto salió de otro lado).
export function apartadoDisponible(proyecto: ProyectoParaPlan): number {
  return Math.max(0, proyecto.ahorradoCents - (proyecto.pagadoCents ?? 0));
}

// Meses completos entre dos "YYYY-MM" (b - a).
export function mesesEntre(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// Cuota mínima: la menor que deja ahorrado, en cada fecha de pago, al menos
// lo que vence hasta ese día. Se aparta una vez por mes, desde el mes actual
// hasta el mes anterior al pago. `mesHoy` es "YYYY-MM".
export function planDelProyecto(proyecto: ProyectoParaPlan, mesHoy: string): PlanProyecto {
  const items = proyecto.items.map((i) => ({
    ...i,
    fecha: i.fecha || proyecto.fechaObjetivo,
  }));

  const comprometidoCents = items.reduce((suma, i) => suma + i.montoCents, 0);
  const pagadoCents = proyecto.pagadoCents ?? 0;
  const apartadoDisponibleCents = apartadoDisponible(proyecto);
  const faltaCents = Math.max(0, comprometidoCents - apartadoDisponibleCents);

  const fechas = [...new Set(items.map((i) => i.fecha))].sort();

  let cuotaMensualCents = 0;
  let fechaLimitante = "";
  let urgenteCents = 0;

  for (const fecha of fechas) {
    const vencidoHastaAqui = items
      .filter((i) => i.fecha <= fecha)
      .reduce((suma, i) => suma + i.montoCents, 0);
    const porCubrir = Math.max(0, vencidoHastaAqui - apartadoDisponibleCents);
    if (porCubrir === 0) continue;

    const meses = mesesEntre(mesHoy, fecha.slice(0, 7));

    if (meses <= 0) {
      // Ya venció o vence este mes: ningún mes alcanza para apartarlo.
      urgenteCents = Math.max(urgenteCents, porCubrir);
      continue;
    }

    const cuota = Math.ceil(porCubrir / meses);

    if (cuota > cuotaMensualCents) {
      cuotaMensualCents = cuota;
      fechaLimitante = fecha;
    }
  }

  const hayObjetivo = proyecto.objetivoCents > 0;
  const totalProyectoCents = pagadoCents + comprometidoCents;

  return {
    comprometidoCents,
    pagadoCents,
    apartadoDisponibleCents,
    faltaCents,
    cuotaMensualCents,
    cuotaQuincenalCents: quincena(cuotaMensualCents),
    fechaLimitante,
    urgenteCents,
    sobreObjetivoCents: hayObjetivo ? Math.max(0, totalProyectoCents - proyecto.objetivoCents) : 0,
    porAsignarCents: hayObjetivo ? Math.max(0, proyecto.objetivoCents - totalProyectoCents) : 0,
  };
}

// ---------- Lo que cada persona puede apartar ----------

export type DisponiblePersona = {
  salarioCents: number; // ingresos fijos a su nombre
  fijosCents: number; // gastos fijos a su nombre
  extrasCents: number; // gastos extra (variables) a su nombre en el mes
  // salario - fijos - extras; puede ser negativo.
  disponibleCents: number;
};

// Lo que le queda a una persona en el mes después de sus gastos fijos y de
// sus gastos extra. Mismo criterio que "Tus transferencias": solo cuenta lo
// que está a su nombre (los gastos conjuntos no se le restan a nadie) y los
// ingresos extra no se cuentan, porque no son seguros.
export function disponibleDeLaPersona(items: CategoriaDelMes[], memberId: string): DisponiblePersona {
  const mios = items.filter((i) => i.category.ownerMemberId === memberId);
  const suma = (lista: CategoriaDelMes[]) => lista.reduce((t, i) => t + i.plannedAmountCents, 0);

  const salarioCents = suma(mios.filter((i) => i.category.fixed && i.category.kind === "income"));
  const fijosCents = suma(mios.filter((i) => i.category.fixed && i.category.kind === "expense"));
  const extrasCents = suma(mios.filter((i) => !i.category.fixed && i.category.kind === "expense"));

  return {
    salarioCents,
    fijosCents,
    extrasCents,
    disponibleCents: salarioCents - fijosCents - extrasCents,
  };
}

// Lo máximo de lo libre que se SUGIERE apartar. El tope real (lo que se puede
// escribir) es todo lo libre, pero no se sugiere llegar ahí: hay que dejar
// margen para imprevistos.
export const PORCENTAJE_MAXIMO_SUGERIDO = 70;

export type LibrePersona = { memberId: string; libreCents: number };

// Primera versión del aporte de cada persona, a partir del tiempo (la cuota
// mínima que pide el proyecto) y de lo que cada una tiene libre: la cuota se
// reparte en proporción a lo libre, en dólares enteros hacia arriba, y a
// nadie se le sugiere más del 70% de lo suyo. Si entre todas no alcanzan la
// cuota, la suma queda por debajo y la pantalla muestra lo que falta. Es solo
// una sugerencia: cada persona puede cambiarla hasta su tope.
export function aportesSugeridos(
  cuotaMensualCents: number,
  libres: LibrePersona[]
): Record<string, number> {
  const conLibre = libres.filter((l) => l.libreCents > 0);
  const totalLibre = conLibre.reduce((t, l) => t + l.libreCents, 0);
  const resultado: Record<string, number> = {};

  for (const l of libres) resultado[l.memberId] = 0;
  if (cuotaMensualCents <= 0 || totalLibre === 0) return resultado;

  for (const l of conLibre) {
    const parte = Math.ceil(((cuotaMensualCents * l.libreCents) / totalLibre) / 100) * 100;
    // Con enteros: 172000 * 0.7 da 120399,99… y se perdería un dólar.
    const comodo = Math.floor((l.libreCents * PORCENTAJE_MAXIMO_SUGERIDO) / 10000) * 100;
    resultado[l.memberId] = Math.min(parte, comodo);
  }

  return resultado;
}

export type PersonaAporte = {
  memberId: string;
  libreCents: number;
  // Lo que ya confirmó; null = todavía no (se le sugiere).
  confirmadoCents: number | null;
};

// Sugerencia para cada persona teniendo en cuenta lo que las demás YA
// confirmaron: lo que falta de la cuota (después de lo confirmado por las
// otras) se reparte entre ella y quienes aún no confirman. Así, si una persona
// baja su aporte, la sugerencia de la otra sube para compensar (hasta su 70%).
export function sugerirAportes(
  cuotaMensualCents: number,
  personas: PersonaAporte[]
): Record<string, number> {
  const resultado: Record<string, number> = {};

  for (const p of personas) {
    const confirmadoPorOtras = personas
      .filter((o) => o.memberId !== p.memberId && o.confirmadoCents !== null)
      .reduce((t, o) => t + (o.confirmadoCents ?? 0), 0);

    const participantes = personas
      .filter((o) => o.memberId === p.memberId || o.confirmadoCents === null)
      .map((o) => ({ memberId: o.memberId, libreCents: o.libreCents }));

    resultado[p.memberId] =
      aportesSugeridos(Math.max(0, cuotaMensualCents - confirmadoPorOtras), participantes)[p.memberId] ?? 0;
  }

  return resultado;
}

// ---------- Si los aportes alcanzan ----------

export type CoberturaProyecto = {
  // Lo que se aparta por mes entre todos.
  aportesMensualCents: number;
  // Lo que falta por mes para llegar a la cuota mínima (0 si ya la cubren).
  faltanteMensualCents: number;
  // Con estos aportes se paga cada ítem a tiempo.
  alcanza: boolean;
  // Si no alcanza: la primera fecha en que falta plata, y cuánto.
  fechaProblema: string;
  faltanteEnFechaCents: number;
  // Esa fecha es este mes o ya pasó: aportar más cada mes ya no la arregla.
  problemaYaVencido: boolean;
  // Meses que tardan en juntar todo lo comprometido. null = no se aparta
  // nada, así que no se completa nunca; 0 = ya está cubierto.
  mesesParaCubrirTodo: number | null;
};

// Comprueba, fecha por fecha, que lo ahorrado más lo que se aparta cada mes
// llegue a lo que vence. Se aparta una vez por mes desde el mes actual hasta
// el mes anterior al pago (igual que en planDelProyecto).
export function coberturaConAportes(
  proyecto: ProyectoParaPlan,
  aportesMensualCents: number,
  mesHoy: string
): CoberturaProyecto {
  const plan = planDelProyecto(proyecto, mesHoy);
  const items = proyecto.items.map((i) => ({ ...i, fecha: i.fecha || proyecto.fechaObjetivo }));

  let fechaProblema = "";
  let faltanteEnFechaCents = 0;
  let problemaYaVencido = false;

  for (const fecha of [...new Set(items.map((i) => i.fecha))].sort()) {
    const vence = items.filter((i) => i.fecha <= fecha).reduce((t, i) => t + i.montoCents, 0);
    const meses = Math.max(0, mesesEntre(mesHoy, fecha.slice(0, 7)));
    const reunido = apartadoDisponible(proyecto) + aportesMensualCents * meses;

    if (reunido < vence) {
      fechaProblema = fecha;
      faltanteEnFechaCents = vence - reunido;
      problemaYaVencido = mesesEntre(mesHoy, fecha.slice(0, 7)) <= 0;
      break;
    }
  }

  let mesesParaCubrirTodo: number | null;
  if (plan.faltaCents === 0) mesesParaCubrirTodo = 0;
  else if (aportesMensualCents <= 0) mesesParaCubrirTodo = null;
  else mesesParaCubrirTodo = Math.ceil(plan.faltaCents / aportesMensualCents);

  return {
    aportesMensualCents,
    faltanteMensualCents: Math.max(0, plan.cuotaMensualCents - aportesMensualCents),
    alcanza: fechaProblema === "",
    fechaProblema,
    faltanteEnFechaCents,
    problemaYaVencido,
    mesesParaCubrirTodo,
  };
}
