import { fechasDeCobro } from "./cobros";
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
  // Suma de los ítems ya pagados (cuenta para el presupuesto objetivo). 0 si no viene.
  pagadoCents?: number;
  // De esos, lo que se pagó CON lo apartado para el proyecto: eso sí se
  // descuenta de lo apartado. Lo pagado por fuera no lo toca. 0 si no viene.
  pagadoConApartadoCents?: number;
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

// Lo apartado que queda después de pagar con ello lo que se pagó con lo
// apartado (nunca negativo: si se pagó más de lo apartado, el resto salió de
// otro lado). Lo pagado por fuera no lo toca.
export function apartadoDisponible(proyecto: ProyectoParaPlan): number {
  return Math.max(0, proyecto.ahorradoCents - (proyecto.pagadoConApartadoCents ?? 0));
}

// Si un pago cae del día 16 en adelante, la primera quincena de ese mismo mes
// todavía sirve para apartar: ese mes cuenta, pero solo a medias.
export const DIA_SEGUNDA_QUINCENA = 16;
export const FRACCION_MES_PARCIAL = 0.5;

// Meses completos entre dos "YYYY-MM" (b - a).
export function mesesEntre(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// Cuántos meses de la ventana se pueden usar para un pago: desde este mes hasta
// el mes anterior al pago, más el mes del pago si cae del 16 en adelante (ese
// último cuenta a medias, ver FRACCION_MES_PARCIAL). Si el pago es este mes o ya
// pasó, no queda ninguno (≤ 0).
export function mesesParaApartar(mesHoy: string, fecha: string): number {
  const meses = mesesEntre(mesHoy, fecha.slice(0, 7));
  if (meses < 1) return meses;
  return Number(fecha.slice(8, 10)) >= DIA_SEGUNDA_QUINCENA ? meses + 1 : meses;
}

// Cuánto de un mes se puede usar para apartar: el mes del último pago (si es
// posterior a este mes y entra por caer del 16 en adelante) cuenta a medias;
// los demás, completos.
export function fraccionDelMes(mes: string, mesHoy: string, ultimaFecha: string): number {
  const esElUltimo = mes === ultimaFecha.slice(0, 7) && mes > mesHoy;
  return esElUltimo && Number(ultimaFecha.slice(8, 10)) >= DIA_SEGUNDA_QUINCENA ? FRACCION_MES_PARCIAL : 1;
}

// La fecha del último pago: la del proyecto o la de algún gasto pendiente, la que sea más tarde.
export function ultimaFechaDelProyecto(fechas: string[], fechaProyecto: string): string {
  return [fechaProyecto, ...fechas].filter(Boolean).reduce((max, f) => (f > max ? f : max), "");
}

// Cuota mínima: la menor que deja ahorrado, en cada fecha de pago, al menos
// lo que vence hasta ese día. Se aparta una vez por mes, desde el mes actual
// hasta el mes anterior al pago (y la primera quincena del mes del pago, si el
// pago cae del 16 en adelante). `mesHoy` es "YYYY-MM".
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

    // El mes del pago, si entra, vale la mitad.
    const equivalentes = meses + (mesesParaApartar(mesHoy, fecha) > meses ? FRACCION_MES_PARCIAL : 0);
    const cuota = Math.ceil(porCubrir / equivalentes);

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
  ingresosExtraCents: number; // ingresos extra (variables) a su nombre en el mes
  fijosCents: number; // gastos fijos a su nombre
  extrasCents: number; // gastos extra (variables) a su nombre en el mes
  // salario + ingresos extra - fijos - extras; puede ser negativo.
  disponibleCents: number;
};

// Lo que le queda a una persona en el mes: sus ingresos (fijos y extra) menos
// sus gastos fijos y sus gastos extra, tal como los presupuestó. Solo cuenta lo
// que está a su nombre (lo conjunto no se le suma ni se le resta a nadie).
export function disponibleDeLaPersona(items: CategoriaDelMes[], memberId: string): DisponiblePersona {
  const mios = items.filter((i) => i.category.ownerMemberId === memberId);
  const suma = (lista: CategoriaDelMes[]) => lista.reduce((t, i) => t + i.plannedAmountCents, 0);

  const salarioCents = suma(mios.filter((i) => i.category.fixed && i.category.kind === "income"));
  const ingresosExtraCents = suma(mios.filter((i) => !i.category.fixed && i.category.kind === "income"));
  const fijosCents = suma(mios.filter((i) => i.category.fixed && i.category.kind === "expense"));
  const extrasCents = suma(mios.filter((i) => !i.category.fixed && i.category.kind === "expense"));

  return {
    salarioCents,
    ingresosExtraCents,
    fijosCents,
    extrasCents,
    disponibleCents: salarioCents + ingresosExtraCents - fijosCents - extrasCents,
  };
}

