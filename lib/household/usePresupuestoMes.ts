import { useEffect, useState } from "react";
import type { CategoriaDelMes } from "./presupuesto";

export type MiembroHogar = { id: string; displayName: string };
export type CuentaHogar = { id: string; name: string };

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
  const [members, setMembers] = useState<MiembroHogar[]>([]);
  const [cuentas, setCuentas] = useState<CuentaHogar[]>([]);
  // Member id de quien está logueado.
  const [yo, setYo] = useState("");
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
      setMembers(data.data.members ?? []);
      setCuentas(data.data.cuentas ?? []);
      setYo(data.data.yo ?? "");
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

  // fechaPago undefined = no cambió la fecha.
  function handleGuardado(
    categoryId: string,
    plannedAmountCents: number,
    fechaPago?: string
  ) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.category.id === categoryId
          ? {
              ...item,
              plannedAmountCents,
              inherited: false,
              fechaPago: fechaPago ?? item.fechaPago,
            }
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

  function eliminarItem(categoryId: string) {
    const item = items.find((i) => i.category.id === categoryId);
    if (!item) return;

    setItems((actuales) => actuales.filter((i) => i.category.id !== categoryId));

    setTotales((actuales) => {
      if (!actuales) return actuales;

      return item.category.kind === "income"
        ? {
            ...actuales,
            plannedIncomeCents: actuales.plannedIncomeCents - item.plannedAmountCents,
            actualIncomeCents: actuales.actualIncomeCents - item.actualCents,
          }
        : {
            ...actuales,
            plannedExpenseCents: actuales.plannedExpenseCents - item.plannedAmountCents,
            actualExpenseCents: actuales.actualExpenseCents - item.actualCents,
          };
    });
  }

  function asignarCuenta(categoryId: string, cuentaId: string) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.category.id === categoryId
          ? { ...item, category: { ...item.category, cuentaId } }
          : item
      )
    );
  }

  return {
    items,
    totales,
    members,
    cuentas,
    setCuentas,
    yo,
    cargando,
    error,
    handleGuardado,
    agregarItem,
    eliminarItem,
    asignarCuenta,
  };
}
