"use client";

import { useEffect, useState } from "react";
import MesPanel from "@/components/presupuesto/MesPanel";
import SinHogar from "@/components/presupuesto/SinHogar";
import PrimerosPasos from "@/components/presupuesto/PrimerosPasos";
import TarjetaTransferencias from "@/components/presupuesto/TarjetaTransferencias";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { armarCuadro } from "@/lib/household/transferencias";
import { mesActual, mesSiguiente } from "@/lib/household/formato";

export default function PresupuestoPage() {
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const [month, setMonth] = useState(mesActual);

  // One load per month. The first one also feeds "Your transfers".
  const primerMes = usePresupuestoMes(month);
  const segundoMes = usePresupuestoMes(mesSiguiente(month));

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      // If it fails (e.g. Sheets quota) it is not "no household": leave it null.
      .then((data) => data?.success && setHogarConfigurado(Boolean(data.data?.hogarConfigurado)))
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Budget</p>
          <h1 className="font-serif text-3xl font-semibold text-text">Household plan</h1>
        </div>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
            From
          </span>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-sm text-text outline-none"
          />
        </label>
      </div>

      {hogarConfigurado === false ? <SinHogar /> : null}

      {hogarConfigurado &&
      !primerMes.cargando &&
      primerMes.items.every((i) => i.plannedAmountCents === 0) ? (
        <PrimerosPasos />
      ) : null}

      {hogarConfigurado ? (
        <>
          {/* The first thing you check on payday: how much to move to each
              account. Only the logged-in person's table. */}
          <TarjetaTransferencias
            cuadro={
              primerMes.cargando || !primerMes.yo
                ? null
                : armarCuadro(primerMes.items, primerMes.cuentas, primerMes.yo)
            }
          />

          {/* Two months at a time: the selected one and the next. Side by side on
              desktop, stacked on mobile. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <MesPanel month={month} datos={primerMes} />
            <MesPanel month={mesSiguiente(month)} datos={segundoMes} />
          </div>
        </>
      ) : null}
    </main>
  );
}