// Qué parte de un ítem del mes ocurre hasta `hasta` (YYYY-MM-DD): los pagos o
// cobros con fecha cuentan si caen hasta ese día. Si no se sabe cuándo, se
// supone la mitad (FRACCION_MES_PARCIAL).
function parteHasta(item: CategoriaDelMes, mes: string, hasta: string): number {
  const fechas = item.category.fixed
    ? fechasDeCobro(item.category, mes)
    : [item.fechaPago].filter(Boolean);

  if (fechas.length === 0) return FRACCION_MES_PARCIAL;
  return fechas.filter((f) => f <= hasta).length / fechas.length;
}

// Lo que una persona tiene disponible en el mes SOLO hasta `hasta`: sus ingresos
// que ya habrán entrado y sus gastos que ya habrán salido para esa fecha. Sirve
// para el mes del último pago de un proyecto: ahí no cuenta todo el mes, sino lo
// que llega antes del pago (p. ej. un sueldo del 28 no sirve para un pago del 26).
export function disponibleHastaFecha(items: CategoriaDelMes[], memberId: string, hasta: string): number {
  const mes = hasta.slice(0, 7);
  let total = 0;

  for (const item of items) {
    if (item.category.ownerMemberId !== memberId || item.plannedAmountCents <= 0) continue;
    const signo = item.category.kind === "income" ? 1 : -1;
    total += signo * Math.round(item.plannedAmountCents * parteHasta(item, mes, hasta));
  }

  return total;
}

// Lo máximo de lo libre que se SUGIERE apartar. El tope real (lo que se puede
// escribir) es todo lo libre, pero no se sugiere llegar ahí: hay que dejar
// margen para imprevistos.
export const PORCENTAJE_MAXIMO_SUGERIDO = 70;

// Lo más que se sugiere que una persona aparte en un mes con `libreCents`
// libres: el 70%, en dólares enteros hacia abajo. Con enteros: 172000 * 0.7
// da 120399,99… y se perdería un dólar.
export function capacidadSugerible(libreCents: number): number {
  if (libreCents <= 0) return 0;
  return Math.floor((libreCents * PORCENTAJE_MAXIMO_SUGERIDO) / 10000) * 100;
}

// Un pago futuro del proyecto: antes de los `meses` primeros meses de la
// ventana tiene que haber apartado, en total, `necesarioCents` (ya descontado
// lo que está apartado).
export type ControlDelPlan = { meses: number; necesarioCents: number };

// Los puntos de control del plan: uno por cada fecha de pago futura. Lo que
// vence este mes o ya venció no tiene control (ya no se arregla ahorrando).
export function controlesDelPlan(proyecto: ProyectoParaPlan, mesHoy: string): ControlDelPlan[] {
  const items = proyecto.items.map((i) => ({ ...i, fecha: i.fecha || proyecto.fechaObjetivo }));
  const porMeses = new Map<number, number>();

  for (const fecha of [...new Set(items.map((i) => i.fecha))].sort()) {
    const vence = items.filter((i) => i.fecha <= fecha).reduce((t, i) => t + i.montoCents, 0);
    const meses = mesesParaApartar(mesHoy, fecha);
    if (meses <= 0) continue;

    const necesario = Math.max(0, vence - apartadoDisponible(proyecto));
    porMeses.set(meses, Math.max(porMeses.get(meses) ?? 0, necesario));
  }

  return [...porMeses.entries()]
    .map(([meses, necesarioCents]) => ({ meses, necesarioCents }))
    .sort((a, b) => a.meses - b.meses);
}

