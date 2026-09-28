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
};

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
        };
      }
    }

    return {
      category,
      plannedAmountCents: 0,
      inherited: false,
      actualCents,
    };
  });
}
