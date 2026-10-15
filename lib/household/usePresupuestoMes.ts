import { useEffect, useMemo, useState } from "react";
import type { CategoriaDelMes } from "./presupuesto";
import { fechaDelDia, segundaFecha } from "./presupuesto";
import { useT } from "@/lib/i18n/client";

export type MiembroHogar = { id: string; displayName: string; color?: number };
export type CuentaHogar = { id: string; name: string };

export type TotalesMes = {
  plannedIncomeCents: number;
  actualIncomeCents: number;
  plannedExpenseCents: number;
  actualExpenseCents: number;
};

// Los totales salen siempre de los ítems (igual que en el servidor), así
// no se desfasan cuando un ítem se guarda, se agrega o se elimina.
function sumarTotales(items: CategoriaDelMes[]): TotalesMes {
  return items.reduce<TotalesMes>(
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
    { plannedIncomeCents: 0, actualIncomeCents: 0, plannedExpenseCents: 0, actualExpenseCents: 0 }
  );
}

// Hook compartido por /presupuesto y /configuracion: ambas leen la misma
// vista del mes (planeado + gastado por categoría), solo cambia qué
// categorías muestran (fijas vs variables) y si dejan elegir el mes.
export function usePresupuestoMes(month: string, refreshKey = 0) {
  const t = useT();
  const [items, setItems] = useState<CategoriaDelMes[]>([]);
  const [cargado, setCargado] = useState(false);
  const [members, setMembers] = useState<MiembroHogar[]>([]);
  const [cuentas, setCuentas] = useState<CuentaHogar[]>([]);
  // Member id de quien está logueado.
  const [yo, setYo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Si el mes cambia (o el componente se desmonta) antes de que llegue la
    // respuesta, esa respuesta vieja se descarta y no pisa la del mes nuevo.
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const res = await fetch(
          `/api/hogar/presupuesto?month=${encodeURIComponent(month)}`,
          { cache: "no-store", signal: controlador.signal }
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(t.msg(data.message, "budget.loadError"));
        }

        setItems(data.data.items);
        setCargado(true);
        setMembers(data.data.members ?? []);
        setCuentas(data.data.cuentas ?? []);
        setYo(data.data.yo ?? "");
        setCargando(false);
      } catch (err) {
        if (controlador.signal.aborted) return;
        setError(err instanceof Error ? err.message : t("budget.loadingError"));
        setCargando(false);
      }
    }

    void cargar();

    return () => controlador.abort();
  }, [month, refreshKey, t]);

  const totales = useMemo(() => (cargado ? sumarTotales(items) : null), [cargado, items]);

  // fechaPago undefined = no cambió la fecha.
  function handleGuardado(
    categoryId: string,
    plannedAmountCents: number,
    fechaPago?: string,
    extras?: { nota?: string; pagado?: boolean }
  ) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.category.id === categoryId
          ? {
              ...item,
              plannedAmountCents,
              inherited: false,
              fechaPago: fechaPago ?? item.fechaPago,
              nota: extras?.nota ?? item.nota,
              pagado: extras?.pagado ?? item.pagado,
            }
          : item
      )
    );
  }

  function agregarItem(item: CategoriaDelMes) {
    setItems((actuales) => [...actuales, item]);
  }

  function eliminarItem(categoryId: string) {
    setItems((actuales) => actuales.filter((i) => i.category.id !== categoryId));
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

  // Frecuencia y días de pago de una fija (quincenal = dos pagos al mes).
  function cambiarPagos(
    categoryId: string,
    cambios: { quincenal: boolean; dueDay?: number | null; dueDay2: number | null }
  ) {
    setItems((actuales) =>
      actuales.map((item) => {
        if (item.category.id !== categoryId) return item;
        const category = {
          ...item.category,
          quincenal: cambios.quincenal,
          dueDay: cambios.dueDay !== undefined ? cambios.dueDay : item.category.dueDay,
          dueDay2: cambios.dueDay2,
        };
        return {
          ...item,
          category,
          fechaPago: fechaDelDia(month, category.dueDay),
          fechaPago2: segundaFecha(category, month),
        };
      })
    );
  }

  function marcarAhorro(categoryId: string, ahorro: boolean) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.category.id === categoryId
          ? { ...item, category: { ...item.category, ahorro } }
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
    marcarAhorro,
    cambiarPagos,
  };
}
