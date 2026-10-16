"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import { formatearCentavos, mesActual } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";
import { colorMiembro } from "@/components/presupuesto/EtiquetaDueno";
import type { ReporteAnual } from "@/lib/household/reporte";
import { useT } from "@/lib/i18n/client";
import { Pagina } from "@/components/pagina";

function nombreMes(month: string, locale: string): string {
  const [anio, mes] = month.split("-").map(Number);
  const texto = new Date(Date.UTC(anio, mes - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaCorta(fecha: string, locale: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const dinero = (cents: number) => (cents === 0 ? "—" : formatearCentavos(cents));

function Tarjeta({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${color}`}>{formatearCentavos(valor)}</p>
    </div>
  );
}

export default function ReportePage() {
  const t = useT();
  const [year, setYear] = useState(() => Number(mesActual().slice(0, 4)));
  const [reporte, setReporte] = useState<ReporteAnual | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    fetch(`/api/hogar/reporte?year=${year}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { data?: ReporteAnual; message?: string };
        if (!vigente) return;
        if (!res.ok || !json.data) throw new Error(t.msg(json.message, "report.loadError"));
        setReporte(json.data);
        setError("");
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : t("report.loadError"));
      });

    return () => {
      vigente = false;
    };
  }, [year, t]);

  const actual = mesActual();
  const cargando = reporte === null || reporte.year !== year;

  // To reuse the per-person color palette.
  const miembros = (reporte?.personas ?? [])
    .filter((p) => p.memberId)
    .map((p) => ({ id: p.memberId, displayName: p.nombre, color: p.color }));

  const totalExtraordinarios = (reporte?.extraordinarios ?? []).reduce(
    (t, e) => t + e.montoCents,
    0
  );

  return (
    <Pagina ancho="ancho" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold">{t("nav.report")}</p>
          <h1 className="font-serif text-3xl font-semibold text-text">{t("report.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {t("report.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label={t("report.prevYear")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-text"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-16 text-center text-sm font-semibold text-text">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label={t("report.nextYear")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-text"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text">
          {error}
        </div>
      ) : null}

      {cargando && !error ? (
        <p className="py-8 text-center text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : null}

      {reporte && !cargando ? (
        <>
          {reporte.categoriasAhorro === 0 ? (
            <div className={`${sectionCardClass} flex items-start gap-3`}>
              <PiggyBank size={20} className="mt-0.5 shrink-0 text-sage" />
              <p className="text-sm text-text-muted">
                {t("report.savingsHint1")}{" "}
                <Link href="/configuracion" className="text-gold underline">
                  {t("nav.accounts")}
                </Link>{" "}
                {t("report.savingsHint2")}
              </p>
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Tarjeta label={t("report.income")} valor={reporte.totales.ingresosCents} color="text-sage" />
            <Tarjeta label={t("report.fixedExpenses")} valor={reporte.totales.fijosCents} color="text-text" />
            <Tarjeta label={t("report.variable")} valor={reporte.totales.variablesCents} color="text-rust-text" />
            <Tarjeta label={t("report.savings")} valor={reporte.totales.ahorroCents} color="text-sage" />
            <Tarjeta
              label={t("report.leftOver")}
              valor={reporte.totales.sobranteCents}
              color={reporte.totales.sobranteCents < 0 ? "text-rust-text" : "text-sage"}
            />
          </section>

          {/* Columna fija en móvil: sin esto crece hasta el texto más largo (los
              nombres de gastos extraordinarios no se parten) y ensancha la página. */}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-start">
          <section className={`${sectionCardClass} p-0!`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              {t("report.monthByMonth")}
            </h2>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 text-left font-medium">{t("report.month")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.income")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.fixed")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.variable")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.savings")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("report.leftOver")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.meses.map((m) => {
                    const vacio =
                      m.ingresosCents === 0 && m.fijosCents === 0 && m.variablesCents === 0;
                    const esActual = m.month === actual;

                    return (
                      <tr
                        key={m.month}
                        className={`border-t border-line ${esActual ? "bg-gold-soft" : ""} ${
                          vacio ? "text-text-muted" : "text-text"
                        }`}
                      >
                        <td className="px-4 py-2 font-medium">
                          {nombreMes(m.month, t.locale)}
                          {esActual ? (
                            <span className="ml-2 text-xs font-semibold uppercase text-gold">
                              {t("report.today")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{dinero(m.ingresosCents)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{dinero(m.fijosCents)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{dinero(m.variablesCents)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-sage">
                          {dinero(m.ahorroCents)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-semibold tabular-nums ${
                            vacio ? "" : m.sobranteCents < 0 ? "text-rust-text" : "text-sage"
                          }`}
                        >
                          {vacio ? "—" : formatearCentavos(m.sobranteCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Móvil: un mes por tarjeta, sin desplazamiento horizontal. */}
            <ul className="divide-y divide-line sm:hidden">
              {reporte.meses.map((m) => {
                const vacio =
                  m.ingresosCents === 0 && m.fijosCents === 0 && m.variablesCents === 0;
                const esActual = m.month === actual;

                return (
                  <li
                    key={m.month}
                    className={`px-4 py-3 ${esActual ? "bg-gold-soft" : ""} ${
                      vacio ? "text-text-muted" : "text-text"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">
                        {nombreMes(m.month, t.locale)}
                        {esActual ? (
                          <span className="ml-2 text-xs font-semibold uppercase text-gold">
                            {t("report.today")}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          vacio ? "" : m.sobranteCents < 0 ? "text-rust-text" : "text-sage"
                        }`}
                      >
                        {vacio ? "—" : formatearCentavos(m.sobranteCents)}
                      </span>
                    </div>
                    {vacio ? null : (
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-text-muted">{t("report.income")}</dt>
                          <dd className="tabular-nums">{dinero(m.ingresosCents)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">{t("report.fixed")}</dt>
                          <dd className="tabular-nums">{dinero(m.fijosCents)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">{t("report.variable")}</dt>
                          <dd className="tabular-nums">{dinero(m.variablesCents)}</dd>
                        </div>
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-6">

          <section className={`${sectionCardClass} p-0!`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              {t("report.byPerson")}
            </h2>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[24rem] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 text-left font-medium">{t("report.person")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.income")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.expenses")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("report.savings")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("report.leftOver")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.personas.map((p) => (
                    <tr key={p.memberId || "conjunto"} className="border-t border-line">
                      <td
                        className={`px-4 py-2 font-medium capitalize ${
                          p.memberId ? colorMiembro(miembros, p.memberId).texto : "text-text-muted"
                        }`}
                      >
                        {p.memberId ? p.nombre : t("report.joint")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{dinero(p.ingresosCents)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{dinero(p.gastosCents)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-sage">
                        {dinero(p.ahorroCents)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold tabular-nums ${
                          p.memberId && p.sobranteCents < 0 ? "text-rust-text" : "text-text"
                        }`}
                      >
                        {p.memberId ? formatearCentavos(p.sobranteCents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line sm:hidden">
              {reporte.personas.map((p) => (
                <li key={p.memberId || "conjunto"} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`font-medium capitalize ${
                        p.memberId ? colorMiembro(miembros, p.memberId).texto : "text-text-muted"
                      }`}
                    >
                      {p.memberId ? p.nombre : t("report.joint")}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        p.memberId && p.sobranteCents < 0 ? "text-rust-text" : "text-text"
                      }`}
                    >
                      {p.memberId ? formatearCentavos(p.sobranteCents) : "—"}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-text-muted">{t("report.income")}</dt>
                      <dd className="tabular-nums">{dinero(p.ingresosCents)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">{t("report.expenses")}</dt>
                      <dd className="tabular-nums">{dinero(p.gastosCents)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">{t("report.savings")}</dt>
                      <dd className="tabular-nums text-sage">{dinero(p.ahorroCents)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2 text-xs text-text-muted">
              {t("report.jointNote")}
            </p>
          </section>

          <section className={`${sectionCardClass} p-0!`}>
            <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-sm font-semibold text-text">
              {t("report.extraordinary")}
              <span className="text-rust-text">{formatearCentavos(totalExtraordinarios)}</span>
            </h2>

            {reporte.extraordinarios.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-text-muted">
                {t("report.noVariable", { year })}
              </p>
            ) : (
              <ul>
                {reporte.extraordinarios.map((e, i) => (
                  <li
                    key={`${e.fecha}-${e.nombre}-${i}`}
                    className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0"
                  >
                    <div className="flex min-w-0 items-baseline gap-3">
                      <span className="w-14 shrink-0 text-xs text-text-muted">
                        {fechaCorta(e.fecha, t.locale)}
                      </span>
                      <span className="truncate text-sm text-text">{e.nombre}</span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
                      {formatearCentavos(e.montoCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
          </div>
        </>
      ) : null}
    </Pagina>
  );
}
