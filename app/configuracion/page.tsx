"use client";

import { useEffect, useState } from "react";
import FilaPresupuesto from "@/components/presupuesto/FilaPresupuesto";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { sectionCardClass } from "@/lib/ui";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export default function ConfiguracionPage() {
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const month = mesActualISO();
  const { items, members, cargando, error, handleGuardado, agregarItem, eliminarItem } =
    usePresupuestoMes(month);

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setHogarConfigurado(Boolean(data?.data?.hogarConfigurado)))
      .catch(() => setHogarConfigurado(false));
  }, []);

  const gastosFijos = items.filter((i) => i.category.kind === "expense" && i.category.fixed);
  const ingresosFijos = items.filter((i) => i.category.kind === "income" && i.category.fixed);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-gold">Configuración</p>
        <h1 className="font-serif text-3xl font-semibold text-text">Gastos e ingresos fijos</h1>
        <p className="mt-1 text-sm text-text-muted">
          Se cargan una sola vez acá y se heredan solos mes a mes. Editalos cuando cambien
          (ej. sube la renta) — no hace falta tocarlos todos los meses.
        </p>
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
          <div className={`${sectionCardClass} p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Gastos fijos
            </h2>

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando...</p>
            ) : (
              gastosFijos.map((item) => (
                <FilaPresupuesto
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                  onEliminar={eliminarItem}
                  mostrarProgreso={false}
                  editarDia
                  members={members}
                />
              ))
            )}

            <AgregarCategoria
              kind="expense"
              month={month}
              onAgregado={agregarItem}
              fixed
              members={members}
            />
          </div>

          <div className={`${sectionCardClass} mt-4 p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Ingresos fijos
            </h2>

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando...</p>
            ) : (
              ingresosFijos.map((item) => (
                <FilaPresupuesto
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                  onEliminar={eliminarItem}
                  mostrarProgreso={false}
                />
              ))
            )}

            <AgregarCategoria kind="income" month={month} onAgregado={agregarItem} fixed />
          </div>
        </>
      ) : null}
    </main>
  );
}
