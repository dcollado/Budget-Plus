"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { categoriasFactura, categoriasIngreso } from "@/lib/facturas";
import type { Movimiento, TipoMovimiento, MetodoPago } from "@/lib/movimientos-store";
import type { Deuda } from "@/lib/deudas";
import {
  fieldBaseClass,
  fieldNormalClass,
  labelClass,
} from "@/lib/ui";

type Props = {
  tipoInicial: TipoMovimiento;
  deudas: Deuda[];
  onClose: () => void;
  onAdded: (movimiento: Movimiento) => void;
  onDeudaActualizada: (deuda: Deuda) => void;
};

export default function QuickAddModal({
  tipoInicial,
  deudas,
  onClose,
  onAdded,
  onDeudaActualizada,
}: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoInicial);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [deudaId, setDeudaId] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [tarjetaCompraId, setTarjetaCompraId] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const categorias = tipo === "gasto" ? categoriasFactura : categoriasIngreso;
  const esPagoDeuda = tipo === "gasto" && deudaId !== "";
  const deudaSeleccionada = deudas.find((d) => d.id === deudaId) || null;
  const tarjetas = deudas.filter((d) => d.tipo === "tarjeta");
  const esCompraConTarjeta = tipo === "gasto" && !esPagoDeuda && metodoPago === "tarjeta";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!monto || Number(monto) <= 0) {
      setError("El monto debe ser mayor que cero.");
      return;
    }

    if (esPagoDeuda) {
      setGuardando(true);
      try {
        const res = await fetch("/api/pagos-deuda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deudaId,
            monto,
            fecha,
            descripcion: descripcion.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "No se pudo registrar el pago.");
        }
        onAdded(data.data.movimiento as Movimiento);
        onDeudaActualizada(data.data.deuda as Deuda);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error guardando.");
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (!descripcion.trim()) {
      setError("Escribe una descripción.");
      return;
    }
    if (!categoria) {
      setError("Selecciona una categoría.");
      return;
    }

    if (esCompraConTarjeta) {
      if (!tarjetaCompraId) {
        setError("Selecciona con qué tarjeta se hizo la compra.");
        return;
      }

      setGuardando(true);
      try {
        const res = await fetch("/api/compras-tarjeta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deudaId: tarjetaCompraId,
            monto,
            categoria,
            descripcion: descripcion.trim(),
            fecha,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "No se pudo registrar la compra.");
        }
        onAdded(data.data.movimiento as Movimiento);
        onDeudaActualizada(data.data.deuda as Deuda);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error guardando.");
      } finally {
        setGuardando(false);
      }
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          tipo,
          monto,
          categoria,
          descripcion: descripcion.trim(),
          origen: "variable",
          notas: "",
          metodoPago: tipo === "gasto" ? metodoPago : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar el movimiento.");
      }
      onAdded(data.data as Movimiento);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error guardando.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Agregar movimiento</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:text-gold">
            <X size={18} />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            onClick={() => {
              setTipo("gasto");
              setCategoria("");
              setDeudaId("");
              setMetodoPago("efectivo");
              setTarjetaCompraId("");
            }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tipo === "gasto" ? "bg-rust-soft text-rust" : "text-text-muted"
            }`}
          >
            Gasto
          </button>
          <button
            type="button"
            onClick={() => {
              setTipo("ingreso");
              setCategoria("");
              setDeudaId("");
              setMetodoPago("efectivo");
              setTarjetaCompraId("");
            }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tipo === "ingreso" ? "bg-sage-soft text-sage" : "text-text-muted"
            }`}
          >
            Ingreso
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tipo === "gasto" && deudas.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Tipo de gasto</label>
              <div className="relative">
                <select
                  value={deudaId}
                  onChange={(e) => {
                    setDeudaId(e.target.value);
                    setCategoria("");
                    setMetodoPago("efectivo");
                    setTarjetaCompraId("");
                  }}
                  className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9 text-text`}
                >
                  <option value="">Gasto misceláneo</option>
                  {deudas.map((d) => (
                    <option key={d.id} value={d.id}>
                      Pago: {d.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>
          ) : null}

          {tipo === "gasto" && !esPagoDeuda ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Método de pago</label>
              <div className="relative">
                <select
                  value={metodoPago}
                  onChange={(e) => {
                    setMetodoPago(e.target.value as MetodoPago);
                    setTarjetaCompraId("");
                  }}
                  className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9 text-text`}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="debito">Débito</option>
                  {tarjetas.length > 0 ? <option value="tarjeta">Tarjeta de crédito</option> : null}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>
          ) : null}

          {esCompraConTarjeta ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>¿Con qué tarjeta?</label>
              <div className="relative">
                <select
                  value={tarjetaCompraId}
                  onChange={(e) => setTarjetaCompraId(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9 ${
                    tarjetaCompraId ? "text-text" : "text-text-muted"
                  }`}
                >
                  <option value="">Selecciona</option>
                  {tarjetas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Descripción {esPagoDeuda ? "(opcional)" : ""}
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                esPagoDeuda
                  ? `Pago: ${deudaSeleccionada?.label ?? ""}`
                  : tipo === "gasto"
                  ? "Ej. Farmacia"
                  : "Ej. Proyecto extra"
              }
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`${fieldBaseClass} ${fieldNormalClass} font-mono`}
              />
            </div>

            {!esPagoDeuda ? (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Categoría</label>
                <div className="relative">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className={`${fieldBaseClass} ${fieldNormalClass} appearance-none pr-9 ${
                      categoria ? "text-text" : "text-text-muted"
                    }`}
                  >
                    <option value="">Selecciona</option>
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Categoría</label>
                <div className={`${fieldBaseClass} border-line bg-surface-raised text-text-muted`}>
                  Deuda
                </div>
              </div>
            )}
          </div>

          {error ? <p className="text-xs text-rust">{error}</p> : null}

          <button
            type="submit"
            disabled={guardando}
            className={`mt-1 rounded-xl py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
              tipo === "gasto" ? "bg-rust" : "bg-sage"
            }`}
          >
            {guardando
              ? "Guardando..."
              : esPagoDeuda
              ? "Registrar pago"
              : esCompraConTarjeta
              ? "Registrar compra"
              : `Agregar ${tipo === "gasto" ? "gasto" : "ingreso"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
