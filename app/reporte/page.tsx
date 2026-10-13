"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import { formatearCentavos } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";
import { colorMiembro } from "@/components/presupuesto/EtiquetaDueno";
import type { ReporteAnual } from "@/lib/household/reporte";

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function nombreMes(month: string): string {
  const [anio, mes] = month.split("-").map(Number);
  const texto = new Date(Date.UTC(anio, mes - 1, 1)).toLocaleDateString("es", {
    month: "long",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const dinero = (cents: number) => (cents === 0 ? "—" : formatearCentavos(cents));

function Tarjeta({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${color}`}>{formatearCentavos(valor)}</p>
    </div>
  );
}

export default function ReportePage() {
  const [year, setYear] = useState(() => Number(mesActualISO().slice(0, 4)));
  const [reporte, setReporte] = useState<ReporteAnual | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    fetch(`/api/hogar/reporte?year=${year}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { data?: ReporteAnual; message?: string };
        if (!vigente) return;
        if (!res.ok || !json.data) throw new Error(json.message ?? "No se pudo cargar el reporte.");
        setReporte(json.data);
        setError("");
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
      });

    return () => {
      vigente = false;
    };
  }, [year]);

  const actual = mesActualISO();
  const cargando = reporte === null || reporte.year !== year;

  // Para reutilizar la paleta de colores por persona.
  const miembros = (reporte?.personas ?? [])
    .filter((p) => p.memberId)
    .map((p) => ({ id: p.memberId, displayName: p.nombre, color: p.color }));

  const totalExtraordinarios = (reporte?.extraordinarios ?? []).reduce(
    (t, e) => t + e.montoCents,
    0
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold">Reporte</p>
          <h1 className="font-serif text-3xl font-semibold text-text">Resumen del año</h1>
          <p className="mt-1 text-sm text-text-muted">
            Sale del plan del hogar: lo que está presupuestado, no lo gastado de verdad.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Año anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-text"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-16 text-center text-sm font-semibold text-text">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Año siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-text"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      {cargando && !error ? (
        <p className="py-8 text-center text-sm text-text-muted">Cargando…</p>
      ) : null}

      {reporte && !cargando ? (
        <>
          {reporte.categoriasAhorro === 0 ? (
            <div className={`${sectionCardClass} flex items-start gap-3`}>
              <PiggyBank size={20} className="mt-0.5 shrink-0 text-sage" />
              <p className="text-sm text-text-muted">
                Todavía no marcaste qué gastos fijos son <span className="text-text">ahorro</span>.
                En{" "}
                <Link href="/configuracion" className="text-gold underline">
                  Cuentas y gastos fijos
                </Link>{" "}
                toca la alcancía de cada uno (Ahorros, Emergencias…) y aquí verás cuánto apartan.
              </p>
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Tarjeta label="Ingresos" valor={reporte.totales.ingresosCents} color="text-sage" />
            <Tarjeta label="Gastos fijos" valor={reporte.totales.fijosCents} color="text-text" />
            <Tarjeta label="Variables" valor={reporte.totales.variablesCents} color="text-rust" />
            <Tarjeta label="Ahorro" valor={reporte.totales.ahorroCents} color="text-sage" />
            <Tarjeta
              label="Sobrante"
              valor={reporte.totales.sobranteCents}
              color={reporte.totales.sobranteCents < 0 ? "text-rust" : "text-sage"}
            />
          </section>

          <section className={`${sectionCardClass} p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Mes por mes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 text-left font-medium">Mes</th>
                    <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                    <th className="px-3 py-2 text-right font-medium">Fijos</th>
                    <th className="px-3 py-2 text-right font-medium">Variables</th>
                    <th className="px-3 py-2 text-right font-medium">Ahorro</th>
                    <th className="px-4 py-2 text-right font-medium">Sobrante</th>
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
                          {nombreMes(m.month)}
                          {esActual ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase text-gold">
                              hoy
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
                            vacio ? "" : m.sobranteCents < 0 ? "text-rust" : "text-sage"
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
          </section>

          <section className={`${sectionCardClass} p-0`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Por persona (año)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 text-left font-medium">Persona</th>
                    <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                    <th className="px-3 py-2 text-right font-medium">Gastos</th>
                    <th className="px-3 py-2 text-right font-medium">Ahorro</th>
                    <th className="px-4 py-2 text-right font-medium">Sobrante</th>
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
                        {p.nombre}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{dinero(p.ingresosCents)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{dinero(p.gastosCents)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-sage">
                        {dinero(p.ahorroCents)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold tabular-nums ${
                          p.memberId && p.sobranteCents < 0 ? "text-rust" : "text-text"
                        }`}
                      >
                        {p.memberId ? formatearCentavos(p.sobranteCents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2 text-xs text-text-muted">
              «Conjunto» son los gastos e ingresos sin dueño asignado; se restan del total del hogar,
              por eso no tienen sobrante propio.
            </p>
          </section>

          <section className={`${sectionCardClass} p-0`}>
            <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-sm font-semibold text-text">
              Gastos extraordinarios
              <span className="text-rust">{formatearCentavos(totalExtraordinarios)}</span>
            </h2>

            {reporte.extraordinarios.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-text-muted">
                No hay gastos variables cargados en {year}.
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
                        {fechaCorta(e.fecha)}
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
        </>
      ) : null}
    </main>
  );
}
