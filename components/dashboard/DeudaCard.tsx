"use client";

import { useState } from "react";
import { Landmark, CreditCard, Car, Pencil, ChevronDown } from "lucide-react";
import type { Deuda, TipoDeuda } from "@/lib/deudas";
import { getProgreso, mesesRestantes } from "@/lib/deudas";

const iconoPorTipo: Record<TipoDeuda, typeof Landmark> = {
  prestamo: Landmark,
  tarjeta: CreditCard,
  generico: Car,
};

const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatFechaLarga(fecha: string | undefined): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  return `${d} ${meses[m - 1]} ${y}`;
}

type DeudaCardProps = {
  deuda: Deuda;
  onEdit: () => void;
};

export default function DeudaCard({ deuda, onEdit }: DeudaCardProps) {
  const [bancoAbierto, setBancoAbierto] = useState(false);
  const [tarjetaAbierto, setTarjetaAbierto] = useState(false);

  const Icon = iconoPorTipo[deuda.tipo];
  const { total, pagado } = getProgreso(deuda);
  const tieneDetalleBancario = deuda.montoDesembolsado != null;
  const tieneDetalleTarjeta = deuda.membresiaAnual != null;

  const saldoRestante = tieneDetalleBancario
    ? deuda.saldoTotal ?? deuda.saldoActual ?? 0
    : Math.max(total - pagado, 0);
  const pct = total > 0 ? Math.min((pagado / total) * 100, 100) : 0;
  const restantes = tieneDetalleBancario ? mesesRestantes(deuda.fechaVencimiento) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-full bg-gold-soft p-1.5 text-gold">
            <Icon size={14} />
          </span>
          <span className="text-sm font-medium text-text">{deuda.label}</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-xs text-text-muted transition hover:border-gold hover:text-gold"
        >
          <Pencil size={11} /> Editar
        </button>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg font-semibold text-text">
          {formatMoney(pagado)}
        </span>
        <span className="font-mono text-xs text-text-muted">
          pagado de {formatMoney(total)}
        </span>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-surface-raised">
        <div
          className="h-2.5 rounded-full bg-gold"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Saldo restante: <span className="font-mono">{formatMoney(saldoRestante)}</span>
        </span>
        <span>
          Pago mensual: <span className="font-mono">{formatMoney(deuda.pagoMensual)}</span>
        </span>
      </div>

      {deuda.tasaInteres != null ? (
        <div className="text-xs text-text-muted">
          Tasa de interés: <span className="font-mono">{deuda.tasaInteres}% anual</span>
        </div>
      ) : null}

      {tieneDetalleBancario ? (
        <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised p-3">
          <button
            type="button"
            onClick={() => setBancoAbierto((v) => !v)}
            className="flex items-center justify-between gap-2 text-left"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Detalle del banco
            </span>
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform ${
                bancoAbierto ? "rotate-180" : ""
              }`}
            />
          </button>
          {bancoAbierto ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-text-muted">Desembolsado</span>
              <span className="text-right font-mono text-text">
                {formatMoney(deuda.montoDesembolsado ?? 0)}
              </span>

              <span className="text-text-muted">Fecha de desembolso</span>
              <span className="text-right font-mono text-text">
                {formatFechaLarga(deuda.fechaDesembolso)}
              </span>

              <span className="text-text-muted">Primer pago</span>
              <span className="text-right font-mono text-text">
                {formatFechaLarga(deuda.fechaPrimerPago)}
              </span>

              <span className="text-text-muted">Vencimiento</span>
              <span className="text-right font-mono text-text">
                {formatFechaLarga(deuda.fechaVencimiento)}
              </span>

              <span className="text-text-muted">Plazo</span>
              <span className="text-right font-mono text-text">
                {deuda.plazoMeses} meses
              </span>

              {restantes != null ? (
                <>
                  <span className="text-text-muted">Meses restantes</span>
                  <span className="text-right font-mono text-text">{restantes}</span>
                </>
              ) : null}

              <span className="text-text-muted">Saldo actual (capital)</span>
              <span className="text-right font-mono text-text">
                {formatMoney(deuda.saldoActual ?? 0)}
              </span>

              <span className="text-text-muted">Saldo total (con intereses y cargos)</span>
              <span className="text-right font-mono text-text">
                {formatMoney(deuda.saldoTotal ?? 0)}
              </span>

              <span className="text-text-muted">Cargos pagados</span>
              <span className="text-right font-mono text-text">{deuda.cargosPagados}</span>

              <span className="text-text-muted">Cargos pendientes</span>
              <span className="text-right font-mono text-text">{deuda.cargosPendientes}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {tieneDetalleTarjeta ? (
        <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-line bg-surface-raised p-3">
          <button
            type="button"
            onClick={() => setTarjetaAbierto((v) => !v)}
            className="flex items-center justify-between gap-2 text-left"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Detalle de la tarjeta
            </span>
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform ${
                tarjetaAbierto ? "rotate-180" : ""
              }`}
            />
          </button>
          {tarjetaAbierto ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {deuda.limiteCredito != null ? (
                <>
                  <span className="text-text-muted">Límite de crédito</span>
                  <span className="text-right font-mono text-text">
                    {formatMoney(deuda.limiteCredito)}
                  </span>

                  <span className="text-text-muted">Disponible</span>
                  <span className="text-right font-mono text-text">
                    {formatMoney(
                      Math.max(deuda.limiteCredito - (deuda.totalAPagar - deuda.totalPagado), 0)
                    )}
                  </span>
                </>
              ) : null}

              {deuda.saldoHeredado != null && deuda.saldoHeredado > 0 ? (
                <>
                  <span className="text-text-muted">Saldo heredado pendiente</span>
                  <span className="text-right font-mono text-gold">
                    {formatMoney(deuda.saldoHeredado)}
                  </span>
                </>
              ) : null}

              <span className="text-text-muted">Tasa por adelantos/quasi-cash</span>
              <span className="text-right font-mono text-text">
                {deuda.tasaInteresAdelantos}% anual
              </span>

              <span className="text-text-muted">Membresía anual</span>
              <span className="text-right font-mono text-text">
                {formatMoney(deuda.membresiaAnual ?? 0)}
              </span>

              <span className="text-text-muted">Pago mínimo</span>
              <span className="text-right font-mono text-text">
                {deuda.pagoMinimoPorcentaje}%, mín. {formatMoney(deuda.pagoMinimoMonto ?? 0)}
              </span>

              <span className="text-text-muted">Cargo por pago atrasado</span>
              <span className="text-right font-mono text-text">
                {formatMoney(deuda.cargoPagoAtrasado ?? 0)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {deuda.nota ? (
        <p className="text-xs italic text-text-muted">{deuda.nota}</p>
      ) : null}
    </div>
  );
}