// Reparte `totalCents` entre los meses: más en los que hay más capacidad
// (ingresos y gastos de ese mes), sin pasar de la capacidad de cada uno y
// cumpliendo, mientras alcance, lo que hay que tener apartado antes de cada
// pago. Si entre todos los meses no caben, se sugiere todo lo que cabe.
export function repartirEnMeses(
  totalCents: number,
  capacidades: number[],
  controles: ControlDelPlan[]
): number[] {
  const n = capacidades.length;
  const cap = capacidades.map((c) => Math.max(0, c));
  const capTotal = cap.reduce((t, c) => t + c, 0);

  if (n === 0 || totalCents <= 0 || capTotal === 0) return cap.map(() => 0);
  if (capTotal <= totalCents) return [...cap];

  // Primera idea: en proporción a la capacidad de cada mes.
  const a = cap.map((c) => (totalCents * c) / capTotal);

  // Después se adelanta lo necesario para llegar a cada pago a tiempo,
  // quitándolo de los meses posteriores para no cambiar el total.
  for (const control of [...controles].sort((x, y) => x.meses - y.meses)) {
    const k = Math.min(control.meses, n);
    const faltante = control.necesarioCents - a.slice(0, k).reduce((t, v) => t + v, 0);
    if (faltante <= 0.01) continue;

    const sobra = a.slice(0, k).map((v, i) => cap[i] - v);
    const sobraTotal = sobra.reduce((t, v) => t + v, 0);
    const mover = Math.min(faltante, sobraTotal);
    if (mover <= 0) continue;

    for (let i = 0; i < k; i++) a[i] += (mover * sobra[i]) / sobraTotal;

    const resto = a.slice(k).reduce((t, v) => t + v, 0);
    if (resto > 0) for (let i = k; i < n; i++) a[i] -= (mover * a[i]) / resto;
  }

  return a.map((v) => Math.round(v));
}

// ---------- Los meses en los que se aparta ----------

