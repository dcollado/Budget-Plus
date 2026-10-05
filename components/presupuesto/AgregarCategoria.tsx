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
  // false (default) = ítem variable de este mes, con fecha exacta.
  // true = categoría fija (Configuración), con día del mes que se hereda.
  fixed?: boolean;
  // "fila" = botón a lo ancho de una lista; "boton" = pill compacto, para
  // ponerlo suelto (ej. los accesos rápidos de Presupuesto).
  variant?: "fila" | "boton";
  // Si se pasa (Configuración), muestra un selector de dueño del gasto.
  members?: MiembroHogar[];
  // Gasto variable: selector de a qué cuenta va (solo informativo).
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
      setError("Ponele un nombre.");
      return;
    }

    const plannedAmountCents = Math.round(Number(monto || 0) * 100);

    // Un variable sin monto no aparece en la lista (solo se listan los que
    // tienen algo ese mes), así que no tiene sentido crearlo vacío.
    if (!fixed && plannedAmountCents <= 0) {
      setError("Poné un monto mayor a 0.");
      return;
    }

    const dueDay = fixed && dia ? Number(dia) : null;

    if (fixed && dia && !(Number.isInteger(dueDay) && dueDay! >= 1 && dueDay! <= 31)) {
      setError("El día tiene que ser entre 1 y 31.");
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
        throw new Error(dataCategoria.message || "No se pudo crear la categoría.");
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
          throw new Error(dataCuenta.message || "No se pudo guardar la cuenta.");
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
          throw new Error(dataMonto.message || "No se pudo guardar el monto.");
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
      setError(err instanceof Error ? err.message : "Error agregando.");
    } finally {
      setGuardando(false);
    }
  }

  const etiqueta = fixed
    ? kind === "income"
      ? "Agregar ingreso fijo"
      : "Agregar gasto fijo"
    : kind === "income"
    ? "Ingreso variable"
    : "Gasto variable";

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
          placeholder={fixed ? "Nombre (ej. Gimnasio)" : "Nombre (ej. Regalo cumpleaños)"}
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
            placeholder="Monto"
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
              placeholder="Día"
              aria-label="Día del mes en que se paga"
              className={`${fieldBaseClass} ${fieldNormalClass} w-20 py-1.5 text-right`}
            />
          ) : (
            <input
              type="date"
              value={fecha}
              min={`${month}-01`}
              max={`${month}-${String(ultimoDia).padStart(2, "0")}`}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha de pago"
              className={`${fieldBaseClass} ${fieldNormalClass} flex-1 py-1.5`}
            />
          )}
        </div>
        {!fixed && kind === "expense" && cuentas && cuentas.length > 0 ? (
          <select
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            aria-label="A qué cuenta va"
            className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
          >
            <option value="">¿A qué cuenta va? (opcional)</option>
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
            aria-label="De quién es"
            className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
          >
            <option value="">Conjunto</option>
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={agregar}
            disabled={guardando}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "..." : "Agregar"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
