"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fieldBaseClass, fieldNormalClass, sectionCardClass } from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";

const POR_PAGINA = 10;

// Todos los hogares en una tabla compacta: buscar, paginar y abrir una fila
// para ver/editar sus personas, invitaciones y calendario.
export default function TablaHogares({
  hogares,
  renderDetalle,
}: {
  hogares: HogarResumen[];
  renderDetalle: (hogar: HogarResumen) => React.ReactNode;
}) {
  const t = useT();
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [abierto, setAbierto] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return hogares;
    return hogares.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.miembros.some(
          (m) => m.nombre.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)
        )
    );
  }, [hogares, busqueda]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas - 1);
  const desde = paginaActual * POR_PAGINA;
  const visibles = filtrados.slice(desde, desde + POR_PAGINA);

  const claseCalendario = {
    propio: "bg-sage/20 text-sage",
    plataforma: "bg-gold-soft text-gold",
    ninguno: "bg-surface-raised text-text-muted",
  } as const;

  return (
    <section className={`${sectionCardClass} space-y-4 p-0!`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 className="text-base font-semibold text-text">
          {t("admin.householdsTitle")}{" "}
          <span className="text-sm font-normal text-text-muted">({hogares.length})</span>
        </h2>

        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(0);
            }}
            placeholder={t("admin.searchPlaceholder")}
            aria-label={t("admin.searchPlaceholder")}
            className={`${fieldBaseClass} ${fieldNormalClass} pl-9`}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-y border-line text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2 text-left font-medium sm:px-5">{t("admin.colHousehold")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("admin.colAdmin")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("admin.colPeople")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("admin.colPending")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("admin.colCalendar")}</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  {t("admin.noMatches")}
                </td>
              </tr>
            ) : null}

            {visibles.map((h) => {
              const activos = h.miembros.filter((m) => m.activo).length;
              const admin = h.miembros.find((m) => m.role === "admin" && m.activo);
              const estaAbierto = abierto === h.id;

              return (
                <Fragment key={h.id}>
                  <tr
                    onClick={() => setAbierto(estaAbierto ? null : h.id)}
                    className={`cursor-pointer border-b border-line transition hover:bg-surface-raised/60 ${
                      estaAbierto ? "bg-surface-raised/40" : ""
                    } ${h.archivadoEn ? "text-text-muted" : "text-text"}`}
                  >
                    <td className="px-4 py-3 font-medium sm:px-5">
                      {h.name}
                      {h.archivadoEn ? (
                        <span className="ml-2 rounded-md bg-surface-raised px-2 py-0.5 align-middle text-xs font-medium text-text-muted">
                          {t("household.archivedBadge")}
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-3 text-text-muted">
                      {admin ? admin.email || admin.nombre : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{activos}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {h.invitaciones.length > 0 ? h.invitaciones.length : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${claseCalendario[h.calendario]}`}
                      >
                        {h.calendario === "propio"
                          ? t("admin.calOwn")
                          : h.calendario === "plataforma"
                            ? t("admin.calPlatform")
                            : t("admin.calNone")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        aria-expanded={estaAbierto}
                        aria-label={h.name}
                        className="text-text-muted"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition ${estaAbierto ? "rotate-180" : ""}`}
                        />
                      </button>
                    </td>
                  </tr>

                  {estaAbierto ? (
                    <tr className="border-b border-line bg-surface">
                      <td colSpan={6} className="px-4 py-4 sm:px-5">
                        {renderDetalle(h)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginas > 1 ? (
        <div className="flex items-center justify-between gap-3 px-4 pb-4 text-xs text-text-muted sm:px-5">
          <span>
            {t("admin.showing", {
              from: desde + 1,
              to: Math.min(desde + POR_PAGINA, filtrados.length),
              total: filtrados.length,
            })}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPagina(paginaActual - 1)}
              disabled={paginaActual === 0}
              aria-label={t("admin.prev")}
              className="rounded-lg p-1.5 transition hover:bg-surface-raised disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPagina(paginaActual + 1)}
              disabled={paginaActual >= paginas - 1}
              aria-label={t("admin.next")}
              className="rounded-lg p-1.5 transition hover:bg-surface-raised disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </span>
        </div>
      ) : (
        <div className="pb-1" />
      )}
    </section>
  );
}
