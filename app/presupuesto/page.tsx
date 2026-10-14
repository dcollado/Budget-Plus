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

  // Una carga por mes. La del primero también alimenta "Tus transferencias".
  const primerMes = usePresupuestoMes(month);
  const segundoMes = usePresupuestoMes(mesSiguiente(month));

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      // Si falla (ej. cuota de Sheets) no es "sin hogar": se deja en null.
      .then((data) => data?.success && setHogarConfigurado(Boolean(data.data?.hogarConfigurado)))
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Presupuesto</p>
          <h1 className="font-serif text-3xl font-semibold text-text">Plan del hogar</h1>
        </div>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Desde
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
          {/* Lo primero que se mira el día de pago: cuánto pasar a cada
              cuenta. Solo el cuadro de quien está logueado. */}
          <TarjetaTransferencias
            cuadro={
              primerMes.cargando || !primerMes.yo
                ? null
                : armarCuadro(primerMes.items, primerMes.cuentas, primerMes.yo)
            }
          />

          {/* Dos meses a la vez: el elegido y el siguiente. Lado a lado en
              desktop, uno debajo del otro en mobile. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <MesPanel month={month} datos={primerMes} />
            <MesPanel month={mesSiguiente(month)} datos={segundoMes} />
          </div>
        </>
      ) : null}
    </main>
  );
}