// "2026-10" + 3 -> "2027-01".
export function sumarMeses(month: string, n: number): string {
  const [anio, mes] = month.split("-").map(Number);
  const total = anio * 12 + (mes - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// Meses en los que se puede apartar para un proyecto: desde este mes hasta el
// mes anterior al último pago (la fecha del proyecto o la de algún gasto
// pendiente, la que sea más tarde), más el mes del último pago si cae del 16 en
// adelante (ese cuenta a medias: ver fraccionDelMes). Siempre incluye al menos
// este mes.
export function ventanaDeAhorro(mesHoy: string, fechas: string[], fechaProyecto: string): string[] {
  const ultima = ultimaFechaDelProyecto(fechas, fechaProyecto);
  const cantidad = Math.max(1, mesesParaApartar(mesHoy, ultima));

  return Array.from({ length: cantidad }, (_, i) => sumarMeses(mesHoy, i));
}

// Lo que está a nombre de "conjunto" en un mes: no se le suma ni se le resta
// a nadie, así que conviene mostrarlo para que se vea qué queda sin contar.
export type ConjuntoDelMes = { ingresosCents: number; gastosCents: number };

export function conjuntoDelMes(items: CategoriaDelMes[]): ConjuntoDelMes {
  const sinDueno = items.filter((i) => !i.category.ownerMemberId && i.plannedAmountCents > 0);
  const suma = (lista: CategoriaDelMes[]) => lista.reduce((t, i) => t + i.plannedAmountCents, 0);

  return {
    ingresosCents: suma(sinDueno.filter((i) => i.category.kind === "income")),
    gastosCents: suma(sinDueno.filter((i) => i.category.kind === "expense")),
  };
}

// Lo que una persona tiene libre en UN mes, con el detalle.
export type MesLibre = {
  month: string; // YYYY-MM
  salarioCents: number;
  ingresosExtraCents: number;
  fijosCents: number;
  extrasCents: number;
  // Lo que ya aparta ese mes para otros proyectos.
  otrosProyectosCents: number;
  // salario + ingresos extra - fijos - extras - otros; puede ser negativo. Es
  // lo libre ANTES de lo que aporte a este proyecto.
  libreCents: number;
  // Lo conjunto de ese mes (sin dueño): informativo, no entra en el libre.
  conjunto: ConjuntoDelMes;
  // Cuánto de ese mes se puede usar para apartar: 1, o 0.5 si es el mes del
  // último pago y solo sirve lo que pasa antes de esa fecha.
  fraccion: number;
  // Lo que se puede usar para apartar ese mes (= libreCents salvo en el mes del
  // último pago, donde solo cuenta lo que entra y sale hasta `hastaFecha`).
  aprovechableCents: number;
  // "" = el mes completo; si no, el último día que cuenta (YYYY-MM-DD).
  hastaFecha: string;
};

// El mes con menos libre manda: un aporte es un monto fijo por mes, así que
// solo se sostiene si cabe en el mes más ajustado. Si hay empate, el primero.
// El tope nunca es negativo.
export function mesMasAjustado(meses: MesLibre[]): { month: string; topeCents: number } {
  if (meses.length === 0) return { month: "", topeCents: 0 };

  const peor = meses.reduce((p, m) => (m.libreCents < p.libreCents ? m : p));

  return { month: peor.month, topeCents: Math.max(0, peor.libreCents) };
}

// ---------- Si los aportes alcanzan ----------

export type CoberturaProyecto = {
  // Lo que falta por apartar de lo planeado: la suma de los aportes de todas
  // las personas en los meses que aún no están marcados como hechos.
  planeadoCents: number;
  // Con lo que ya hay apartado más lo planeado se paga cada ítem a tiempo.
  alcanza: boolean;
  // Si no alcanza: la primera fecha en que falta plata, y cuánto.
  fechaProblema: string;
  faltanteEnFechaCents: number;
  // Esa fecha es este mes o ya pasó: apartar más en los meses que quedan ya no la arregla.
  problemaYaVencido: boolean;
  // Meses que tardan en juntar todo lo comprometido con lo planeado. null = con
  // lo planeado no se completa nunca; 0 = ya está cubierto.
  mesesParaCubrirTodo: number | null;
};

// Comprueba, fecha por fecha, que lo apartado más lo que se planea apartar mes
// a mes llegue a lo que vence. `aportesPorMes` es lo que se planea apartar en
// cada mes ("YYYY-MM" -> centavos), sumando a todas las personas y SOLO lo que
// todavía no está hecho (lo hecho ya cuenta en lo apartado). Se aparta en los
// meses desde el actual hasta el anterior al pago (igual que en planDelProyecto).
export function coberturaConAportes(
  proyecto: ProyectoParaPlan,
  aportesPorMes: Record<string, number>,
  mesHoy: string
): CoberturaProyecto {
  const delMes = (i: number) => aportesPorMes[sumarMeses(mesHoy, i)] ?? 0;
  // Lo que se planea apartar durante los primeros `meses` meses.
  const apartadoEn = (meses: number) => {
    let total = 0;
    for (let i = 0; i < meses; i++) total += delMes(i);
    return total;
  };

  const plan = planDelProyecto(proyecto, mesHoy);
  const items = proyecto.items.map((i) => ({ ...i, fecha: i.fecha || proyecto.fechaObjetivo }));

  let fechaProblema = "";
  let faltanteEnFechaCents = 0;
  let problemaYaVencido = false;

  for (const fecha of [...new Set(items.map((i) => i.fecha))].sort()) {
    const vence = items.filter((i) => i.fecha <= fecha).reduce((t, i) => t + i.montoCents, 0);
    const meses = Math.max(0, mesesParaApartar(mesHoy, fecha));
    const reunido = apartadoDisponible(proyecto) + apartadoEn(meses);

    if (reunido < vence) {
      fechaProblema = fecha;
      faltanteEnFechaCents = vence - reunido;
      problemaYaVencido = mesesEntre(mesHoy, fecha.slice(0, 7)) <= 0;
      break;
    }
  }

  // Meses que tardan en juntar todo con lo planeado.
  let mesesParaCubrirTodo: number | null = null;
  if (plan.faltaCents === 0) {
    mesesParaCubrirTodo = 0;
  } else {
    const ultimoMes = Object.keys(aportesPorMes).reduce((max, m) => (m > max ? m : max), "");
    let acumulado = 0;
    for (let i = 0; i < 600; i++) {
      acumulado += delMes(i);
      if (acumulado >= plan.faltaCents) {
        mesesParaCubrirTodo = i + 1;
        break;
      }
      // Ya no hay más aportes planeados por delante: no se completa.
      if (sumarMeses(mesHoy, i) >= ultimoMes) break;
    }
  }

  const planeadoCents = Object.entries(aportesPorMes)
    .filter(([mes]) => mes >= mesHoy)
    .reduce((t, [, cents]) => t + cents, 0);

  return {
    planeadoCents,
    alcanza: fechaProblema === "",
    fechaProblema,
    faltanteEnFechaCents,
    problemaYaVencido,
    mesesParaCubrirTodo,
  };
}
