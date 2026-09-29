"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
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
};

export default function FilaPresupuesto({
  item,
  month,
  onGuardado,
  mostrarProgreso = true,
}: Props) {
  const [valor, setValor] = useState(String(item.plannedAmountCents / 100));
  const [guardando, setGuardando] = useState(false);
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

  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{item.category.name}</span>
          {item.category.fixed ? (
            <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-xs text-gold">
              <Lock size={11} /> Fijo
            </span>
          ) : null}
          {item.inherited ? (
            <span className="text-xs text-text-muted">(heredado del mes anterior)</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {mostrarProgreso ? (
            <>
              <span className="w-20 text-right text-sm text-text-muted">
                {formatearCentavos(actual)}
              </span>
              <span className="text-text-muted">/</span>
            </>
          ) : null}
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
