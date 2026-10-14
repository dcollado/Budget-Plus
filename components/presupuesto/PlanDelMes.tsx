"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass, sectionCardClass } from "@/lib/ui";

type Totales = {
  plannedIncomeCents: number;
  actualIncomeCents: number;
  plannedExpenseCents: number;
  actualExpenseCents: number;
};

type Props = {
  month: string;
  refreshKey: number;
};

function FilaCategoria({
  item,
  month,
  onGuardado,
}: {
  item: CategoriaDelMes;
  month: string;
  onGuardado: (categoryId: string, plannedAmountCents: number) => void;
}) {
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
          <span className="w-20 text-right text-sm text-text-muted">
            {formatearCentavos(actual)}
          </span>
          <span className="text-text-muted">/</span>
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

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${
            sobregirado ? "bg-rust" : "bg-sage"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}

export default function PlanDelMes({ month, refreshKey }: Props) {
  const [items, setItems] = useState<CategoriaDelMes[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
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

  const gastos = items.filter((i) => i.category.kind === "expense");
  const ingresos = items.filter((i) => i.category.kind === "income");
  const restante = totales ? totales.plannedExpenseCents - totales.actualExpenseCents : 0;

  return (
    <div className="mb-6">
      {error ? (
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      {totales ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={sectionCardClass}>
            <p className="text-xs uppercase tracking-wide text-text-muted">Planeado</p>
            <p className="mt-1 text-lg font-semibold text-text">
              {formatearCentavos(totales.plannedExpenseCents)}
            </p>
          </div>
          <div className={sectionCardClass}>
            <p className="text-xs uppercase tracking-wide text-text-muted">Gastado</p>
            <p className="mt-1 text-lg font-semibold text-rust">
              {formatearCentavos(totales.actualExpenseCents)}
            </p>
          </div>
          <div className={sectionCardClass}>
            <p className="text-xs uppercase tracking-wide text-text-muted">Por gastar</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                restante < 0 ? "text-rust" : "text-sage"
              }`}
            >
              {formatearCentavos(restante)}
            </p>
          </div>
          <div className={sectionCardClass}>
            <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
            <p className="mt-1 text-lg font-semibold text-sage">
              {formatearCentavos(totales.actualIncomeCents)}
            </p>
          </div>
        </div>
      ) : null}

      <div className={`${sectionCardClass} p-0`}>
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
          Categorías de gasto
        </h2>

        {cargando ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando...</p>
        ) : gastos.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">
            No hay categorías de gasto todavía.
          </p>
        ) : (
          gastos.map((item) => (
            <FilaCategoria
              key={item.category.id}
              item={item}
              month={month}
              onGuardado={handleGuardado}
            />
          ))
        )}
      </div>

      {ingresos.length > 0 ? (
        <div className={`${sectionCardClass} mt-4 p-0`}>
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
            Categorías de ingreso
          </h2>

          {ingresos.map((item) => (
            <FilaCategoria
              key={item.category.id}
              item={item}
              month={month}
              onGuardado={handleGuardado}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
