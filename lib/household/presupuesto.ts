import type { Budget, Category, Transaction } from "./schema";

export type CategoriaDelMes = {
  category: Category;
  plannedAmountCents: number;
  // true si el monto no vino de un Budget explícito de este mes, sino
  // heredado del mes anterior más reciente que sí tenía uno (solo pasa
  // con categorías fixed). Al guardar un monto para el mes actual deja
  // de estar inherited.
  inherited: boolean;
  actualCents: number;
  // Fecha de pago efectiva en este mes (YYYY-MM-DD), "" si no tiene.
  // Fijas: Category.dueDay aplicado al mes (acotado al último día).
  // Variables: la fecha guardada en el Budget de este mes.
  fechaPago: string;
  // Segundo pago del mes (gastos quincenales), "" si se paga una vez.
  fechaPago2: string;
  // Nota y marca de "pagado" de este mes (viene del Budget del mes).
  nota: string;
  pagado: boolean;
};

export function fechaDelDia(month: string, dueDay: number | null): string {
  if (!dueDay) return "";
  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const dia = Math.min(dueDay, ultimoDia);
  return `${month}-${String(dia).padStart(2, "0")}`;
}

// Segundo pago de un gasto fijo quincenal en este mes ("" si no aplica).
export function segundaFecha(category: Category, month: string): string {
  return category.fixed && category.quincenal ? fechaDelDia(month, category.dueDay2) : "";
}

// Orden por fecha de pago; los que no tienen fecha van al final.
export function ordenarPorFecha(items: CategoriaDelMes[]): CategoriaDelMes[] {
  return [...items].sort((a, b) => {
    if (!a.fechaPago && !b.fechaPago) return a.category.name.localeCompare(b.category.name);
    if (!a.fechaPago) return 1;
    if (!b.fechaPago) return -1;
    return a.fechaPago.localeCompare(b.fechaPago);
  });
}

// Arma la vista de un mes: para cada categoría activa, cuánto se planeó
// (o se heredó, si es fixed y no hay Budget explícito para este mes) y
// cuánto se gastó/ingresó de verdad según las transacciones.
export function armarVistaMes(
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
  month: string
): CategoriaDelMes[] {
  const actualPorCategoria = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === "transfer" || !t.date.startsWith(month) || !t.categoryId) {
      continue;
    }

    actualPorCategoria.set(
      t.categoryId,
      (actualPorCategoria.get(t.categoryId) ?? 0) + t.amountCents
    );
  }

  // Presupuestos agrupados por categoría y ordenados por mes, una sola vez
  // (antes se filtraba la lista completa por cada categoría).
  const presupuestosPorCategoria = new Map<string, Budget[]>();

  for (const b of budgets) {
    const lista = presupuestosPorCategoria.get(b.categoryId);
    if (lista) lista.push(b);
    else presupuestosPorCategoria.set(b.categoryId, [b]);
  }

  for (const lista of presupuestosPorCategoria.values()) {
    lista.sort((a, b) => a.month.localeCompare(b.month));
  }

  return categories.map((category) => {
    const actualCents = actualPorCategoria.get(category.id) ?? 0;
    const budgetsDeCategoria = presupuestosPorCategoria.get(category.id) ?? [];

    const budgetDeEsteMes = budgetsDeCategoria.find((b) => b.month === month);

    if (budgetDeEsteMes) {
      return {
        category,
        plannedAmountCents: budgetDeEsteMes.plannedAmountCents,
        inherited: false,
        actualCents,
        fechaPago: category.fixed
          ? fechaDelDia(month, category.dueDay)
          : budgetDeEsteMes.dueDate,
        fechaPago2: segundaFecha(category, month),
        nota: budgetDeEsteMes.nota,
        pagado: budgetDeEsteMes.pagado,
      };
    }

    if (category.fixed) {
      const anterior = budgetsDeCategoria.filter((b) => b.month < month).pop();

      if (anterior) {
        return {
          category,
          plannedAmountCents: anterior.plannedAmountCents,
          inherited: true,
          actualCents,
          fechaPago: fechaDelDia(month, category.dueDay),
          fechaPago2: segundaFecha(category, month),
          nota: "",
          pagado: false,
        };
      }
    }

    return {
      category,
      plannedAmountCents: 0,
      inherited: false,
      actualCents,
      fechaPago: category.fixed ? fechaDelDia(month, category.dueDay) : "",
      fechaPago2: segundaFecha(category, month),
      nota: "",
      pagado: false,
    };
  });
}
