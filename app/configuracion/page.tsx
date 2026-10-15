"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilaPresupuesto from "@/components/presupuesto/FilaPresupuesto";
import SinHogar from "@/components/presupuesto/SinHogar";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import GestionCuentas from "@/components/presupuesto/GestionCuentas";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { sectionCardClass } from "@/lib/ui";
import { formatearCentavos, mesActual } from "@/lib/household/formato";
import { colorMiembro, nombreMiembro } from "@/components/presupuesto/EtiquetaDueno";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import { Pagina } from "@/components/pagina";

type Tab = "fijos" | "cuentas";

const TABS: { id: Tab; label: MessageKey }[] = [
  { id: "fijos", label: "settings.tabFixed" },
  { id: "cuentas", label: "settings.tabAccounts" },
];

// useSearchParams needs a Suspense around it so the page can still be
// prerendered (see Next docs).
export default function ConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <Configuracion />
    </Suspense>
  );
}

function Configuracion() {
  const t = useT();
  const [hogarConfigurado, setHogarConfigurado] = useState<boolean | null>(null);
  const router = useRouter();

  // The tab lives in the URL (?tab=cuentas), so the "Edit accounts"
  // link in Budget opens directly on My accounts.
  const tab: Tab = useSearchParams().get("tab") === "cuentas" ? "cuentas" : "fijos";

  function elegirTab(nuevo: Tab) {
    router.replace(nuevo === "cuentas" ? "/configuracion?tab=cuentas" : "/configuracion", {
      scroll: false,
    });
  }
  const month = mesActual();
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
    marcarAhorro,
  } = usePresupuestoMes(month);

  useEffect(() => {
    fetch("/api/hogar/config", { cache: "no-store" })
      .then((res) => res.json())
      // If it fails (e.g. Sheets quota) it is not "no household": leave it null.
      .then((data) => data?.success && setHogarConfigurado(Boolean(data.data?.hogarConfigurado)))
      .catch(() => {});
  }, []);

  const gastosFijos = items.filter((i) => i.category.kind === "expense" && i.category.fixed);
  const ingresosFijos = items.filter((i) => i.category.kind === "income" && i.category.fixed);

  const suma = (lista: typeof items) => lista.reduce((t, i) => t + i.plannedAmountCents, 0);

  // One group per person (me first) and "Joint" for those without an owner.
  const gruposFijos = [
    ...[...members].sort((a, b) => (a.id === yo ? -1 : b.id === yo ? 1 : 0)).map((m) => m.id),
    "",
  ]
    .map((id) => ({
      id,
      nombre: id ? nombreMiembro(members, id) : t("settings.both"),
      color: colorMiembro(members, id),
      items: gastosFijos.filter((i) =>
        id ? i.category.ownerMemberId === id : !members.some((m) => m.id === i.category.ownerMemberId)
      ),
    }))
    .filter((g) => g.items.length > 0);

  const gruposVisibles = gruposFijos.length;
  const columnasFijos =
    gruposVisibles >= 3
      ? "lg:grid-cols-2 xl:grid-cols-3"
      : gruposVisibles === 2
        ? "lg:grid-cols-2"
        : "";
  // Con tres o más grupos la página se ensancha para que las filas respiren.
  const ancho = tab === "fijos" ? (gruposVisibles >= 3 ? "ancho" : "normal") : "estrecho";

  return (
    <Pagina ancho={ancho}>
      <div className="mb-5">
        <p className="text-sm font-medium text-gold">{t("nav.accounts")}</p>
        <h1 className="font-serif text-3xl font-semibold text-text">
          {tab === "fijos" ? t("settings.titleFixed") : t("settings.titleAccounts")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {tab === "fijos"
            ? t("settings.hintFixed")
            : t("settings.hintAccounts")}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t("settings.sections")}
        className="mb-5 flex overflow-hidden rounded-xl border border-line"
      >
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => elegirTab(tabItem.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
              tab === tabItem.id
                ? "bg-gold-soft text-gold"
                : "text-text-muted hover:text-text"
            }`}
          >
            {t(tabItem.label)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      {hogarConfigurado === false ? <SinHogar /> : null}

      {hogarConfigurado && tab === "cuentas" ? (
        cargando || !yo ? (
          <p className="py-6 text-center text-sm text-text-muted">{t("common.loading")}</p>
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
          <div className={`${sectionCardClass} p-0!`}>
            <h2 className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm font-semibold text-text">
              {t("settings.fixedIncome")}
              <span className="flex items-center gap-3">
                <span className="text-sage">{formatearCentavos(suma(ingresosFijos))}</span>
                <AgregarCategoria
                  kind="income"
                  month={month}
                  onAgregado={agregarItem}
                  fixed
                  variant="mini"
                />
              </span>
            </h2>

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">{t("common.loading")}</p>
            ) : (
              ingresosFijos.map((item) => (
                <FilaPresupuesto
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                  onEliminar={eliminarItem}
                  mostrarProgreso={false}
                  compacta
                />
              ))
            )}

          </div>

          {/* Fixed expenses grouped by person, each group with its color
              (David blue, Caro red). Side by side on wide screens. */}
          {!cargando && gruposFijos.length === 0 ? (
            <div className={`${sectionCardClass} mt-4 flex flex-wrap items-center justify-between gap-3`}>
              <p className="text-sm text-text-muted">{t("settings.noFixedYet")}</p>
              <AgregarCategoria
                kind="expense"
                month={month}
                onAgregado={agregarItem}
                fixed
                members={members}
                defaultOwner={yo}
              />
            </div>
          ) : null}

          <div className={`mt-4 grid grid-cols-1 gap-4 ${columnasFijos}`}>
            {cargando ? (
              <p className="py-6 text-center text-sm text-text-muted">{t("common.loading")}</p>
            ) : (
              gruposFijos.map((grupo) => (
                <div
                  key={grupo.id || "conjunto"}
                  className={`${sectionCardClass} border-t-4 p-0! ${grupo.color.borde}`}
                >
                  <h2 className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm font-semibold">
                    <span className={grupo.color.texto}>{t("settings.fixedOf", { name: grupo.nombre })}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-text">{formatearCentavos(suma(grupo.items))}</span>
                      <AgregarCategoria
                        kind="expense"
                        month={month}
                        onAgregado={agregarItem}
                        fixed
                        variant="mini"
                        members={members}
                        defaultOwner={grupo.id}
                      />
                    </span>
                  </h2>
                  <div className="grid grid-cols-[minmax(0,1fr)_5rem_2.5rem_1.75rem_1.75rem_1.75rem] gap-1.5 px-3 pt-1.5 text-[10px] uppercase tracking-wide text-text-muted sm:grid-cols-[minmax(0,1fr)_6.5rem_3rem_1.75rem_1.75rem_1.75rem]">
                    <span />
                    <span className="text-right">{t("settings.amount")}</span>
                    <span className="text-center">{t("settings.day")}</span>
                    <span className="text-center" title={t("settings.countsAsSavings")}>{t("settings.savings")}</span>
                  </div>
                  {grupo.items.map((item) => (
                    <FilaPresupuesto
                      key={item.category.id}
                      item={item}
                      month={month}
                      onGuardado={handleGuardado}
                      onEliminar={eliminarItem}
                      mostrarProgreso={false}
                      editarDia
                      members={members}
                      compacta
                      onAhorro={marcarAhorro}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </Pagina>
  );
}
