import {
  listBudgets,
  listCategories,
  listMembers,
  listProyectoAportesMes,
  listProyectoItems,
  listProyectos,
  listProyectosArchivados,
} from "./datos";
import { mesActual } from "./formato";
import { armarVistaMes, type CategoriaDelMes } from "./presupuesto";
import {
  capacidadSugerible,
  conjuntoDelMes,
  controlesDelPlan,
  coberturaConAportes,
  disponibleDeLaPersona,
  disponibleHastaFecha,
  fraccionDelMes,
  planDelProyecto,
  repartirEnMeses,
  ultimaFechaDelProyecto,
  ventanaDeAhorro,
  type CoberturaProyecto,
  type ConjuntoDelMes,
  type DisponiblePersona,
  type MesLibre,
  type PlanProyecto,
  type ProyectoParaPlan,
} from "./proyectos";
import type { Proyecto, ProyectoItem } from "./schema";

export type AporteVista = {
  memberId: string;
  nombre: string;
  esMio: boolean;
  // Lo que planea apartar en los meses del proyecto (lo hecho y lo pendiente).
  totalCents: number;
  // Lo que ya marcó como hecho.
  hechoCents: number;
};

// Un mes de lo MÍO: lo que tengo libre y lo que aparto ese mes. Lo de la otra
// persona no se expone: solo su total.
export type MesAporteVista = MesLibre & {
  // Mi aporte ese mes: el que confirmé o, si no, la sugerencia.
  aporteCents: number;
  // true = lo confirmé yo; false = es la sugerencia.
  definido: boolean;
  // Ya lo aparté (cuenta como apartado del proyecto).
  hecho: boolean;
  sugeridoCents: number;
  // Lo más que puedo apartar ese mes: lo que me queda libre (nunca negativo).
  topeCents: number;
  // Lo que aportan todas las personas ese mes.
  totalMesCents: number;
  // Lo que aportan las otras personas ese mes (solo montos: nunca su libre ni sus ingresos).
  // Cualquier persona del hogar puede editarlos, igual que en el presupuesto.
  otros: { memberId: string; nombre: string; aporteCents: number; definido: boolean; hecho: boolean }[];
};

export type MiAporteVista = {
  meses: MesAporteVista[];
};

export type ProyectoVista = {
  proyecto: Proyecto;
  items: ProyectoItem[];
  plan: PlanProyecto;
  cobertura: CoberturaProyecto;
  aportes: AporteVista[];
  // Lo apartado marcando aportes como hechos (se suma a lo apartado al empezar).
  hechoCents: number;
  mio: MiAporteVista;
};

export type ProyectosVista = {
  mesHoy: string;
  proyectos: ProyectoVista[];
  // Para poder verlos y restaurarlos.
  archivados: Proyecto[];
};

const paraPlan = (
  proyecto: Proyecto,
  items: ProyectoItem[],
  hechoCents: number
): ProyectoParaPlan => ({
  fechaObjetivo: proyecto.targetDate,
  // Lo apartado al empezar más lo que se fue marcando como hecho.
  ahorradoCents: proyecto.ahorradoCents + hechoCents,
  // Lo ya pagado dejó de ser algo por apartar.
  pagadoCents: items.filter((i) => i.pagado).reduce((t, i) => t + i.montoCents, 0),
  // Solo lo pagado con lo apartado baja lo apartado; lo pagado por fuera no lo toca.
  pagadoConApartadoCents: items
    .filter((i) => i.pagado && i.pagadoConApartado)
    .reduce((t, i) => t + i.montoCents, 0),
  items: items
    .filter((i) => !i.pagado)
    .map((i) => ({ id: i.id, concepto: i.concepto, montoCents: i.montoCents, fecha: i.fecha })),
});

