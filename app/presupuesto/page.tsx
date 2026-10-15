"use client";

import { useEffect, useState } from "react";
import MesPanel from "@/components/presupuesto/MesPanel";
import SinHogar from "@/components/presupuesto/SinHogar";
import PrimerosPasos from "@/components/presupuesto/PrimerosPasos";
import TarjetaTransferencias from "@/components/presupuesto/TarjetaTransferencias";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { armarCuadro } from "@/lib/household/transferencias";
import { mesActual, mesSiguiente } from "@/lib/household/formato";
import { useT } from "@/lib/i18n/client";
import { Pagina } from "@/components/pagina";

export default function PresupuestoPage() {
  const t = useT();
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
    <Pagina ancho="extra">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">{t("nav.budget")}</p>
          <h1 className="font-serif text-3xl font-semibold text-text">{t("budget.householdPlan")}</h1>
        </div>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("budget.from")}
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
        <div className="2xl:grid 2xl:grid-cols-[24rem_minmax(0,1fr)] 2xl:items-start 2xl:gap-8">
          {/* The first thing you check on payday: how much to move to each
              account. Only the logged-in person's table. */}
          <div className="2xl:sticky 2xl:top-20">
            <TarjetaTransferencias
              cuadro={
                primerMes.cargando || !primerMes.yo
                  ? null
                  : armarCuadro(primerMes.items, primerMes.cuentas, primerMes.yo)
              }
            />
          </div>

          {/* Two months at a time: the selected one and the next. Side by side on
              desktop, stacked on mobile. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <MesPanel month={month} datos={primerMes} />
            <MesPanel month={mesSiguiente(month)} datos={segundoMes} />
          </div>
        </div>
      ) : null}
    </Pagina>
  );
}
