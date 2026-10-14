"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryKind } from "@/lib/household/schema";
import { fechaDelDia, type CategoriaDelMes } from "@/lib/household/presupuesto";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";
import type { CuentaHogar, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import { nombreMiembro } from "@/components/presupuesto/EtiquetaDueno";

type Props = {
  kind: CategoryKind;
  month: string;
  onAgregado: (item: CategoriaDelMes) => void;
  // false (default) = variable item for this month, with an exact date.
  // true = fixed category (Settings), with a day of the month that carries over.
  fixed?: boolean;
  // "fila" = full-width list button; "boton" = compact pill, to
  // place standalone (e.g. the quick actions in Budget).
  variant?: "fila" | "boton";
  // If passed (Settings), shows an expense owner selector.
  members?: MiembroHogar[];
  // Variable expense: selector for which account it goes to (informational only).
  cuentas?: CuentaHogar[];
};

export default function AgregarCategoria({
  kind,
  month,
  onAgregado,
  fixed = false,
  variant = "fila",
  members,
  cuentas,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [dia, setDia] = useState("");
  const [dueno, setDueno] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();

  function cerrar() {
    setAbierto(false);
    setNombre("");
    setMonto("");
    setFecha("");
    setDia("");
    setDueno("");
    setCuentaId("");
    setError("");
  }

  async function agregar() {
    if (!nombre.trim()) {
      setError("Give it a name.");
      return;
    }

    const plannedAmountCents = Math.round(Number(monto || 0) * 100);

    // A variable item with no amount does not appear in the list (only those
    // with something that month are listed), so creating it empty makes no sense.
    if (!fixed && plannedAmountCents <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    const dueDay = fixed && dia ? Number(dia) : null;

    if (fixed && dia && !(Number.isInteger(dueDay) && dueDay! >= 1 && dueDay! <= 31)) {
      setError("The day must be between 1 and 31.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const resCategoria = await fetch("/api/hogar/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nombre.trim(),
          kind,
          fixed,
          dueDay,
          ownerMemberId: dueno,
        }),
      });

      const dataCategoria = await resCategoria.json();

      if (!resCategoria.ok || !dataCategoria.success) {
        throw new Error(dataCategoria.message || "Could not create the category.");
      }

      let category = dataCategoria.data;

      if (cuentaId) {
        const resCuenta = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: category.id, cuentaId }),
        });
        const dataCuenta = await resCuenta.json();
        if (!resCuenta.ok || !dataCuenta.success) {
          throw new Error(dataCuenta.message || "Could not save the account.");
        }
        category = { ...category, cuentaId };
      }

      if (plannedAmountCents > 0) {
        const resMonto = await fetch("/api/hogar/presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: category.id,
            month,
            amount: monto,
            ...(fixed ? {} : { dueDate: fecha }),
          }),
        });

        const dataMonto = await resMonto.json();

        if (!resMonto.ok || !dataMonto.success) {
          throw new Error(dataMonto.message || "Could not save the amount.");
        }
      }

      onAgregado({
        category,
        plannedAmountCents,
        inherited: false,
        actualCents: 0,
        fechaPago: fixed ? fechaDelDia(month, dueDay) : fecha,
      });

      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding.");
    } finally {
      setGuardando(false);
    }
  }

  const etiqueta = fixed
    ? kind === "income"
      ? "Add fixed income"
      : "Add fixed expense"
    : kind === "income"
    ? "Variable income"
    : "Variable expense";

  if (!abierto) {
    return variant === "boton" ? (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-line px-2 py-2 text-sm font-medium transition hover:border-gold/50 ${
          kind === "income" ? "text-sage" : "text-rust"
        }`}
      >
        <Plus size={14} />
        {etiqueta}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-left text-sm text-text-muted transition last:border-0 hover:text-gold"
      >
        <Plus size={14} />
        {etiqueta}
      </button>
    );
  }

  return (
    <div
      className={
        variant === "boton"
          ? "w-full rounded-xl border border-line bg-surface-raised/40 p-3"
          : "border-b border-line px-4 py-3 last:border-0"
      }
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
        {etiqueta}
      </p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={fixed ? "Name (e.g. Gym)" : "Name (e.g. Birthday gift)"}
          className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
          autoFocus
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Amount"
            className={`${fieldBaseClass} ${fieldNormalClass} flex-1 py-1.5 text-right`}
          />
          {fixed ? (
            <input
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="Day"
              aria-label="Day of the month it is paid"
              className={`${fieldBaseClass} ${fieldNormalClass} w-20 py-1.5 text-right`}
            />
          ) : (
            <input
              type="date"
              value={fecha}
              min={`${month}-01`}
              max={`${month}-${String(ultimoDia).padStart(2, "0")}`}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Payment date"
              className={`${fieldBaseClass} ${fieldNormalClass} flex-1 py-1.5`}
            />
          )}
        </div>
        {!fixed && kind === "expense" && cuentas && cuentas.length > 0 ? (
          <select
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            aria-label="Which account it goes to"
            className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
          >
            <option value="">Which account does it go to? (optional)</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        {members && members.length > 0 ? (
          <select
            value={dueno}
            onChange={(e) => setDueno(e.target.value)}
            aria-label="Whose it is"
            className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
          >
            <option value="">Joint</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {nombreMiembro(members, m.id)}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={cerrar}
            className="text-xs text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={agregar}
            disabled={guardando}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "..." : "Add"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
