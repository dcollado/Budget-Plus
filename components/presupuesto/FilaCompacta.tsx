"use client";

import { useState } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos, formatearFechaCorta } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";

type Props = {
  item: CategoriaDelMes;
  month: string;
  // Sin onGuardado = solo lectura (los fijos, que se editan en Configuración).
  onGuardado?: (categoryId: string, plannedAmountCents: number, fechaPago?: string) => void;
  onEliminar?: (categoryId: string) => void;
};

// Una sola línea: fecha · nombre · monto. Pensada para listas largas en
// mobile — el nombre se trunca en vez de empujar el monto a otra línea.
export default function FilaCompacta({ item, month, onGuardado, onEliminar }: Props) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(item.plannedAmountCents / 100));
  const [fecha, setFecha] = useState(item.fechaPago);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const esIngreso = item.category.kind === "income";
  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();

  function abrir() {
    setMonto(String(item.plannedAmountCents / 100));
    setFecha(item.fechaPago);
    setError("");
    setEditando(true);
  }

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
          amount: monto || "0",
          dueDate: fecha,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar.");
      }

      onGuardado?.(item.category.id, Math.round(Number(monto || 0) * 100), fecha);
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const confirmado = window.confirm(`¿Eliminar "${item.category.name}"?`);
    if (!confirmado) return;

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
    }
  }

  return (
    <div className="border-b border-line px-4 py-2 last:border-0">
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2">
        <span className="text-xs text-text-muted">
          {item.fechaPago ? formatearFechaCorta(item.fechaPago) : "—"}
        </span>

        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm text-text">{item.category.name}</span>
          {item.category.fixed ? (
            <Lock size={11} className="shrink-0 text-gold" aria-label="Fijo" />
          ) : null}
        </span>

        <span className="flex items-center gap-1">
          <span
            className={`whitespace-nowrap text-sm font-medium ${
              esIngreso ? "text-sage" : "text-text"
            }`}
          >
            {esIngreso ? "+" : ""}
            {formatearCentavos(item.plannedAmountCents)}
          </span>
          {onGuardado ? (
            <button
              type="button"
              onClick={() => (editando ? setEditando(false) : abrir())}
              className="rounded-md p-1 text-text-muted transition hover:text-gold"
              aria-label={`Editar ${item.category.name}`}
            >
              <Pencil size={13} />
            </button>
          ) : null}
          {onEliminar ? (
            <button
              type="button"
              onClick={eliminar}
              className="rounded-md p-1 text-text-muted transition hover:text-rust"
              aria-label={`Eliminar ${item.category.name}`}
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </span>
      </div>

      {editando ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={`${fieldBaseClass} ${fieldNormalClass} w-28 flex-1 py-1.5 text-right`}
          />
          <input
            type="date"
            value={fecha}
            min={`${month}-01`}
            max={`${month}-${String(ultimoDia).padStart(2, "0")}`}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha de pago"
            className={`${fieldBaseClass} ${fieldNormalClass} w-36 flex-1 py-1.5`}
          />
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {guardando ? "..." : "Guardar"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
