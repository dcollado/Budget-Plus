"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilaFija from "@/components/presupuesto/FilaFija";
import CategoriaModal from "@/components/presupuesto/CategoriaModal";
import { EncabezadoTablaFijos, PieTablaFijos } from "@/components/presupuesto/PartesTablaFijos";
import SinHogar from "@/components/presupuesto/SinHogar";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import GestionCuentas from "@/components/presupuesto/GestionCuentas";
import { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { sectionCardClass } from "@/lib/ui";
import { mesActual } from "@/lib/household/formato";
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
    modificarCategoria,
  } = usePresupuestoMes(month);

  // Ítem fijo abierto en el modal de edición.
  const [editando, setEditando] = useState<(typeof items)[number] | null>(null);

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
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text">
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
          <div className="mb-4 flex justify-end">
            <AgregarCategoria
              kind="expense"
              month={month}
              onAgregado={agregarItem}
              fixed
              members={members}
              defaultOwner={yo}
            />
          </div>

          <div className={`${sectionCardClass} p-0!`}>
            <EncabezadoTablaFijos titulo={t("settings.fixedIncome")} claseTitulo="text-sage" />

            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">{t("common.loading")}</p>
            ) : (
              ingresosFijos.map((item) => (
                <FilaFija
                  key={item.category.id}
                  item={item}
                  month={month}
                  onGuardado={handleGuardado}
                  onEditar={setEditando}
                  onEliminar={eliminarItem}
                />
              ))
            )}

            <PieTablaFijos totalCents={suma(ingresosFijos)} verde />

            <div className="border-t border-line">
              <AgregarCategoria
                kind="income"
                month={month}
                onAgregado={agregarItem}
                fixed
                variant="fila"
              />
            </div>
          </div>

          {/* Fixed expenses grouped by person, each group with its color
              (David blue, Caro red). Side by side on wide screens. */}
          <div className={`mt-4 grid grid-cols-1 items-start gap-4 ${columnasFijos}`}>
            {cargando ? (
              <p className="py-6 text-center text-sm text-text-muted">{t("common.loading")}</p>
            ) : (
              gruposFijos.map((grupo) => (
                <div
                  key={grupo.id || "conjunto"}
                  className={`${sectionCardClass} border-t-4 p-0! ${grupo.color.borde}`}
                >
                  <EncabezadoTablaFijos
                    titulo={t("settings.fixedOf", { name: grupo.nombre })}
                    claseTitulo={grupo.color.texto}
                  />
                  {grupo.items.map((item) => (
                    <FilaFija
                      key={item.category.id}
                      item={item}
                      month={month}
                      onGuardado={handleGuardado}
                      onEditar={setEditando}
                      onEliminar={eliminarItem}
                    />
                  ))}
                  <PieTablaFijos totalCents={suma(grupo.items)} />
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

      <CategoriaModal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        kind={editando?.category.kind ?? "expense"}
        month={month}
        fixed
        members={members}
        editar={editando}
        onModificada={(categoryId, cambios, total) =>
          modificarCategoria(categoryId, cambios, total)
        }
      />
    </Pagina>
  );
}
