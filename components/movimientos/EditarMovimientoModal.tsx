"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { categoriasFactura, categoriasIngreso } from "@/lib/facturas";
import type { Movimiento, TipoMovimiento } from "@/lib/movimientos-store";
import type { Deuda } from "@/lib/deudas";
import { fieldBaseClass, fieldNormalClass, labelClass } from "@/lib/ui";

type Props = {
  movimiento: Movimiento;
  deudas: Deuda[];
  onClose: () => void;
  onGuardado: (movimiento: Movimiento, deuda: Deuda | null) => void;
};

const ORIGEN_LABEL: Record<string, string> = {
  variable: "Cargado a mano",
  factura: "Factura escaneada",
  fijo: "Ítem fijo",
  deuda: "Pago de deuda",
  tarjeta: "Compra con tarjeta",
};

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  tarjeta: "Tarjeta de crédito",
};

export default function EditarMovimientoModal({
  movimiento,
  deudas,
  onClose,
  onGuardado,
}: Props) {
  const origenBloqueado =
    movimiento.origen === "fijo" ||
    movimiento.origen === "deuda" ||
    movimiento.origen === "tarjeta";

  const [fecha, setFecha] = useState(movimiento.fecha);
  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento.tipo);
  const [monto, setMonto] = useState(String(movimiento.monto));
  const [categoria, setCategoria] = useState(movimiento.categoria);
  const [descripcion, setDescripcion] = useState(movimiento.descripcion);
  const [notas, setNotas] = useState(movimiento.notas ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const categorias = tipo === "gasto" ? categoriasFactura : categoriasIngreso;
  const deudaVinculada = movimiento.deudaId
    ? deudas.find((d) => d.id === movimiento.deudaId) ?? null
    : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setError("El monto debe ser mayor que cero.");
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

    setGuardando(true);
    try {
      const res = await fetch(`/api/movimientos?id=${encodeURIComponent(movimiento.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          tipo,
          monto,
          categoria,
          descripcion: descripcion.trim(),
          notas: notas.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar el movimiento.");
      }
      onGuardado(data.data.movimiento as Movimiento, (data.data.deuda as Deuda) ?? null);
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
          <h2 className="text-lg font-semibold text-text">Editar movimiento</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:text-gold">
            <X size={18} />
          </button>
        </div>

        {/* Detalle — información de contexto, no editable */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised p-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">Origen</span>
            <span className="text-text">
              {ORIGEN_LABEL[movimiento.origen] ?? movimiento.origen}
              {deudaVinculada ? ` — ${deudaVinculada.label}` : ""}
            </span>
          </div>
          {movimiento.metodoPago ? (
            <div className="flex justify-between gap-3">
              <span className="text-text-muted">Método de pago</span>
              <span className="text-text">
                {METODO_PAGO_LABEL[movimiento.metodoPago] ?? movimiento.metodoPago}
              </span>
            </div>
          ) : null}
          {movimiento.numeroFactura ? (
            <div className="flex justify-between gap-3">
              <span className="text-text-muted">N° de factura</span>
              <span className="text-text">{movimiento.numeroFactura}</span>
            </div>
          ) : null}
          {movimiento.ruc ? (
            <div className="flex justify-between gap-3">
              <span className="text-text-muted">RUC</span>
              <span className="text-text">{movimiento.ruc}</span>
            </div>
          ) : null}
        </div>

        {origenBloqueado ? (
          <p className="rounded-xl border border-gold/30 bg-gold-soft px-3 py-2 text-xs text-gold">
            El tipo y la categoría no se pueden cambiar acá porque vienen de{" "}
            {ORIGEN_LABEL[movimiento.origen]?.toLowerCase()}. La fecha, el monto, la
            descripción y las notas sí.
            {movimiento.origen === "deuda" || movimiento.origen === "tarjeta"
              ? " Si cambiás el monto, el saldo de la deuda se ajusta solo."
              : ""}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            <label className={labelClass}>Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
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
                className={`${fieldBaseClass} ${fieldNormalClass} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Categoría</label>
              {origenBloqueado ? (
                <div className={`${fieldBaseClass} border-line bg-surface-raised text-text-muted`}>
                  {categoria || "Sin categoría"}
                </div>
              ) : (
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass} appearance-none text-text`}
                >
                  <option value="">Selecciona</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {!origenBloqueado ? (
            <div className="flex overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => {
                  setTipo("gasto");
                  setCategoria("");
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
                }}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  tipo === "ingreso" ? "bg-sage-soft text-sage" : "text-text-muted"
                }`}
              >
                Ingreso
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Notas (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>

          {error ? <p className="text-xs text-rust">{error}</p> : null}

          <button
            type="submit"
            disabled={guardando}
            className="mt-1 rounded-xl bg-gold py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
