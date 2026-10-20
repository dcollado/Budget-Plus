import {
  listBudgets,
  listCategories,
  listMembers,
  listProyectoAportes,
  listProyectoItems,
  listProyectos,
} from "./datos";
import { mesActual } from "./formato";
import { armarVistaMes } from "./presupuesto";
import {
  aportesSugeridos,
  coberturaConAportes,
  disponibleDeLaPersona,
  planDelProyecto,
  type CoberturaProyecto,
  type PlanProyecto,
  type ProyectoParaPlan,
} from "./proyectos";
import type { Proyecto, ProyectoItem } from "./schema";

export type AporteVista = {
  memberId: string;
  nombre: string;
  montoCents: number;
  // false = nadie lo ha confirmado: es la sugerencia.
  definido: boolean;
  esMio: boolean;
};

// Lo que ve cada persona de SU propio disponible. Lo de la otra persona no
// se expone: solo su aporte.
export type MiAporteVista = {
  salarioCents: number;
  fijosCents: number;
  extrasCents: number;
  // Aportes a otros proyectos activos.
  otrosProyectosCents: number;
  // Tope de lo que puede escribir: lo que le queda libre (nunca negativo).
  topeCents: number;
  sugeridoCents: number;
  montoCents: number;
  definido: boolean;
};

export type ProyectoVista = {
  proyecto: Proyecto;
  items: ProyectoItem[];
  plan: PlanProyecto;
  cobertura: CoberturaProyecto;
  aportes: AporteVista[];
  mio: MiAporteVista;
};

export type ProyectosVista = {
  mesHoy: string;
  proyectos: ProyectoVista[];
};

const paraPlan = (proyecto: Proyecto, items: ProyectoItem[]): ProyectoParaPlan => ({
  fechaObjetivo: proyecto.targetDate,
  objetivoCents: proyecto.objetivoCents,
  ahorradoCents: proyecto.ahorradoCents,
  // Lo ya pagado salió de lo apartado y dejó de ser algo por apartar.
  pagadoCents: items.filter((i) => i.pagado).reduce((t, i) => t + i.montoCents, 0),
  items: items
    .filter((i) => !i.pagado)
    .map((i) => ({ id: i.id, concepto: i.concepto, montoCents: i.montoCents, fecha: i.fecha })),
});

// Todo lo que hace falta para mostrar los proyectos del hogar a `yo`.
export async function armarProyectosVista(householdId: string, yo: string): Promise<ProyectosVista> {
  const mesHoy = mesActual();

  const [categorias, presupuestos, miembros, proyectos, items, aportes] = await Promise.all([
    listCategories(householdId),
    listBudgets(householdId),
    listMembers(householdId),
    listProyectos(householdId),
    listProyectoItems(householdId),
    listProyectoAportes(householdId),
  ]);

  // Montos planeados del mes (no hace falta lo gastado).
  const vistaMes = armarVistaMes(categorias, presupuestos, [], mesHoy);
  const disponibles = new Map(miembros.map((m) => [m.id, disponibleDeLaPersona(vistaMes, m.id)]));

  const idsActivos = new Set(proyectos.map((p) => p.id));
  const guardados = new Map(
    aportes.filter((a) => idsActivos.has(a.projectId)).map((a) => [`${a.projectId}:${a.memberId}`, a.montoCents])
  );

  // Lo que cada persona ya aparta para OTROS proyectos.
  const enOtros = (memberId: string, projectId: string) =>
    [...guardados.entries()]
      .filter(([clave]) => {
        const [pid, mid] = clave.split(":");
        return mid === memberId && pid !== projectId;
      })
      .reduce((t, [, cents]) => t + cents, 0);

  const libreDe = (memberId: string, projectId: string) =>
    (disponibles.get(memberId)?.disponibleCents ?? 0) - enOtros(memberId, projectId);

  return {
    mesHoy,
    proyectos: proyectos.map((proyecto) => {
      const suyos = items.filter((i) => i.projectId === proyecto.id);
      const datos = paraPlan(proyecto, suyos);
      const plan = planDelProyecto(datos, mesHoy);

      const sugeridos = aportesSugeridos(
        plan.cuotaMensualCents,
        miembros.map((m) => ({ memberId: m.id, libreCents: libreDe(m.id, proyecto.id) }))
      );

      const lista: AporteVista[] = miembros.map((m) => {
        const guardado = guardados.get(`${proyecto.id}:${m.id}`);
        return {
          memberId: m.id,
          nombre: m.displayName,
          montoCents: guardado ?? sugeridos[m.id] ?? 0,
          definido: guardado !== undefined,
          esMio: m.id === yo,
        };
      });

      const mioDisp = disponibles.get(yo) ?? disponibleDeLaPersona([], yo);
      const miAporte = lista.find((a) => a.esMio);

      return {
        proyecto,
        items: suyos,
        plan,
        cobertura: coberturaConAportes(
          datos,
          lista.reduce((t, a) => t + a.montoCents, 0),
          mesHoy
        ),
        aportes: lista,
        mio: {
          salarioCents: mioDisp.salarioCents,
          fijosCents: mioDisp.fijosCents,
          extrasCents: mioDisp.extrasCents,
          otrosProyectosCents: enOtros(yo, proyecto.id),
          topeCents: Math.max(0, libreDe(yo, proyecto.id)),
          sugeridoCents: sugeridos[yo] ?? 0,
          montoCents: miAporte?.montoCents ?? 0,
          definido: miAporte?.definido ?? false,
        },
      };
    }),
  };
}

// Lo más que `memberId` puede apartar para el proyecto: lo que le queda libre
// después de sus gastos fijos, sus extras y lo que aparta a otros proyectos.
export async function topeDeAporte(
  householdId: string,
  memberId: string,
  projectId: string
): Promise<number> {
  const vista = await armarProyectosVista(householdId, memberId);
  const proyecto = vista.proyectos.find((p) => p.proyecto.id === projectId);

  return proyecto ? proyecto.mio.topeCents : 0;
}
