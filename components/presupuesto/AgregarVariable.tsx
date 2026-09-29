"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryKind } from "@/lib/household/schema";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";

type Props = {
  kind: CategoryKind;
  month: string;
  onAgregado: (item: CategoriaDelMes) => void;
};

// Crea una categoría variable nueva (no está en la lista cerrada de
// fijas/variables predefinidas) y de una le pone el monto de este mes.
// Ej: algo puntual que no encaja en Misceláneos ni en ninguna otra.
export default function AgregarVariable({ kind, month, onAgregado }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function agregar() {
    if (!nombre.trim()) {
      setError("Ponele un nombre.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const resCategoria = await fetch("/api/hogar/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim(), kind }),
      });

      const dataCategoria = await resCategoria.json();

      if (!resCategoria.ok || !dataCategoria.success) {
        throw new Error(dataCategoria.message || "No se pudo crear la categoría.");
      }

      const category = dataCategoria.data;
      const plannedAmountCents = Math.round(Number(monto || 0) * 100);

      if (plannedAmountCents > 0) {
        const resMonto = await fetch("/api/hogar/presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: category.id, month, amount: monto }),
        });

        const dataMonto = await resMonto.json();

        if (!resMonto.ok || !dataMonto.success) {
          throw new Error(dataMonto.message || "No se pudo guardar el monto.");
        }
      }

      onAgregado({
        category,
        plannedAmountCents,
        inherited: false,
        actualCents: 0,
      });

      setNombre("");
      setMonto("");
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error agregando.");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-left text-sm text-text-muted transition last:border-0 hover:text-gold"
      >
        <Plus size={14} />
        {kind === "income" ? "Agregar ingreso variable" : "Agregar gasto variable"}
      </button>
    );
  }

  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej. Regalo cumpleaños)"
          className={`${fieldBaseClass} ${fieldNormalClass} flex-1 py-1.5`}
          autoFocus
        />
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
          className={`${fieldBaseClass} ${fieldNormalClass} w-24 py-1.5 text-right`}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={guardando}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? "..." : "Agregar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError("");
          }}
          className="text-xs text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
