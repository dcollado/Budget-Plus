import { after, NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  listBudgets,
  listCategories,
  listCuentas,
  listMembers,
  listProyectoAportesMes,
  listProyectos,
  listTransactions,
  upsertBudget,
} from "@/lib/household/datos";
import { mesActual } from "@/lib/household/formato";
import { moduloActivo } from "@/lib/modulos-datos";
import { armarProyectosVista } from "@/lib/household/proyectos-datos";
import { armarVistaMes } from "@/lib/household/presupuesto";
import { sincronizarDosMeses, sincronizarSinFallar } from "@/lib/household/calendario";
import { validarReferencias } from "@/lib/household/pertenencia";
import { centavosDe, fechaValida, mesValido } from "@/lib/validacion";

export async function GET(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const monthParam = req.nextUrl.searchParams.get("month")?.trim();
    const month = mesValido(monthParam) ? monthParam : mesActual();

    const [categories, budgets, transactions, members, cuentas] = await Promise.all([
      listCategories(contexto.householdId),
      listBudgets(contexto.householdId),
      listTransactions(contexto.householdId, [month]),
      listMembers(contexto.householdId),
      listCuentas(contexto.householdId),
    ]);

    const items = armarVistaMes(categories, budgets, transactions, month);

    // Lo que cada persona aparta ese mes para los proyectos (solo lo confirmado).
    // Nunca debe romper el presupuesto: si falla, el mes se ve sin esas líneas.
    let aportesProyecto: {
      projectId: string;
      projectName: string;
      memberId: string;
      montoCents: number;
      hecho: boolean;
      // true = todavía es solo la sugerencia (no se ha confirmado ni cuenta en los totales).
      sugerido?: boolean;
    }[] = [];

    try {
      // Con el módulo de Proyectos apagado, el presupuesto no muestra sus líneas.
      const [aportes, proyectos] = (await moduloActivo("proyectos", contexto.householdId))
        ? await Promise.all([
            listProyectoAportesMes(contexto.householdId),
            listProyectos(contexto.householdId),
          ])
        : [[], []];
      const nombres = new Map(proyectos.map((p) => [p.id, p.name]));

      aportesProyecto = aportes
        .filter((a) => a.month === month && a.montoCents > 0 && nombres.has(a.projectId))
        .map((a) => ({
          projectId: a.projectId,
          projectName: nombres.get(a.projectId) ?? "",
          memberId: a.memberId,
          montoCents: a.montoCents,
          hecho: a.hecho,
        }));

      // El aporte sugerido de ese mes de cada persona que todavía no lo confirmó: así
      // la meta del proyecto se ve en el presupuesto aunque aún no se haya fijado.
      if (proyectos.length > 0) {
        const vista = await armarProyectosVista(contexto.householdId, contexto.member.id);
        for (const p of vista.proyectos) {
          const mes = p.mio.meses.find((m) => m.month === month);
          if (!mes) continue;

          const sugeridos = [
            { memberId: contexto.member.id, definido: mes.definido, aporteCents: mes.aporteCents },
            ...mes.otros,
          ];

          for (const o of sugeridos) {
            if (o.definido || o.aporteCents <= 0) continue;
            aportesProyecto.push({
              projectId: p.proyecto.id,
              projectName: p.proyecto.name,
              memberId: o.memberId,
              montoCents: o.aporteCents,
              hecho: false,
              sugerido: true,
            });
          }
        }
      }
    } catch (error) {
      console.error("Could not read the project contributions:", error);
    }

    const totales = items.reduce(
      (acc, item) => {
        if (item.category.kind === "income") {
          acc.plannedIncomeCents += item.plannedAmountCents;
          acc.actualIncomeCents += item.actualCents;
        } else {
          acc.plannedExpenseCents += item.plannedAmountCents;
          acc.actualExpenseCents += item.actualCents;
        }
        return acc;
      },
      {
        plannedIncomeCents: 0,
        actualIncomeCents: 0,
        plannedExpenseCents: 0,
        actualExpenseCents: 0,
      }
    );

    return exito({
      month,
      items,
      totales,
      aportesProyecto,
      members: members.map((m) => ({ id: m.id, displayName: m.displayName, color: m.color })),
      cuentas: cuentas.map((c) => ({ id: c.id, name: c.name })),
      // Quién está mirando: el desglose de transferencias es solo suyo.
      yo: contexto.member.id,
    });
  } catch (error) {
    console.error("Error getting budget:", error);
    return fallo("Could not get the budget.", 500);
  }
}

// Largo máximo de la nota de un ítem del mes.
const MAX_NOTA = 200;

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;

    const categoryId = String(body.categoryId ?? "").trim();
    const month = String(body.month ?? "").trim();
    const plannedCents = centavosDe(body.amount);
    // undefined = no tocar la fecha existente; "" = sin fecha.
    const dueDate =
      body.dueDate === undefined ? undefined : String(body.dueDate ?? "").trim();

    // undefined = no tocar lo que ya tenga.
    const nota = body.nota === undefined ? undefined : String(body.nota ?? "").trim();
    const pagado = body.pagado === undefined ? undefined : body.pagado === true;

    if (nota !== undefined && nota.length > MAX_NOTA) {
      return fallo("The note is too long.", 400);
    }

    if (!categoryId) {
      return fallo("Category is missing.", 400);
    }

    if (!mesValido(month)) {
      return fallo("Invalid month.", 400);
    }

    if (plannedCents === null) {
      return fallo("The planned amount is not valid (it cannot be negative).", 400);
    }

    if (dueDate && !(fechaValida(dueDate) && dueDate.startsWith(month))) {
      return fallo("The date must be in the same month.", 400);
    }

    const errorRef = await validarReferencias(contexto.householdId, { categoryId });

    if (errorRef) {
      return fallo(errorRef, 400);
    }

    const budget = await upsertBudget(
      contexto.householdId,
      categoryId,
      month,
      plannedCents,
      dueDate,
      { nota, pagado }
    );

    // Una fija se hereda al mes siguiente, así que se sincronizan los dos.
    const householdId = contexto.householdId;
    after(() => sincronizarSinFallar(() => sincronizarDosMeses(householdId, month)));

    return exito(budget);
  } catch (error) {
    console.error("Error saving budget:", error);
    return fallo("Could not save the budget.", 500);
  }
}