// Todo lo que hace falta para mostrar los proyectos del hogar a `yo`.
export async function armarProyectosVista(householdId: string, yo: string): Promise<ProyectosVista> {
  const mesHoy = mesActual();

  const [categorias, presupuestos, miembros, proyectos, archivados, items, aportes] = await Promise.all([
    listCategories(householdId),
    listBudgets(householdId),
    listMembers(householdId),
    listProyectos(householdId),
    listProyectosArchivados(householdId),
    listProyectoItems(householdId),
    listProyectoAportesMes(householdId),
  ]);

  // Meses en los que se aparta para cada proyecto (los que ya no tienen nada
  // pendiente no piden ahorro: su ventana queda vacía).
  const ventanas = new Map<string, string[]>();
  const ultimas = new Map<string, string>();
  for (const p of proyectos) {
    const pendientes = items.filter((i) => i.projectId === p.id && !i.pagado);
    ultimas.set(p.id, ultimaFechaDelProyecto(pendientes.map((i) => i.fecha), p.targetDate));
    ventanas.set(
      p.id,
      pendientes.length > 0
        ? ventanaDeAhorro(mesHoy, pendientes.map((i) => i.fecha), p.targetDate)
        : []
    );
  }

  // Lo planeado en cada mes necesario, tal como cada persona armó su
  // presupuesto (fijos heredados o propios del mes, y los extras que ya haya
  // cargado). No se supone nada: lo que no está cargado cuenta como está.
  const mesesALeer = new Set([mesHoy, ...[...ventanas.values()].flat()]);
  const vistas = new Map<string, CategoriaDelMes[]>();
  const disponibles = new Map<string, Map<string, DisponiblePersona>>();
  const conjuntos = new Map<string, ConjuntoDelMes>();
  for (const mes of mesesALeer) {
    const vista = armarVistaMes(categorias, presupuestos, [], mes);
    vistas.set(mes, vista);
    conjuntos.set(mes, conjuntoDelMes(vista));
    disponibles.set(mes, new Map(miembros.map((m) => [m.id, disponibleDeLaPersona(vista, m.id)])));
  }

  // Lo que cada persona aparta, por proyecto, persona y mes.
  const idsActivos = new Set(proyectos.map((p) => p.id));
  const filas = new Map<string, { montoCents: number; hecho: boolean }>();
  for (const a of aportes) {
    if (idsActivos.has(a.projectId)) {
      filas.set(`${a.projectId}:${a.memberId}:${a.month}`, { montoCents: a.montoCents, hecho: a.hecho });
    }
  }
  const filaDe = (projectId: string, memberId: string, mes: string) =>
    filas.get(`${projectId}:${memberId}:${mes}`);

  // Lo que `memberId` ya aparta ese mes para OTROS proyectos.
  const enOtros = (memberId: string, projectId: string, mes: string) =>
    proyectos
      .filter((q) => q.id !== projectId && (ventanas.get(q.id) ?? []).includes(mes))
      .reduce((t, q) => t + (filaDe(q.id, memberId, mes)?.montoCents ?? 0), 0);

  // Lo que `memberId` tiene libre cada mes de la ventana del proyecto (antes de
  // lo que aporte a ESTE proyecto).
  const mesesDe = (memberId: string, projectId: string): MesLibre[] => {
    const ventana = ventanas.get(projectId) ?? [];

    return (ventana.length > 0 ? ventana : [mesHoy]).map((mes) => {
      const d = disponibles.get(mes)?.get(memberId) ?? disponibleDeLaPersona([], memberId);
      const otros = enOtros(memberId, projectId, mes);
      const ultima = ultimas.get(projectId) ?? "";
      const fraccion = fraccionDelMes(mes, mesHoy, ultima);
      const libre = d.disponibleCents - otros;

      return {
        month: mes,
        salarioCents: d.salarioCents,
        ingresosExtraCents: d.ingresosExtraCents,
        fijosCents: d.fijosCents,
        extrasCents: d.extrasCents,
        otrosProyectosCents: otros,
        libreCents: libre,
        conjunto: conjuntos.get(mes) ?? { ingresosCents: 0, gastosCents: 0 },
        fraccion,
        // El mes del último pago solo cuenta lo que entra y sale hasta esa fecha.
        aprovechableCents:
          fraccion < 1 ? disponibleHastaFecha(vistas.get(mes) ?? [], memberId, ultima) - otros : libre,
        hastaFecha: fraccion < 1 ? ultima : "",
      };
    });
  };

  return {
    mesHoy,
    archivados,
    proyectos: proyectos.map((proyecto) => {
      const suyos = items.filter((i) => i.projectId === proyecto.id);
      const ventana = ventanas.get(proyecto.id) ?? [];

      // Lo que ya se marcó como hecho (de todas las personas, en cualquier mes).
      const hechoCents = aportes
        .filter((a) => a.projectId === proyecto.id && a.hecho)
        .reduce((t, a) => t + a.montoCents, 0);

      const datos = paraPlan(proyecto, suyos, hechoCents);
      const plan = planDelProyecto(datos, mesHoy);

      // Para cada persona y mes: lo libre y lo que aporta (confirmado o sugerido).
      const librePorPersona = new Map(miembros.map((m) => [m.id, mesesDe(m.id, proyecto.id)]));
      const aporteDe = new Map<string, { cents: number; definido: boolean; hecho: boolean; sugerido: number }>();
      const capDe = (memberId: string, mes: string) => {
        const m = librePorPersona.get(memberId)?.find((x) => x.month === mes);
        return capacidadSugerible(m?.aprovechableCents ?? 0);
      };
      const controles = controlesDelPlan(datos, mesHoy);

      // El plan sugerido: lo que falta por apartar se reparte entre los meses según
      // la capacidad de cada uno (sus ingresos y gastos, fijos y extra) y cumpliendo
      // las fechas de pago. La sugerencia de cada persona solo depende de lo SUYO: lo
      // que ella ya confirmó se respeta (la sugerencia llena solo lo que falta), pero lo
      // que confirme o cambie la otra persona no la mueve; lo ya hecho sí, porque ya es
      // dinero apartado. `para` = de quién son las sugerencias que se calculan.
      // `excepcion` = una persona y un mes a los que se les calcula lo que se les
      // sugeriría aunque ya hayan confirmado (para mostrar su sugerido junto a su monto).
      const sugerir = (excepcion: { memberId: string; mes: string } | null, para: string) => {
        const resultado = new Map<string, number>();
        const sinConfirmar = (memberId: string, mes: string) => {
          const fila = filaDe(proyecto.id, memberId, mes);
          if (fila === undefined) return true;
          // Lo pendiente de las demás personas no cuenta para esta sugerencia.
          if (memberId !== para) return !fila.hecho;
          return excepcion !== null && excepcion.memberId === memberId && excepcion.mes === mes && !fila.hecho;
        };
        // Lo confirmado que aún no está hecho (lo hecho ya está en lo apartado).
        const pendienteConfirmado = ventana.map((mes) =>
          miembros.reduce((t, m) => {
            const fila = filaDe(proyecto.id, m.id, mes);
            return t + (fila && !fila.hecho && !sinConfirmar(m.id, mes) ? fila.montoCents : 0);
          }, 0)
        );
        const capacidad = ventana.map((mes) =>
          miembros.reduce((t, m) => t + (sinConfirmar(m.id, mes) ? capDe(m.id, mes) : 0), 0)
        );
        const confirmadoAntes = (meses: number) =>
          pendienteConfirmado.slice(0, meses).reduce((t, v) => t + v, 0);

        const objetivos = repartirEnMeses(
          Math.max(0, plan.faltaCents - confirmadoAntes(ventana.length)),
          capacidad,
          controles.map((c) => ({
            meses: c.meses,
            necesarioCents: Math.max(0, c.necesarioCents - confirmadoAntes(c.meses)),
          }))
        );

        ventana.forEach((mes, i) => {
          for (const m of miembros) {
            if (!sinConfirmar(m.id, mes)) continue;
            const cap = capDe(m.id, mes);
            const parte = capacidad[i] > 0 ? (objetivos[i] * cap) / capacidad[i] : 0;
            // En dólares enteros hacia arriba, sin pasar de lo que se sugiere como máximo.
            resultado.set(`${m.id}:${mes}`, Math.min(cap, Math.ceil(parte / 100) * 100));
          }
        });

        return resultado;
      };

      // Las sugerencias de cada persona, cada una con lo suyo.
      const sugeridosPor = new Map(miembros.map((m) => [m.id, sugerir(null, m.id)]));
      const sugeridoDe = (memberId: string, clave: string) => sugeridosPor.get(memberId)?.get(clave);

      for (const mes of ventana) {
        for (const m of miembros) {
          const clave = `${m.id}:${mes}`;
          const fila = filaDe(proyecto.id, m.id, mes);
          aporteDe.set(clave, {
            cents: fila?.montoCents ?? sugeridoDe(m.id, clave) ?? 0,
            definido: fila !== undefined,
            hecho: fila?.hecho ?? false,
            // Mi sugerido de un mes que ya confirmé se calcula solo para ese mes.
            sugerido:
              // Con un 0 confirmado no se sugiere nada más ese mes.
              fila && fila.montoCents === 0
                ? 0
                : m.id === yo && fila && !fila.hecho
                ? (sugerir({ memberId: yo, mes }, yo).get(clave) ?? fila.montoCents)
                : fila?.hecho
                  ? fila.montoCents
                  : (sugeridoDe(m.id, clave) ?? 0),
          });
        }
      }

      // Lo planeado por mes (todas las personas), sin lo ya hecho: eso ya está en lo apartado.
      const planeadoPorMes: Record<string, number> = {};
      const totalMes = (mes: string) =>
        miembros.reduce((t, m) => t + (aporteDe.get(`${m.id}:${mes}`)?.cents ?? 0), 0);
      for (const mes of ventana) {
        planeadoPorMes[mes] = miembros.reduce((t, m) => {
          const a = aporteDe.get(`${m.id}:${mes}`);
          return t + (a && !a.hecho ? a.cents : 0);
        }, 0);
      }

      const lista: AporteVista[] = miembros.map((m) => ({
        memberId: m.id,
        nombre: m.displayName,
        esMio: m.id === yo,
        totalCents: ventana.reduce((t, mes) => t + (aporteDe.get(`${m.id}:${mes}`)?.cents ?? 0), 0),
        hechoCents: aportes
          .filter((a) => a.projectId === proyecto.id && a.memberId === m.id && a.hecho)
          .reduce((t, a) => t + a.montoCents, 0),
      }));

      const mios: MesAporteVista[] = (librePorPersona.get(yo) ?? []).map((l) => {
        const a = aporteDe.get(`${yo}:${l.month}`);

        return {
          ...l,
          aporteCents: a?.cents ?? 0,
          definido: a?.definido ?? false,
          hecho: a?.hecho ?? false,
          sugeridoCents: a?.sugerido ?? 0,
          // En el mes del último pago solo cuenta lo que entra y sale hasta esa fecha.
          topeCents: Math.max(0, l.aprovechableCents),
          totalMesCents: totalMes(l.month),
          otros: miembros
            .filter((m) => m.id !== yo)
            .map((m) => {
              const otro = aporteDe.get(`${m.id}:${l.month}`);
              return {
                memberId: m.id,
                nombre: m.displayName,
                aporteCents: otro?.cents ?? 0,
                definido: otro?.definido ?? false,
                hecho: otro?.hecho ?? false,
              };
            }),
        };
      });

      return {
        proyecto,
        items: suyos,
        plan,
        cobertura: coberturaConAportes(datos, planeadoPorMes, mesHoy),
        aportes: lista,
        hechoCents,
        mio: { meses: mios },
      };
    }),
  };
}

// El mes de `memberId` en el proyecto, con su tope. null = ese mes no está
// entre los meses en que se aparta para el proyecto.
export async function mesDeAporte(
  householdId: string,
  memberId: string,
  projectId: string,
  mes: string
): Promise<MesAporteVista | null> {
  const vista = await armarProyectosVista(householdId, memberId);
  const proyecto = vista.proyectos.find((p) => p.proyecto.id === projectId);

  return proyecto?.mio.meses.find((m) => m.month === mes) ?? null;
}
