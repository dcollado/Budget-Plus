"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FilaPresupuesto from "@/components/presupuesto/FilaPresupuesto";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { formatearCentavos } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export default function PresupuestoPage() {
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const [month, setMonth] = useState(mesActualISO);
  const { items, totales, cargando, error, handleGuardado } = usePresupuestoMes(month);

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setHogarConfigurado(Boolean(data?.data?.hogarConfigurado)))
      .catch(() => setHogarConfigurado(false));
  }, []);

  const gastosFijos = items.filter((i) => i.category.kind === "expense" && i.category.fixed);
  const gastosExtra = items.filter((i) => i.category.kind === "expense" && !i.category.fixed);
  const ingresosFijos = items.filter((i) => i.category.kind === "income" && i.category.fixed);
  const ingresosExtra = items.filter((i) => i.category.kind === "income" && !i.category.fixed);

  const totalFijosCents = gastosFijos.reduce((sum, i) => sum + i.plannedAmountCents, 0);
  const restante = totales ? totales.plannedExpenseCents - totales.actualExpenseCents : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Presupuesto</p>
          <h1 className="font-serif text-3xl font-semibold text-text">Plan del hogar</h1>
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

      {error ? (
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      {hogarConfigurado === false ? (
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

      {hogarConfigurado ? (
        <>
          {totales ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={sectionCardClass}>
                <p className="text-xs uppercase tracking-wide text-text-muted">Planeado</p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {formatearCentavos(totales.plannedExpenseCents)}
                </p>
              </div>
              <div className={sectionCardClass}>
                <p className="text-xs uppercase tracking-wide text-text-muted">Gastado</p>
                <p className="mt-1 text-lg font-semibold text-rust">
                  {formatearCentavos(totales.actualExpenseCents)}
                </p>
              </div>
              <div className={sectionCardClass}>
                <p className="text-xs uppercase tracking-wide text-text-muted">Por gastar</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    restante < 0 ? "text-rust" : "text-sage"
                  }`}
                >
                  {formatearCentavos(restante)}
                </p>
              </div>
              <div className={sectionCardClass}>
                <p className="text-xs uppercase tracking-wide text-text-muted">Ingresos</p>
                <p className="mt-1 text-lg font-semibold text-sage">
                  {formatearCentavos(totales.actualIncomeCents)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Fijos: solo referencia — se editan en Configuración, no acá. */}
          <div className={`${sectionCardClass} mb-6 flex items-center justify-between`}>
            <div>
              <p className="text-sm text-text-muted">
                Gastos fijos de este mes ({gastosFijos.length + ingresosFijos.length})
              </p>
              <p className="text-lg font-semibold text-text">
                {formatearCentavos(totalFijosCents)}
              </p>
            </div>
            <Link
              href="/configuracion"
              className="rounded-lg bg-surface-raised px-3 py-2 text-xs font-medium text-gold transition hover:brightness-110"
            >
              Editar en Configuración
            </Link>
          </div>

          <div className={`${sectionCardClass} p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Gastos extra este mes
            </h2>

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando...</p>
            ) : gastosExtra.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No hay categorías variables todavía.
              </p>
            ) : (
              gastosExtra.map((item) => (
                <FilaPresupuesto
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                />
              ))
            )}
          </div>

          {ingresosExtra.length > 0 ? (
            <div className={`${sectionCardClass} mt-4 p-0`}>
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
                Ingresos extra este mes
              </h2>

              {ingresosExtra.map((item) => (
                <FilaPresupuesto
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                  mostrarProgreso={false}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
