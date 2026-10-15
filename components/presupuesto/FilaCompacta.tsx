"use client";

import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos, formatearFechaCorta } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass } from "@/lib/ui";
import type { CuentaHogar, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import EtiquetaDueno from "@/components/presupuesto/EtiquetaDueno";
import { useT } from "@/lib/i18n/client";

type Props = {
  item: CategoriaDelMes;
  month: string;
  // Without onGuardado = read-only (fixed items, which are edited in Settings).
  onGuardado?: (
    categoryId: string,
    plannedAmountCents: number,
    fechaPago?: string,
    extras?: { nota?: string; pagado?: boolean }
  ) => void;
  onEliminar?: (categoryId: string) => void;
  members?: MiembroHogar[];
  // Variable expenses: which account that extra money goes to. Display only;
  // it does not count toward the transfers table (that is fixed items only).
  cuentas?: CuentaHogar[];
  onCuenta?: (categoryId: string, cuentaId: string) => void;
};

// A single line: date · name · amount. Designed for long lists on
// mobile — the name truncates instead of pushing the amount to another line.
export default function FilaCompacta({
  item,
  month,
  onGuardado,
  onEliminar,
  members = [],
  cuentas = [],
  onCuenta,
}: Props) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(item.plannedAmountCents / 100));
  const [fecha, setFecha] = useState(item.fechaPago);
  const [cuentaId, setCuentaId] = useState(item.category.cuentaId);
  const [nota, setNota] = useState(item.nota);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const esIngreso = item.category.kind === "income";
  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const conCuenta = !esIngreso && Boolean(onCuenta);
  const nombreCuenta = cuentas.find((c) => c.id === item.category.cuentaId)?.name;

  function abrir() {
    setMonto(String(item.plannedAmountCents / 100));
    setFecha(item.fechaPago);
    setCuentaId(item.category.cuentaId);
    setNota(item.nota);
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
          nota,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(t.msg(data.message, "common.saveError"));
      }

      if (conCuenta && cuentaId !== item.category.cuentaId) {
        const resCuenta = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.category.id, cuentaId }),
        });
        const dataCuenta = await resCuenta.json();
        if (!resCuenta.ok || !dataCuenta.success) {
          throw new Error(t.msg(dataCuenta.message, "common.saveAccountError"));
        }
        onCuenta?.(item.category.id, cuentaId);
      }

      onGuardado?.(item.category.id, Math.round(Number(monto || 0) * 100), fecha, {
        nota: nota.trim(),
      });
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.savingError"));
    } finally {
      setGuardando(false);
    }
  }

  // Marca o desmarca "pagado / hecho" al instante, sin abrir la edición.
  async function alternarPagado() {
    const nuevo = !item.pagado;
    setError("");

    try {
      const res = await fetch("/api/hogar/presupuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: item.category.id,
          month,
          amount: String(item.plannedAmountCents / 100),
          pagado: nuevo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(t.msg(data.message, "common.saveError"));
      }

      onGuardado?.(item.category.id, item.plannedAmountCents, undefined, { pagado: nuevo });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.savingError"));
    }
  }

  async function eliminar() {
    const confirmado = window.confirm(t("row.confirmDelete", { name: item.category.name }));
    if (!confirmado) return;

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
    }
  }

  return (
    <div className="border-b border-line px-4 py-2 last:border-0">
      <div
        className={`grid items-center gap-2 ${
          onGuardado
            ? "grid-cols-[1.5rem_3.25rem_minmax(0,1fr)_auto]"
            : "grid-cols-[3.25rem_minmax(0,1fr)_auto]"
        }`}
      >
        {onGuardado ? (
          <button
            type="button"
            onClick={() => void alternarPagado()}
            aria-pressed={item.pagado}
            aria-label={item.pagado ? t("row.markUndone") : t("row.markDone")}
            title={item.pagado ? t("row.markUndone") : t("row.markDone")}
            className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
              item.pagado
                ? "border-sage bg-sage/20 text-sage"
                : "border-line text-transparent hover:border-sage hover:text-sage/60"
            }`}
          >
            <Check size={13} strokeWidth={3} />
          </button>
        ) : null}
        <span className="text-xs text-text-muted">
          {item.fechaPago ? formatearFechaCorta(item.fechaPago, t.locale) : "—"}
        </span>

        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={`truncate text-sm ${
                item.pagado ? "text-text-muted line-through" : "text-text"
              }`}
            >
              {item.category.name}
            </span>
            <EtiquetaDueno ownerMemberId={item.category.ownerMemberId} members={members} />
          </span>
          {conCuenta && nombreCuenta ? (
            <span className="block truncate text-[11px] text-text-muted">→ {nombreCuenta}</span>
          ) : null}
          {item.nota ? (
            <span className="block truncate text-[11px] italic text-text-muted">{item.nota}</span>
          ) : null}
        </span>

        <span className="flex items-center gap-1">
          <span
            className={`whitespace-nowrap text-sm font-medium ${
              item.pagado ? "text-text-muted" : esIngreso ? "text-sage" : "text-text"
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
              aria-label={t("row.edit", { name: item.category.name })}
            >
              <Pencil size={13} />
            </button>
          ) : null}
          {onEliminar ? (
            <button
              type="button"
              onClick={eliminar}
              className="rounded-md p-1 text-text-muted transition hover:text-rust"
              aria-label={t("row.delete", { name: item.category.name })}
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
            aria-label={t("row.paymentDate")}
            className={`${fieldBaseClass} ${fieldNormalClass} w-36 flex-1 py-1.5`}
          />
          <input
            type="text"
            value={nota}
            maxLength={200}
            onChange={(e) => setNota(e.target.value)}
            placeholder={t("row.notePlaceholder")}
            aria-label={t("row.note")}
            className={`${fieldBaseClass} ${fieldNormalClass} w-full py-1.5 text-sm`}
          />
          {conCuenta ? (
            <select
              value={cuentas.some((c) => c.id === cuentaId) ? cuentaId : ""}
              onChange={(e) => setCuentaId(e.target.value)}
              aria-label={t("row.whichAccount")}
              className={`${fieldBaseClass} ${fieldNormalClass} w-full py-1.5 text-sm`}
            >
              <option value="">{t("row.noAccount")}</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {guardando ? "..." : t("common.save")}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
