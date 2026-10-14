"use client";

import { useEffect, useState } from "react";
import { Check, Lock, PiggyBank, Trash2 } from "lucide-react";
import { fechaDelDia, type CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";
import type { MiembroHogar } from "@/lib/household/usePresupuestoMes";
import EtiquetaDueno from "@/components/presupuesto/EtiquetaDueno";
import { useT } from "@/lib/i18n/client";

type Props = {
  item: CategoriaDelMes;
  month: string;
  onGuardado: (categoryId: string, plannedAmountCents: number, fechaPago?: string) => void;
  // Hides the progress bar and the "spent" amount — useful in Settings,
  // where what matters is setting the amount, not seeing the month's progress.
  mostrarProgreso?: boolean;
  // No input or Save button — the amount is shown as text. To see
  // the fixed items' detail in Budget without being able to touch them there
  // (that is only in Settings).
  readOnly?: boolean;
  // If passed, shows a button to delete (archive) the category.
  // Only makes sense in Settings — it is not offered in Budget.
  onEliminar?: (categoryId: string) => void;
  // Shows a "Day" field (1-31) for a fixed item's payment day.
  editarDia?: boolean;
  members?: MiembroHogar[];
  // A single line: name · amount · day · save · delete. For the long
  // lists in Settings (the labels go in the header).
  compacta?: boolean;
  // If passed (fixed expenses only), shows the "is savings" button and notifies
  // the change so the page state updates.
  onAhorro?: (categoryId: string, ahorro: boolean) => void;
};

export default function FilaPresupuesto({
  item,
  month,
  onGuardado,
  mostrarProgreso = true,
  readOnly = false,
  onEliminar,
  editarDia = false,
  members = [],
  compacta = false,
  onAhorro,
}: Props) {
  const t = useT();
  const [valor, setValor] = useState(String(item.plannedAmountCents / 100));
  // Saved day (to know whether the field changed) and the one being edited.
  const [diaGuardado, setDiaGuardado] = useState(
    item.category.dueDay ? String(item.category.dueDay) : ""
  );
  const [dia, setDia] = useState(diaGuardado);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [guardandoAhorro, setGuardandoAhorro] = useState(false);
  const [error, setError] = useState("");

  async function alternarAhorro() {
    if (!onAhorro) return;

    const nuevo = !item.category.ahorro;
    setGuardandoAhorro(true);
    setError("");

    try {
      const res = await fetch("/api/hogar/categorias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.category.id, ahorro: nuevo }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(t.msg(data.message, "common.saveError"));
      }

      onAhorro(item.category.id, nuevo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveError"));
    } finally {
      setGuardandoAhorro(false);
    }
  }

  useEffect(() => {
    setValor(String(item.plannedAmountCents / 100));
  }, [item.plannedAmountCents]);

  const montoCambio = Math.round(Number(valor || 0) * 100) !== item.plannedAmountCents;
  const diaCambio = editarDia && dia !== diaGuardado;
  const dirty = montoCambio || diaCambio;
  const planned = item.plannedAmountCents;
  const actual = item.actualCents;
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : actual > 0 ? 100 : 0;
  const sobregirado = planned > 0 && actual > planned;

  async function guardar() {
    const diaNum = dia ? Number(dia) : null;

    if (diaCambio && dia && !(Number.isInteger(diaNum) && diaNum! >= 1 && diaNum! <= 31)) {
      setError(t("row.dayRange"));
      return;
    }

    setGuardando(true);
    setError("");

    try {
      if (montoCambio) {
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
          throw new Error(t.msg(data.message, "common.saveError"));
        }
      }

      if (diaCambio) {
        const res = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.category.id, dueDay: diaNum }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(t.msg(data.message, "row.saveDayError"));
        }

        setDiaGuardado(dia);
      }

      onGuardado(
        item.category.id,
        Math.round(Number(valor || 0) * 100),
        diaCambio ? fechaDelDia(month, diaNum) : undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.savingError"));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const confirmado = window.confirm(
      t("row.confirmDeleteFixed", { name: item.category.name })
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
        throw new Error(t.msg(data.message, "common.deleteError"));
      }

      onEliminar?.(item.category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.deletingError"));
      setEliminando(false);
    }
  }

  if (compacta) {
    return (
      <div className="border-b border-line px-3 py-1.5 last:border-0">
        <div
          className={
            onAhorro
              ? "grid grid-cols-[minmax(0,1fr)_5rem_2.5rem_1.75rem_1.75rem_1.75rem] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_3rem_1.75rem_1.75rem_1.75rem]"
              : "grid grid-cols-[minmax(0,1fr)_5rem_2.5rem_1.75rem_1.75rem] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_3rem_1.75rem_1.75rem]"
          }
        >
          <span className="break-words text-sm text-text">{item.category.name}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            aria-label={t("row.amountOf", { name: item.category.name })}
            className={`${fieldBaseClass} ${fieldNormalClass} px-2! py-1! text-right text-sm`}
          />
          {editarDia ? (
            <input
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="—"
              aria-label={t("row.paymentDayOf", { name: item.category.name })}
              className={`${fieldBaseClass} ${fieldNormalClass} px-1! py-1! text-center text-sm`}
            />
          ) : (
            <span />
          )}
          {onAhorro ? (
            <button
              type="button"
              onClick={alternarAhorro}
              disabled={guardandoAhorro}
              aria-pressed={item.category.ahorro}
              title={item.category.ahorro ? t("settings.countsAsSavings") : t("row.markAsSavings")}
              aria-label={t(item.category.ahorro ? "row.unmarkSavings" : "row.markSavings", { name: item.category.name })}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-50 ${
                item.category.ahorro
                  ? "bg-sage/20 text-sage"
                  : "text-text-muted hover:bg-surface-raised hover:text-text"
              }`}
            >
              <PiggyBank size={14} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={guardar}
            disabled={!dirty || guardando}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-ink transition disabled:invisible"
            aria-label={t("row.save", { name: item.category.name })}
          >
            {guardando ? "…" : <Check size={14} />}
          </button>
          {onEliminar ? (
            <button
              type="button"
              onClick={eliminar}
              disabled={eliminando}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-rust/10 hover:text-rust disabled:opacity-50"
              aria-label={t("row.delete", { name: item.category.name })}
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <span />
          )}
        </div>
        {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-medium text-text">
            {item.category.name}
          </span>
          <EtiquetaDueno ownerMemberId={item.category.ownerMemberId} members={members} />
          {item.category.fixed ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold"
              title={t("row.fixed")}
              aria-label={t("row.fixed")}
            >
              <Lock size={11} />
            </span>
          ) : null}
          {item.inherited ? (
            <span className="text-xs text-text-muted">{t("row.inherited")}</span>
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
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                {t("row.amount")}
                <span className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className={`${fieldBaseClass} ${fieldNormalClass} py-1.5 text-right`}
                  />
                </span>
              </label>
              {editarDia ? (
                <label className="flex items-center gap-1.5 text-xs text-text-muted">
                  {t("row.day")}
                  <span className="w-16">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      inputMode="numeric"
                      value={dia}
                      onChange={(e) => setDia(e.target.value)}
                      placeholder="—"
                      aria-label={t("row.paymentDayOf", { name: item.category.name })}
                      className={`${fieldBaseClass} ${fieldNormalClass} py-1.5 text-right`}
                    />
                  </span>
                </label>
              ) : null}
              <button
                type="button"
                onClick={guardar}
                disabled={!dirty || guardando}
                className="rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? "..." : t("common.save")}
              </button>
            </>
          )}
          {onEliminar ? (
            <button
              type="button"
              onClick={eliminar}
              disabled={eliminando}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-rust/10 hover:text-rust disabled:opacity-50"
              aria-label={t("row.delete", { name: item.category.name })}
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
