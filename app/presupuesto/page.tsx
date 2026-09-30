"use client";

import { useEffect, useState } from "react";
import MesPanel from "@/components/presupuesto/MesPanel";
import { mesSiguiente } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export default function PresupuestoPage() {
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const [month, setMonth] = useState(mesActualISO);

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setHogarConfigurado(Boolean(data?.data?.hogarConfigurado)))
      .catch(() => setHogarConfigurado(false));
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

      {/* Dos meses a la vez: el elegido y el siguiente. Lado a lado en
          desktop, uno debajo del otro en mobile. */}
      {hogarConfigurado ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <MesPanel month={month} />
          <MesPanel month={mesSiguiente(month)} />
        </div>
      ) : null}
    </main>
  );
}
