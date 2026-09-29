"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import type { Account, Category, Member, Transaction } from "@/lib/household/schema";
import { formatearCentavos } from "@/lib/household/formato";
import PlanDelMes from "@/components/presupuesto/PlanDelMes";
import {
  fieldBaseClass,
  fieldNormalClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

type ConfigHogar = {
  hogarConfigurado: boolean;
  accounts: Account[];
  categories: Category[];
  members: Member[];
  member: Member | null;
};

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nombreMiembro(members: Member[], id: string): string {
  if (!id) return "Conjunto";
  return members.find((m) => m.id === id)?.displayName ?? "—";
}

function nombreCuenta(accounts: Account[], id: string): string {
  return accounts.find((a) => a.id === id)?.name ?? "—";
}

function nombreCategoria(categories: Category[], id: string): string {
  if (!id) return "—";
  return categories.find((c) => c.id === id)?.name ?? "—";
}

export default function PresupuestoPage() {
  const [config, setConfig] = useState<ConfigHogar | null>(null);
  const [transacciones, setTransacciones] = useState<Transaction[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [filtroMiembro, setFiltroMiembro] = useState<"todos" | string>("todos");
  const [month, setMonth] = useState(mesActualISO);
  const [refreshKey, setRefreshKey] = useState(0);

  const [tipo, setTipo] = useState<"expense" | "income" | "transfer">("expense");
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [ownerMemberId, setOwnerMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(hoyISO);
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState("");

  async function cargarTodo() {
    setCargando(true);
    setError("");

    try {
      const [configRes, transaccionesRes] = await Promise.all([
        fetch("/api/hogar/config", { cache: "no-store" }),
        fetch("/api/hogar/transacciones", { cache: "no-store" }),
      ]);

      const configData = await configRes.json();
      const transaccionesData = await transaccionesRes.json();

      if (!configRes.ok || !configData.success) {
        throw new Error(configData.message || "No se pudo cargar la configuración del hogar.");
      }

      setConfig(configData.data);

      if (configData.data.hogarConfigurado) {
        if (!transaccionesRes.ok || !transaccionesData.success) {
          throw new Error(
            transaccionesData.message || "No se pudieron cargar las transacciones."
          );
        }
        setTransacciones(transaccionesData.data ?? []);
      }

      if (configData.data.accounts?.[0]) {
        setAccountId((actual) => actual || configData.data.accounts[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error cargando la página.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarTodo();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    if (!config) return [];
    const kind = tipo === "income" ? "income" : "expense";
    return config.categories.filter((c) => c.kind === kind);
  }, [config, tipo]);

  const transaccionesFiltradas = useMemo(() => {
    const delMes = transacciones.filter((t) => t.date.startsWith(month));

    if (filtroMiembro === "todos") return delMes;
    if (filtroMiembro === "conjunto") return delMes.filter((t) => !t.ownerMemberId);
    return delMes.filter((t) => t.ownerMemberId === filtroMiembro);
  }, [transacciones, filtroMiembro, month]);

  const totalGastos = useMemo(
    () =>
      transaccionesFiltradas
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amountCents, 0),
    [transaccionesFiltradas]
  );

  const totalIngresos = useMemo(
    () =>
      transaccionesFiltradas
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amountCents, 0),
    [transaccionesFiltradas]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!accountId) {
      setFormError("Elegí una cuenta.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("El monto debe ser mayor a 0.");
      return;
    }

    if (tipo === "transfer" && !transferAccountId) {
      setFormError("Elegí la cuenta destino.");
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch("/api/hogar/transacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tipo,
          accountId,
          transferAccountId: tipo === "transfer" ? transferAccountId : "",
          categoryId: tipo === "transfer" ? "" : categoryId,
          ownerMemberId,
          amount,
          date,
          payee,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar la transacción.");
      }

      setTransacciones((actuales) => [data.data as Transaction, ...actuales]);
      setAmount("");
      setPayee("");
      setNote("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ocurrió un error guardando.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: string) {
    const confirmado = window.confirm("¿Eliminar esta transacción? No se puede deshacer.");
    if (!confirmado) return;

    setEliminandoId(id);

    try {
      const res = await fetch(`/api/hogar/transacciones?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo eliminar la transacción.");
      }

      setTransacciones((actuales) => actuales.filter((t) => t.id !== id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error eliminando.");
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Presupuesto</p>
          <h1 className="font-serif text-3xl font-semibold text-text">Plan del hogar</h1>
          <p className="mt-1 text-sm text-text-muted">
            Cuánto planearon gastar este mes y cuánto llevan gastado de verdad.
          </p>
        </div>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Mes
          </span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-sm text-text outline-none"
          />
        </label>
      </div>

      {config && config.hogarConfigurado ? (
        <PlanDelMes month={month} refreshKey={refreshKey} />
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      {!cargando && config && !config.hogarConfigurado ? (
        <div className={sectionCardClass}>
          <p className="text-sm text-text">
            Tu usuario todavía no tiene un hogar configurado. Corré el script de seed desde tu
            computadora:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs text-text-muted">
            node --env-file=.env.local scripts/seed-hogar.mjs &quot;usuario1&quot; &quot;usuario2&quot;
          </pre>
        </div>
      ) : null}

      {config && config.hogarConfigurado ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className={`${sectionCardClass} h-fit`}>
            <h2 className="mb-4 text-lg font-semibold text-text">Nueva transacción</h2>

            <div className="mb-4 flex overflow-hidden rounded-xl border border-line">
              {(
                [
                  { value: "expense", label: "Gasto" },
                  { value: "income", label: "Ingreso" },
                  { value: "transfer", label: "Transferencia" },
                ] as const
              ).map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => {
                    setTipo(opcion.value);
                    setCategoryId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    tipo === opcion.value
                      ? opcion.value === "expense"
                        ? "bg-rust-soft text-rust"
                        : opcion.value === "income"
                        ? "bg-sage-soft text-sage"
                        : "bg-gold-soft text-gold"
                      : "text-text-muted"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Cuenta</label>
                <div className="relative">
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9`}
                  >
                    {config.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
              </div>

              {tipo === "transfer" ? (
                <div>
                  <label className={labelClass}>Cuenta destino</label>
                  <div className="relative">
                    <select
                      value={transferAccountId}
                      onChange={(e) => setTransferAccountId(e.target.value)}
                      className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9`}
                    >
                      <option value="">Elegí una cuenta</option>
                      {config.accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Categoría</label>
                  <div className="relative">
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9`}
                    >
                      <option value="">Sin categoría</option>
                      {categoriasFiltradas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>¿De quién es?</label>
                <div className="relative">
                  <select
                    value={ownerMemberId}
                    onChange={(e) => setOwnerMemberId(e.target.value)}
                    className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9`}
                  >
                    <option value="">Conjunto</option>
                    {config.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`${fieldBaseClass} ${fieldNormalClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${fieldBaseClass} ${fieldNormalClass}`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Comercio / origen (opcional)</label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="Rey, Xtra, salario..."
                  className={`${fieldBaseClass} ${fieldNormalClass}`}
                />
              </div>

              <div>
                <label className={labelClass}>Nota (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass}`}
                />
              </div>

              {formError ? <p className="text-sm text-rust">{formError}</p> : null}

              <button
                type="submit"
                disabled={guardando}
                className="mt-1 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Agregar"}
              </button>
            </form>
          </div>

          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
                  <p className="text-lg font-semibold text-sage">
                    {formatearCentavos(totalIngresos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Gastos</p>
                  <p className="text-lg font-semibold text-rust">
                    {formatearCentavos(totalGastos)}
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-56">
                <select
                  value={filtroMiembro}
                  onChange={(e) => setFiltroMiembro(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9`}
                >
                  <option value="todos">Todos</option>
                  <option value="conjunto">Conjunto</option>
                  {config.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>

            <div className={`${sectionCardClass} overflow-x-auto p-0`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Comercio</th>
                    <th className="px-4 py-3">De quién</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                        Cargando...
                      </td>
                    </tr>
                  ) : transaccionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                        Todavía no hay transacciones.
                      </td>
                    </tr>
                  ) : (
                    transaccionesFiltradas.map((t) => (
                      <tr key={t.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 text-text-muted">{t.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              t.type === "expense"
                                ? "text-rust"
                                : t.type === "income"
                                ? "text-sage"
                                : "text-gold"
                            }
                          >
                            {t.type === "expense"
                              ? "Gasto"
                              : t.type === "income"
                              ? "Ingreso"
                              : "Transferencia"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text">{nombreCuenta(config.accounts, t.accountId)}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {t.type === "transfer"
                            ? `→ ${nombreCuenta(config.accounts, t.transferAccountId)}`
                            : nombreCategoria(config.categories, t.categoryId)}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{t.payee || "—"}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {nombreMiembro(config.members, t.ownerMemberId)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-text">
                          {formatearCentavos(t.amountCents)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminar(t.id)}
                            disabled={eliminandoId === t.id}
                            className="rounded-lg p-1.5 text-text-muted transition hover:bg-rust/10 hover:text-rust disabled:opacity-50"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
