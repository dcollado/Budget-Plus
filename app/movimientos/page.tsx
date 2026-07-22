"use client";

import { useEffect, useMemo, useState } from "react";
import type { Movimiento } from "@/lib/movimientos-store";
import type { Deuda } from "@/lib/deudas";
import MovimientosTable from "@/components/movimientos/MovimientosTable";

const mesesCompletos = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function periodoInicial(): string {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  const indice = Number(mes) - 1;

  if (!anio || indice < 0 || indice > 11) {
    return periodo;
  }

  return `${mesesCompletos[indice]} ${anio}`;
}

export default function MovimientosPage() {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const etiqueta = useMemo(() => etiquetaPeriodo(periodo), [periodo]);

  async function cargarDeudas() {
    try {
      const respuesta = await fetch("/api/deudas", { cache: "no-store" });
      const data = await respuesta.json();
      if (respuesta.ok && data.success) {
        setDeudas(data.data ?? []);
      }
    } catch (err) {
      console.error("Error cargando deudas:", err);
    }
  }

  async function cargarMovimientos() {
    setLoading(true);
    setError("");

    try {
      const respuesta = await fetch(
        `/api/movimientos?periodo=${encodeURIComponent(periodo)}`,
        {
          cache: "no-store",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.success) {
        throw new Error(
          data.message || "No se pudieron cargar los movimientos."
        );
      }

      setMovimientos(data.data ?? []);
    } catch (err) {
      console.error("Error cargando movimientos:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error cargando los movimientos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarMovimientos();
    void cargarDeudas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function eliminarMovimiento(id: string) {
    const movimiento = movimientos.find((item) => item.id === id);

    const confirmado = window.confirm(
      `¿Eliminar "${
        movimiento?.descripcion || "este movimiento"
      }"? Esta acción no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }

    setEliminandoId(id);
    setError("");

    try {
      const respuesta = await fetch(
        `/api/movimientos?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.success) {
        throw new Error(
          data.message || "No se pudo eliminar el movimiento."
        );
      }

      setMovimientos((actuales) =>
        actuales.filter(
          (movimientoActual) => movimientoActual.id !== id
        )
      );
    } catch (err) {
      console.error("Error eliminando movimiento:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error eliminando el movimiento."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  function handleMovimientoActualizado(movimiento: Movimiento) {
    setMovimientos((actuales) =>
      actuales.map((item) => (item.id === movimiento.id ? movimiento : item))
    );
  }

  function handleDeudaActualizada(deuda: Deuda) {
    setDeudas((actuales) =>
      actuales.map((item) => (item.id === deuda.id ? deuda : item))
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Historial</p>

          <h1 className="font-display text-3xl font-semibold text-text">
            Movimientos
          </h1>

          <p className="mt-1 text-sm capitalize text-text-muted">
            {etiqueta}
          </p>
        </div>

        <label>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Período
          </span>

          <input
            type="month"
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
            className="rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-sm text-text outline-none"
          />
        </label>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      <MovimientosTable
        movimientos={movimientos}
        deudas={deudas}
        loading={loading}
        eliminandoId={eliminandoId}
        onEliminar={eliminarMovimiento}
        onMovimientoActualizado={handleMovimientoActualizado}
        onDeudaActualizada={handleDeudaActualizada}
      />
    </main>
  );
}