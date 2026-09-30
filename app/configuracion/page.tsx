"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilaPresupuesto from "@/components/presupuesto/FilaPresupuesto";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import GestionCuentas from "@/components/presupuesto/GestionCuentas";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { sectionCardClass } from "@/lib/ui";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "fijos" | "cuentas";

const TABS: { id: Tab; label: string }[] = [
  { id: "fijos", label: "Fijos" },
  { id: "cuentas", label: "Mis cuentas" },
];

// useSearchParams necesita un Suspense alrededor para que la página se
// pueda seguir prerenderizando (ver docs de Next).
export default function ConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <Configuracion />
    </Suspense>
  );
}

function Configuracion() {
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const router = useRouter();

  // La pestaña vive en la URL (?tab=cuentas), así el link "Editar
  // cuentas" de Presupuesto abre directo en Mis cuentas.
  const tab: Tab = useSearchParams().get("tab") === "cuentas" ? "cuentas" : "fijos";

  function elegirTab(nuevo: Tab) {
    router.replace(nuevo === "cuentas" ? "/configuracion?tab=cuentas" : "/configuracion", {
      scroll: false,
    });
  }
  const month = mesActualISO();
  const {
    items,
    members,
    cuentas,
    setCuentas,
    yo,
    cargando,
    error,
    handleGuardado,
    agregarItem,
    eliminarItem,
    asignarCuenta,
  } = usePresupuestoMes(month);

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
      <div className="mb-5">
        <p className="text-sm font-medium text-gold">Configuración</p>
        <h1 className="font-serif text-3xl font-semibold text-text">
          {tab === "fijos" ? "Gastos e ingresos fijos" : "Mis cuentas"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {tab === "fijos"
            ? "Se cargan una sola vez acá y se heredan solos mes a mes. Editalos cuando cambien (ej. sube la renta) — no hace falta tocarlos todos los meses."
            : "A qué cuenta va cada uno de tus fijos. Con esto se arma tu cuadro de transferencias de Presupuesto."}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="mb-5 flex overflow-hidden rounded-xl border border-line"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => elegirTab(t.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-gold-soft text-gold"
                : "text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
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

      {hogarConfigurado && tab === "cuentas" ? (
        cargando || !yo ? (
          <p className="py-6 text-center text-sm text-text-muted">Cargando...</p>
        ) : (
          <GestionCuentas
            items={items}
            cuentas={cuentas}
            setCuentas={setCuentas}
            yo={yo}
            asignarCuenta={asignarCuenta}
          />
        )
      ) : null}

      {hogarConfigurado && tab === "fijos" ? (
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
