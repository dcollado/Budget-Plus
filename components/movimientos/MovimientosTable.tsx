"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import type { Movimiento, TipoMovimiento } from "@/lib/movimientos-store";
import type { Deuda } from "@/lib/deudas";
import EditarMovimientoModal from "@/components/movimientos/EditarMovimientoModal";

const MOVIMIENTOS_POR_CARGA = 10;

type Props = {
  movimientos: Movimiento[];
  deudas?: Deuda[];
  loading?: boolean;
  eliminandoId?: string | null;
  onEliminar?: (id: string) => Promise<void> | void;
  onMovimientoActualizado?: (movimiento: Movimiento) => void;
  onDeudaActualizada?: (deuda: Deuda) => void;
};

function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";

  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatFecha(fecha: string): string {
  if (!fecha) return "Sin fecha";

  const [anio, mes, dia] = fecha.split("-").map(Number);

  if (!anio || !mes || !dia) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}

export default function MovimientosTable({
  movimientos,
  deudas = [],
  loading = false,
  eliminandoId = null,
  onEliminar,
  onMovimientoActualizado,
  onDeudaActualizada,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [montoMinimo, setMontoMinimo] = useState("");
  const [montoMaximo, setMontoMaximo] = useState("");
  const [tipo, setTipo] = useState<"" | TipoMovimiento>("");
  const [cantidadVisible, setCantidadVisible] = useState(
    MOVIMIENTOS_POR_CARGA
  );
  const [editando, setEditando] = useState<Movimiento | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");
    const minimo = montoMinimo === "" ? null : Number(montoMinimo);
    const maximo = montoMaximo === "" ? null : Number(montoMaximo);

    return [...movimientos]
      .filter((movimiento) => {
        const contenido = [
          movimiento.descripcion,
          movimiento.categoria,
          movimiento.notas,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es");

        const monto = Math.abs(Number(movimiento.monto) || 0);

        const coincideTexto =
          !texto || contenido.includes(texto);

        const coincideTipo =
          !tipo || movimiento.tipo === tipo;

        const coincideDesde =
          !fechaDesde || movimiento.fecha >= fechaDesde;

        const coincideHasta =
          !fechaHasta || movimiento.fecha <= fechaHasta;

        const coincideMinimo =
          minimo === null ||
          Number.isNaN(minimo) ||
          monto >= minimo;

        const coincideMaximo =
          maximo === null ||
          Number.isNaN(maximo) ||
          monto <= maximo;

        return (
          coincideTexto &&
          coincideTipo &&
          coincideDesde &&
          coincideHasta &&
          coincideMinimo &&
          coincideMaximo
        );
      })
      .sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha < b.fecha ? 1 : -1;
        }

        return a.id < b.id ? 1 : -1;
      });
  }, [
    busqueda,
    fechaDesde,
    fechaHasta,
    montoMaximo,
    montoMinimo,
    movimientos,
    tipo,
  ]);

  const movimientosVisibles = movimientosFiltrados.slice(
    0,
    cantidadVisible
  );

  const hayMas =
    cantidadVisible < movimientosFiltrados.length;

  const hayFiltros = Boolean(
    busqueda ||
      fechaDesde ||
      fechaHasta ||
      montoMinimo ||
      montoMaximo ||
      tipo
  );

  useEffect(() => {
    setCantidadVisible(MOVIMIENTOS_POR_CARGA);
  }, [
    busqueda,
    fechaDesde,
    fechaHasta,
    montoMinimo,
    montoMaximo,
    tipo,
    movimientos.length,
  ]);

  useEffect(() => {
    const loader = loaderRef.current;

    if (!loader || !hayMas) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setCantidadVisible((actual) =>
          Math.min(
            actual + MOVIMIENTOS_POR_CARGA,
            movimientosFiltrados.length
          )
        );
      },
      {
        rootMargin: "200px",
      }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [hayMas, movimientosFiltrados.length]);

  function limpiarFiltros() {
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setMontoMinimo("");
    setMontoMaximo("");
    setTipo("");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface-raised p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <label className="lg:col-span-4">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Buscar
            </span>

            <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/20 hover:border-gold/60">
              <Search size={18} className="shrink-0 text-text-muted" />

              <input
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Descripción, categoría o nota"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-text outline-none placeholder:text-text-muted"
              />
            </span>
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Tipo
            </span>

            <div className="relative">
              <select
                value={tipo}
                onChange={(event) =>
                  setTipo(
                    event.target.value as "" | TipoMovimiento
                  )
                }
                className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2.5 pr-9 text-sm text-text outline-none transition hover:border-gold focus:border-gold focus:ring-4 focus:ring-gold/20"
              >
                <option value="">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="gasto">Gastos</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Desde
            </span>

            <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/20 hover:border-gold/60">
              <CalendarDays size={18} className="shrink-0 text-text-muted" />

              <input
                type="date"
                value={fechaDesde}
                max={fechaHasta || undefined}
                onChange={(event) =>
                  setFechaDesde(event.target.value)
                }
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-text outline-none"
              />
            </span>
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Hasta
            </span>

            <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/20 hover:border-gold/60">
              <CalendarDays size={18} className="shrink-0 text-text-muted" />

              <input
                type="date"
                value={fechaHasta}
                min={fechaDesde || undefined}
                onChange={(event) =>
                  setFechaHasta(event.target.value)
                }
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-text outline-none"
              />
            </span>
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Monto mínimo
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={montoMinimo}
              onChange={(event) =>
                setMontoMinimo(event.target.value)
              }
              placeholder="0.00"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-muted"
            />
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Monto máximo
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={montoMaximo}
              onChange={(event) =>
                setMontoMaximo(event.target.value)
              }
              placeholder="Sin límite"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-muted"
            />
          </label>

          <div className="flex items-end lg:col-span-6">
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-text-muted transition hover:border-gold/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={18} />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <p>
          {loading
            ? "Cargando movimientos..."
            : `${movimientosFiltrados.length} resultado${
                movimientosFiltrados.length === 1 ? "" : "s"
              }`}
        </p>

        {!loading && movimientosFiltrados.length > 0 ? (
          <p>
            Mostrando {movimientosVisibles.length} de{" "}
            {movimientosFiltrados.length}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center text-sm text-text-muted">
          Cargando...
        </div>
      ) : movimientos.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center text-sm text-text-muted">
          Todavía no hay movimientos para este período.
        </div>
      ) : movimientosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center text-sm text-text-muted">
          No encontramos movimientos con esos filtros.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface-raised md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">
                    Fecha
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Descripción
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Categoría
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Monto
                  </th>

                  <th className="w-20 px-4 py-3">
                    <span className="sr-only">
                      Acciones
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {movimientosVisibles.map((movimiento) => {
                  const monto =
                    Number(movimiento.monto) || 0;

                  const esIngreso =
                    movimiento.tipo === "ingreso";

                  return (
                    <tr
                      key={movimiento.id}
                      className="border-b border-line last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-text-muted">
                        {formatFecha(movimiento.fecha)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              esIngreso
                                ? "bg-sage-soft text-sage"
                                : "bg-rust-soft text-rust"
                            }`}
                          >
                            {esIngreso ? (
                              <ArrowUpRight size={14} />
                            ) : (
                              <ArrowDownRight size={14} />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="font-medium text-text">
                              {movimiento.descripcion ||
                                "Sin descripción"}
                            </p>

                            {movimiento.notas ? (
                              <p className="mt-0.5 truncate text-xs text-text-muted">
                                {movimiento.notas}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-text-muted">
                        {movimiento.categoria ||
                          "Sin categoría"}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-medium ${
                          esIngreso
                            ? "text-sage"
                            : "text-rust"
                        }`}
                      >
                        {formatMoney(
                          esIngreso ? monto : -monto
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditando(movimiento)}
                            className="rounded-full p-2 text-text-muted transition hover:bg-surface-raised hover:text-gold"
                            aria-label={`Editar ${
                              movimiento.descripcion || "movimiento"
                            }`}
                          >
                            <Pencil size={16} />
                          </button>

                          {onEliminar ? (
                            <button
                              type="button"
                              onClick={() =>
                                onEliminar(movimiento.id)
                              }
                              disabled={
                                eliminandoId === movimiento.id
                              }
                              className="rounded-full p-2 text-text-muted transition hover:bg-rust-soft hover:text-rust disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Eliminar ${
                                movimiento.descripcion ||
                                "movimiento"
                              }`}
                            >
                              {eliminandoId ===
                              movimiento.id ? (
                                <span className="text-xs">
                                  ...
                                </span>
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {movimientosVisibles.map((movimiento) => {
              const monto =
                Number(movimiento.monto) || 0;

              const esIngreso =
                movimiento.tipo === "ingreso";

              return (
                <article
                  key={movimiento.id}
                  className="rounded-2xl border border-line bg-surface-raised p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        esIngreso
                          ? "bg-sage-soft text-sage"
                          : "bg-rust-soft text-rust"
                      }`}
                    >
                      {esIngreso ? (
                        <ArrowUpRight size={18} />
                      ) : (
                        <ArrowDownRight size={18} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-text">
                            {movimiento.descripcion ||
                              "Sin descripción"}
                          </h3>

                          <p className="mt-1 text-xs text-text-muted">
                            {formatFecha(
                              movimiento.fecha
                            )}{" "}
                            ·{" "}
                            {movimiento.categoria ||
                              "Sin categoría"}
                          </p>
                        </div>

                        <p
                          className={`whitespace-nowrap font-mono text-sm font-medium ${
                            esIngreso
                              ? "text-sage"
                              : "text-rust"
                          }`}
                        >
                          {formatMoney(
                            esIngreso ? monto : -monto
                          )}
                        </p>
                      </div>

                      {movimiento.notas ? (
                        <p className="mt-2 text-xs text-text-muted">
                          {movimiento.notas}
                        </p>
                      ) : null}

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditando(movimiento)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted transition hover:bg-surface hover:text-gold"
                        >
                          <Pencil size={16} />
                          Editar
                        </button>

                        {onEliminar ? (
                          <button
                            type="button"
                            onClick={() =>
                              onEliminar(movimiento.id)
                            }
                            disabled={
                              eliminandoId === movimiento.id
                            }
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-rust transition hover:bg-rust-soft disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={18} />

                            {eliminandoId ===
                            movimiento.id
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {hayMas ? (
            <div
              ref={loaderRef}
              className="py-4 text-center"
            >
              <button
                type="button"
                onClick={() =>
                  setCantidadVisible((actual) =>
                    Math.min(
                      actual +
                        MOVIMIENTOS_POR_CARGA,
                      movimientosFiltrados.length
                    )
                  )
                }
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-text-muted transition hover:border-gold/50 hover:text-text"
              >
                Cargar 10 más
              </button>
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-text-muted">
              Llegaste al final.
            </p>
          )}
        </>
      )}

      {editando ? (
        <EditarMovimientoModal
          movimiento={editando}
          deudas={deudas}
          onClose={() => setEditando(null)}
          onGuardado={(movimientoActualizado, deudaActualizada) => {
            onMovimientoActualizado?.(movimientoActualizado);
            if (deudaActualizada) {
              onDeudaActualizada?.(deudaActualizada);
            }
          }}
        />
      ) : null}
    </section>
  );
}
