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
};

export function fechaDelDia(month: string, dueDay: number | null): string {
  if (!dueDay) return "";
  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const dia = Math.min(dueDay, ultimoDia);
  return `${month}-${String(dia).padStart(2, "0")}`;
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

  return categories.map((category) => {
    const actualCents = actualPorCategoria.get(category.id) ?? 0;

    const budgetsDeCategoria = budgets
      .filter((b) => b.categoryId === category.id)
      .sort((a, b) => a.month.localeCompare(b.month));

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
      };
    }

    if (category.fixed) {
      const anterior = [...budgetsDeCategoria]
        .filter((b) => b.month < month)
        .pop();

      if (anterior) {
        return {
          category,
          plannedAmountCents: anterior.plannedAmountCents,
          inherited: true,
          actualCents,
          fechaPago: fechaDelDia(month, category.dueDay),
        };
      }
    }

    return {
      category,
      plannedAmountCents: 0,
      inherited: false,
      actualCents,
      fechaPago: category.fixed ? fechaDelDia(month, category.dueDay) : "",
    };
  });
}
