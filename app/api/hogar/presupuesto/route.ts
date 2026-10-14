import { after, NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  listBudgets,
  listCategories,
  listCuentas,
  listMembers,
  listTransactions,
  upsertBudget,
} from "@/lib/household/datos";
import { mesActual } from "@/lib/household/formato";
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
      dueDate
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
