"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FilaPresupuesto from "@/components/presupuesto/FilaPresupuesto";
import AgregarVariable from "@/components/presupuesto/AgregarVariable";
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
  const { items, totales, cargando, error, handleGuardado, agregarItem } =
    usePresupuestoMes(month);

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

  const totalGastosFijosCents = gastosFijos.reduce((sum, i) => sum + i.plannedAmountCents, 0);
  const totalGastosExtraCents = gastosExtra.reduce((sum, i) => sum + i.plannedAmountCents, 0);
  const totalIngresosFijosCents = ingresosFijos.reduce((sum, i) => sum + i.plannedAmountCents, 0);
  const totalIngresosExtraCents = ingresosExtra.reduce((sum, i) => sum + i.plannedAmountCents, 0);
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
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

          {/* Gastos */}
          <div className={`${sectionCardClass} p-0`}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Gastos fijos (solo lectura)</h2>
              <Link href="/configuracion" className="text-xs text-gold hover:underline">
                Editar en Configuración →
              </Link>
            </div>

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando...</p>
            ) : (
              gastosFijos.map((item) => (
                <FilaPresupuesto key={item.category.id} item={item} month={month} onGuardado={handleGuardado} readOnly />
              ))
            )}
          </div>

          <div className={`${sectionCardClass} mt-4 p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Gastos variables
            </h2>

            {gastosExtra.map((item) => (
              <FilaPresupuesto
                key={item.category.id}
                item={item}
                month={month}
                onGuardado={handleGuardado}
              />
            ))}

            <AgregarVariable kind="expense" month={month} onAgregado={agregarItem} />

            <div className="bg-surface-raised/60 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Gastos fijos</span>
                <span className="text-text">{formatearCentavos(totalGastosFijosCents)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-text-muted">Gastos variables</span>
                <span className="text-text">{formatearCentavos(totalGastosExtraCents)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                <span className="text-sm font-semibold text-text">Total gastos del mes</span>
                <span className="text-base font-semibold text-rust">
                  {formatearCentavos(totalGastosFijosCents + totalGastosExtraCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Ingresos */}
          <div className={`${sectionCardClass} mt-6 p-0`}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Ingresos fijos (solo lectura)</h2>
              <Link href="/configuracion" className="text-xs text-gold hover:underline">
                Editar en Configuración →
              </Link>
            </div>

            {ingresosFijos.map((item) => (
              <FilaPresupuesto
                key={item.category.id}
                item={item}
                month={month}
                onGuardado={handleGuardado}
                mostrarProgreso={false}
                readOnly
              />
            ))}
          </div>

          <div className={`${sectionCardClass} mt-4 p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Ingresos variables
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

            <AgregarVariable kind="income" month={month} onAgregado={agregarItem} />

            <div className="bg-surface-raised/60 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Ingresos fijos</span>
                <span className="text-text">{formatearCentavos(totalIngresosFijosCents)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-text-muted">Ingresos variables</span>
                <span className="text-text">{formatearCentavos(totalIngresosExtraCents)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                <span className="text-sm font-semibold text-text">Total ingresos del mes</span>
                <span className="text-base font-semibold text-sage">
                  {formatearCentavos(totalIngresosFijosCents + totalIngresosExtraCents)}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
