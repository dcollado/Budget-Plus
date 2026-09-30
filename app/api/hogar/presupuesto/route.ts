import { after, NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import {
  listBudgets,
  listCategories,
  listMembers,
  listTransactions,
  upsertBudget,
} from "@/lib/household/sheets";
import { armarVistaMes } from "@/lib/household/presupuesto";
import { sincronizarDosMeses, sincronizarSinFallar } from "@/lib/household/calendario";

function sinHogar() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Tu usuario todavía no tiene un hogar configurado. Corré el script de seed.",
    },
    { status: 409 }
  );
}

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return sinHogar();
    }

    const monthParam = req.nextUrl.searchParams.get("month")?.trim();
    const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : mesActual();

    const [categories, budgets, transactions, members] = await Promise.all([
      listCategories(contexto.householdId),
      listBudgets(contexto.householdId),
      listTransactions(contexto.householdId),
      listMembers(contexto.householdId),
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

    return NextResponse.json({
      success: true,
      data: {
        month,
        items,
        totales,
        members: members.map((m) => ({ id: m.id, displayName: m.displayName })),
      },
    });
  } catch (error) {
    console.error("Error obteniendo presupuesto:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo obtener el presupuesto." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return sinHogar();
    }

    const body = (await req.json()) as Record<string, unknown>;

    const categoryId = String(body.categoryId ?? "").trim();
    const month = String(body.month ?? "").trim();
    const amount = Number(body.amount);
    // undefined = no tocar la fecha existente; "" = sin fecha.
    const dueDate =
      body.dueDate === undefined ? undefined : String(body.dueDate ?? "").trim();

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "Falta la categoría." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: "Mes inválido." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, message: "El monto planeado no puede ser negativo." },
        { status: 400 }
      );
    }

    if (dueDate && !(/^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate.startsWith(month))) {
      return NextResponse.json(
        { success: false, message: "La fecha tiene que ser del mismo mes." },
        { status: 400 }
      );
    }

    const budget = await upsertBudget(
      contexto.householdId,
      categoryId,
      month,
      Math.round(amount * 100),
      dueDate
    );

    // Una fija se hereda al mes siguiente, así que se sincronizan los dos.
    const householdId = contexto.householdId;
    after(() => sincronizarSinFallar(() => sincronizarDosMeses(householdId, month)));

    return NextResponse.json({ success: true, data: budget });
  } catch (error) {
    console.error("Error guardando presupuesto:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo guardar el presupuesto." },
      { status: 500 }
    );
  }
}
