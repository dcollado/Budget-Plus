"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import type { CuentaHogar } from "@/lib/household/usePresupuestoMes";
import { armarCuadro } from "@/lib/household/transferencias";
import { formatearCentavos } from "@/lib/household/formato";
import CuadroTransferencias from "@/components/presupuesto/CuadroTransferencias";
import { fieldBaseClass, fieldNormalClass, sectionCardClass } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

type Props = {
  items: CategoriaDelMes[];
  cuentas: CuentaHogar[];
  setCuentas: (actualizar: (actuales: CuentaHogar[]) => CuentaHogar[]) => void;
  yo: string;
  asignarCuenta: (categoryId: string, cuentaId: string) => void;
};

async function pedir(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "Could not save.");
  return data.data;
}

// "My accounts": the destination accounts (household, shared) and which one
// each fixed item of the logged-in person goes to. Each person only assigns their own.
export default function GestionCuentas({ items, cuentas, setCuentas, yo, asignarCuenta }: Props) {
  const t = useT();
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const misFijos = items
    .filter(
      (i) =>
        i.category.fixed &&
        i.category.kind === "expense" &&
        i.category.ownerMemberId === yo
    )
    .sort((a, b) => a.category.name.localeCompare(b.category.name));

  const idsCuentas = new Set(cuentas.map((c) => c.id));

  async function crear() {
    if (!nueva.trim()) return;
    setError("");
    try {
      const cuenta = await pedir("/api/hogar/cuentas", {
        method: "POST",
        body: JSON.stringify({ name: nueva.trim() }),
      });
      setCuentas((actuales) => [...actuales, { id: cuenta.id, name: cuenta.name }]);
      setNueva("");
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "accounts.createError") : t("accounts.createError"));
    }
  }

  async function renombrar(id: string) {
    if (!nombreEditado.trim()) return;
    setError("");
    try {
      await pedir("/api/hogar/cuentas", {
        method: "PATCH",
        body: JSON.stringify({ id, name: nombreEditado.trim() }),
      });
      setCuentas((actuales) =>
        actuales.map((c) => (c.id === id ? { ...c, name: nombreEditado.trim() } : c))
      );
      setEditando(null);
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "accounts.renameError") : t("accounts.renameError"));
    }
  }

  async function borrar(cuenta: CuentaHogar) {
    const confirmado = window.confirm(
      t("accounts.confirmDelete", { name: cuenta.name })
    );
    if (!confirmado) return;
    setError("");
    try {
      await pedir(`/api/hogar/cuentas?id=${encodeURIComponent(cuenta.id)}`, { method: "DELETE" });
      setCuentas((actuales) => actuales.filter((c) => c.id !== cuenta.id));
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "common.deletingError") : t("common.deletingError"));
    }
  }

  async function asignar(item: CategoriaDelMes, cuentaId: string) {
    setGuardandoId(item.category.id);
    setError("");
    try {
      await pedir("/api/hogar/categorias", {
        method: "PATCH",
        body: JSON.stringify({ id: item.category.id, cuentaId }),
      });
      asignarCuenta(item.category.id, cuentaId);
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "accounts.assignError") : t("accounts.assignError"));
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className={`${sectionCardClass} p-0!`}>
      <CuadroTransferencias cuadro={armarCuadro(items, cuentas, yo)} />

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          {t("accounts.title")}
        </p>
        <p className="-mt-1 mb-2 text-xs text-text-muted">
          {t("accounts.sharedHint")}
        </p>

        <ul className="flex flex-col gap-1">
          {cuentas.map((cuenta) => (
            <li key={cuenta.id} className="flex items-center gap-2">
              {editando === cuenta.id ? (
                <>
                  <span className="flex-1">
                    <input
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renombrar(cuenta.id)}
                      aria-label={t("accounts.nameLabel")}
                      className={`${fieldBaseClass} ${fieldNormalClass} py-1`}
                      autoFocus
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => renombrar(cuenta.id)}
                    className="rounded-lg bg-gold px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="text-xs text-text-muted hover:text-text"
                  >
                    {t("common.cancel")}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm text-text">{cuenta.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(cuenta.id);
                      setNombreEditado(cuenta.name);
                    }}
                    className="rounded-md p-1 text-text-muted hover:text-gold"
                    aria-label={t("accounts.rename", { name: cuenta.name })}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(cuenta)}
                    className="rounded-md p-1 text-text-muted hover:text-rust-text"
                    aria-label={t("accounts.delete", { name: cuenta.name })}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-2 flex gap-2">
          <span className="flex-1">
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crear()}
              placeholder={t("accounts.newPlaceholder")}
              aria-label={t("accounts.newName")}
              className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
            />
          </span>
          <button
            type="button"
            onClick={crear}
            className="flex items-center gap-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-gold transition hover:brightness-110"
          >
            <Plus size={13} /> {t("common.add")}
          </button>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          {t("accounts.yourFixed")}
        </p>

        {misFijos.length === 0 ? (
          <p className="text-sm text-text-muted">{t("accounts.noFixed")}</p>
        ) : (
          <ul className="flex flex-col">
            {misFijos.map((item) => (
              <li
                key={item.category.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-line py-1.5 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-text">{item.category.name}</span>
                  <span className="text-xs text-text-muted">
                    {formatearCentavos(item.plannedAmountCents)}
                  </span>
                </span>
                <span className="relative w-40">
                  <select
                    value={idsCuentas.has(item.category.cuentaId) ? item.category.cuentaId : ""}
                    onChange={(e) => asignar(item, e.target.value)}
                    disabled={guardandoId === item.category.id}
                    aria-label={t("accounts.accountFor", { name: item.category.name })}
                    className={`${fieldBaseClass} ${fieldNormalClass} appearance-none py-1.5 pr-7 text-xs disabled:opacity-50`}
                  >
                    <option value="">{t("row.noAccount")}</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="px-4 pb-3 text-xs text-rust-text">{error}</p> : null}
    </div>
  );
}
