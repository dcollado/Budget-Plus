"use client";

import { useEffect, useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";

type Props = {
  item: CategoriaDelMes;
  month: string;
  onGuardado: (categoryId: string, plannedAmountCents: number) => void;
  // Oculta la barra de progreso y el "gastado" — útil en Configuración,
  // donde lo que importa es fijar el monto, no ver avance del mes.
  mostrarProgreso?: boolean;
  // Sin input ni botón Guardar — el monto se muestra como texto. Para
  // ver el detalle de los fijos en Presupuesto sin poder tocarlos ahí
  // (eso es solo en Configuración).
  readOnly?: boolean;
  // Si se pasa, muestra un botón para borrar (archivar) la categoría.
  // Solo tiene sentido en Configuración — en Presupuesto no se ofrece.
  onEliminar?: (categoryId: string) => void;
};

export default function FilaPresupuesto({
  item,
  month,
  onGuardado,
  mostrarProgreso = true,
  readOnly = false,
  onEliminar,
}: Props) {
  const [valor, setValor] = useState(String(item.plannedAmountCents / 100));
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValor(String(item.plannedAmountCents / 100));
  }, [item.plannedAmountCents]);

  const dirty = Number(valor || 0) * 100 !== item.plannedAmountCents;
  const planned = item.plannedAmountCents;
  const actual = item.actualCents;
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : actual > 0 ? 100 : 0;
  const sobregirado = planned > 0 && actual > planned;

  async function guardar() {
    setGuardando(true);
    setError("");

    try {
      const res = await fetch("/api/hogar/presupuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: item.category.id,
          month,
          amount: valor || "0",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar.");
      }

      onGuardado(item.category.id, Math.round(Number(valor || 0) * 100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const confirmado = window.confirm(
      `¿Eliminar "${item.category.name}"? No se puede deshacer desde acá (el historial de meses anteriores se conserva, pero la categoría deja de estar disponible).`
    );

    if (!confirmado) return;

    setEliminando(true);
    setError("");

    try {
      const res = await fetch(
        `/api/hogar/categorias?id=${encodeURIComponent(item.category.id)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo eliminar.");
      }

      onEliminar?.(item.category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando.");
      setEliminando(false);
    }
  }

  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-medium text-text">
            {item.category.name}
          </span>
          {item.category.fixed ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold"
              title="Fijo"
              aria-label="Fijo"
            >
              <Lock size={11} />
            </span>
          ) : null}
          {item.inherited ? (
            <span className="text-xs text-text-muted">(heredado del mes anterior)</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {mostrarProgreso ? (
            <span className="whitespace-nowrap text-sm text-text-muted">
              {formatearCentavos(actual)} /
            </span>
          ) : null}
          {readOnly ? (
            <span className="w-24 text-right text-sm font-medium text-text">
              {formatearCentavos(planned)}
            </span>
          ) : (
            <>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass} w-24 py-1.5 text-right`}
              />
              <button
                type="button"
                onClick={guardar}
                disabled={!dirty || guardando}
                className="rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? "..." : "Guardar"}
              </button>
            </>
          )}
          {onEliminar ? (
            <button
              type="button"
              onClick={eliminar}
              disabled={eliminando}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-rust/10 hover:text-rust disabled:opacity-50"
              aria-label={`Eliminar ${item.category.name}`}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {mostrarProgreso ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className={`h-full rounded-full transition-all ${
              sobregirado ? "bg-rust" : "bg-sage"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
