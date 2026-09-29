import { useEffect, useState } from "react";
import type { CategoriaDelMes } from "./presupuesto";

export type TotalesMes = {
  plannedIncomeCents: number;
  actualIncomeCents: number;
  plannedExpenseCents: number;
  actualExpenseCents: number;
};

// Hook compartido por /presupuesto y /configuracion: ambas leen la misma
// vista del mes (planeado + gastado por categoría), solo cambia qué
// categorías muestran (fijas vs variables) y si dejan elegir el mes.
export function usePresupuestoMes(month: string, refreshKey = 0) {
  const [items, setItems] = useState<CategoriaDelMes[]>([]);
  const [totales, setTotales] = useState<TotalesMes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    try {
      const res = await fetch(
        `/api/hogar/presupuesto?month=${encodeURIComponent(month)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo cargar el presupuesto.");
      }

      setItems(data.data.items);
      setTotales(data.data.totales);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando el presupuesto.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, refreshKey]);

  function handleGuardado(categoryId: string, plannedAmountCents: number) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.category.id === categoryId
          ? { ...item, plannedAmountCents, inherited: false }
          : item
      )
    );

    setTotales((actuales) => {
      if (!actuales) return actuales;
      const item = items.find((i) => i.category.id === categoryId);
      if (!item) return actuales;

      const delta = plannedAmountCents - item.plannedAmountCents;

      return item.category.kind === "income"
        ? { ...actuales, plannedIncomeCents: actuales.plannedIncomeCents + delta }
        : { ...actuales, plannedExpenseCents: actuales.plannedExpenseCents + delta };
    });
  }

  function agregarItem(item: CategoriaDelMes) {
    setItems((actuales) => [...actuales, item]);

    setTotales((actuales) => {
      if (!actuales) return actuales;

      return item.category.kind === "income"
        ? {
            ...actuales,
            plannedIncomeCents: actuales.plannedIncomeCents + item.plannedAmountCents,
          }
        : {
            ...actuales,
            plannedExpenseCents: actuales.plannedExpenseCents + item.plannedAmountCents,
          };
    });
  }

  return { items, totales, cargando, error, handleGuardado, agregarItem };
}
