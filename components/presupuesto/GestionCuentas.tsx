"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import type { CuentaHogar } from "@/lib/household/usePresupuestoMes";
import { armarCuadro } from "@/lib/household/transferencias";
import { formatearCentavos } from "@/lib/household/formato";
import CuadroTransferencias from "@/components/presupuesto/CuadroTransferencias";
import { fieldBaseClass, fieldNormalClass, sectionCardClass } from "@/lib/ui";

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
  if (!res.ok || !data.success) throw new Error(data.message || "No se pudo guardar.");
  return data.data;
}

// "Mis cuentas": las cuentas destino (del hogar, compartidas) y a cuál va
// cada fijo de quien está logueado. Cada uno solo asigna los suyos.
export default function GestionCuentas({ items, cuentas, setCuentas, yo, asignarCuenta }: Props) {
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
      setError(err instanceof Error ? err.message : "Error creando la cuenta.");
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
      setError(err instanceof Error ? err.message : "Error renombrando.");
    }
  }

  async function borrar(cuenta: CuentaHogar) {
    const confirmado = window.confirm(
      `¿Borrar la cuenta "${cuenta.name}"? Los fijos que iban ahí (de los dos) quedan sin cuenta.`
    );
    if (!confirmado) return;
    setError("");
    try {
      await pedir(`/api/hogar/cuentas?id=${encodeURIComponent(cuenta.id)}`, { method: "DELETE" });
      setCuentas((actuales) => actuales.filter((c) => c.id !== cuenta.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error borrando.");
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
      setError(err instanceof Error ? err.message : "Error asignando.");
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className={`${sectionCardClass} mb-6 p-0`}>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Mis cuentas</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          A qué cuenta va cada uno de tus fijos. Las cuentas las ven los dos (ej. una
          conjunta), pero cada uno asigna solo lo suyo.
        </p>
      </div>

      <CuadroTransferencias cuadro={armarCuadro(items, cuentas, yo)} />

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Cuentas
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
                      aria-label="Nombre de la cuenta"
                      className={`${fieldBaseClass} ${fieldNormalClass} py-1`}
                      autoFocus
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => renombrar(cuenta.id)}
                    className="rounded-lg bg-gold px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="text-xs text-text-muted hover:text-text"
                  >
                    Cancelar
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
                    aria-label={`Renombrar ${cuenta.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(cuenta)}
                    className="rounded-md p-1 text-text-muted hover:text-rust"
                    aria-label={`Borrar ${cuenta.name}`}
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
              placeholder="Nueva cuenta (ej. Cuenta Chippu)"
              aria-label="Nombre de la nueva cuenta"
              className={`${fieldBaseClass} ${fieldNormalClass} py-1.5`}
            />
          </span>
          <button
            type="button"
            onClick={crear}
            className="flex items-center gap-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-gold transition hover:brightness-110"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Tus fijos → cuenta
        </p>

        {misFijos.length === 0 ? (
          <p className="text-sm text-text-muted">No tenés gastos fijos a tu nombre.</p>
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
                    aria-label={`Cuenta de ${item.category.name}`}
                    className={`${fieldBaseClass} ${fieldNormalClass} appearance-none py-1.5 pr-7 text-xs disabled:opacity-50`}
                  >
                    <option value="">Sin cuenta</option>
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

      {error ? <p className="px-4 pb-3 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
