"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, PiggyBank, Trash2 } from "lucide-react";
import { fechaDelDia, type CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

type Props = {
  item: CategoriaDelMes;
  month: string;
  // Edición rápida del monto y del día desde la tabla.
  onGuardado: (categoryId: string, plannedAmountCents: number, fechaPago?: string) => void;
  // Abre el modal completo (nombre, frecuencia, días, dueño, ahorro).
  onEditar: (item: CategoriaDelMes) => void;
  onEliminar: (categoryId: string) => void;
};

// Una fila de la tabla de fijos: nombre, total del mes, día de pago y
// acciones. Lo que tiene más matices (dos pagos, ahorro, dueño) vive en el modal.
export default function FilaFija({ item, month, onGuardado, onEditar, onEliminar }: Props) {
  const t = useT();
  const c = item.category;
  const dosPagos = c.quincenal;

  const [valor, setValor] = useState(String(item.plannedAmountCents / 100));
  const [diaGuardado, setDiaGuardado] = useState(c.dueDay ? String(c.dueDay) : "");
  const [dia, setDia] = useState(diaGuardado);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValor(String(item.plannedAmountCents / 100));
  }, [item.plannedAmountCents]);

  // El modal puede cambiar los días: la fila los vuelve a leer.
  useEffect(() => {
    const d = c.dueDay ? String(c.dueDay) : "";
    setDiaGuardado(d);
    setDia(d);
  }, [c.dueDay]);

  const totalCents = Math.round(Number(valor || 0) * 100);
  const montoCambio = totalCents !== item.plannedAmountCents;
  const diaCambio = !dosPagos && dia !== diaGuardado;
  const dirty = montoCambio || diaCambio;

  const textoDia = (n: number | null) => (n === null ? "—" : n === 31 ? t("cat.endOfMonth") : String(n));
  const porPago = Math.round(item.plannedAmountCents / 2);

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
          body: JSON.stringify({ categoryId: c.id, month, amount: String(totalCents / 100) }),
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
          body: JSON.stringify({ id: c.id, dueDay: diaNum }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(t.msg(data.message, "row.saveDayError"));
        }

        setDiaGuardado(dia);
      }

      onGuardado(c.id, totalCents, diaCambio ? fechaDelDia(month, diaNum) : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.savingError"));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!window.confirm(t("row.confirmDeleteFixed", { name: c.name }))) return;

    setEliminando(true);
    setError("");

    try {
      const res = await fetch(`/api/hogar/categorias?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(t.msg(data.message, "common.deleteError"));
      }

      onEliminar(c.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.deletingError"));
      setEliminando(false);
    }
  }

  return (
    <div className="border-b border-line px-3 py-2 last:border-0">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_5.25rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_4rem_5.25rem]">
        <button
          type="button"
          onClick={() => onEditar(item)}
          className="min-w-0 text-left"
          aria-label={t("row.edit", { name: c.name })}
        >
          <span className="flex items-center gap-1.5">
            <span className="break-words text-sm text-text">{c.name}</span>
            {c.ahorro ? (
              <PiggyBank size={13} className="shrink-0 text-sage" aria-label={t("settings.countsAsSavings")} />
            ) : null}
          </span>
          {dosPagos ? (
            <span className="block text-[11px] text-gold">
              {t("row.splitSummary", {
                each: formatearCentavos(porPago),
                d1: textoDia(c.dueDay),
                d2: textoDia(c.dueDay2),
              })}
            </span>
          ) : null}
        </button>

        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label={t("row.amountOf", { name: c.name })}
          className={`${fieldBaseClass} ${fieldNormalClass} px-2! py-1! text-right text-sm`}
        />

        {dosPagos ? (
          <button
            type="button"
            onClick={() => onEditar(item)}
            className="rounded-lg border border-line px-1 py-1 text-center text-xs text-text transition hover:border-gold/50"
            aria-label={t("row.edit", { name: c.name })}
          >
            {textoDia(c.dueDay)} · {textoDia(c.dueDay2)}
          </button>
        ) : (
          <input
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="—"
            aria-label={t("row.paymentDayOf", { name: c.name })}
            className={`${fieldBaseClass} ${fieldNormalClass} px-1! py-1! text-center text-sm`}
          />
        )}

        <span className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={guardar}
            disabled={!dirty || guardando}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-ink transition disabled:hidden"
            aria-label={t("row.save", { name: c.name })}
          >
            {guardando ? "…" : <Check size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onEditar(item)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-raised hover:text-gold"
            aria-label={t("row.edit", { name: c.name })}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={eliminar}
            disabled={eliminando}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-rust/10 hover:text-rust disabled:opacity-50"
            aria-label={t("row.delete", { name: c.name })}
          >
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
