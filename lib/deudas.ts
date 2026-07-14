export type TipoDeuda = "prestamo" | "tarjeta" | "generico";

export type Deuda = {
  id: string;
  tipo: TipoDeuda;
  label: string;
  pagoMensual: number;
  tasaInteres: number | null;
  nota: string;
  totalAPagar: number;
  totalPagado: number;
  // Detalle bancario (solo prestamo)
  montoDesembolsado?: number | null;
  fechaDesembolso?: string;
  fechaPrimerPago?: string;
  fechaVencimiento?: string;
  plazoMeses?: number | null;
  saldoActual?: number | null;
  saldoTotal?: number | null;
  cargosPagados?: number | null;
  cargosPendientes?: number | null;
  // Detalle de tarjeta (solo tarjeta)
  tasaInteresAdelantos?: number | null;
  membresiaAnual?: number | null;
  pagoMinimoPorcentaje?: number | null;
  pagoMinimoMonto?: number | null;
  cargoPagoAtrasado?: number | null;
};

// Progreso real: si hay detalle bancario (desembolso + saldo actual), se deriva
// de ahí en vez de depender de un total/pagado cargado a mano.
export function getProgreso(deuda: Deuda): { total: number; pagado: number } {
  if (deuda.montoDesembolsado != null && deuda.saldoActual != null) {
    return {
      total: deuda.montoDesembolsado,
      pagado: deuda.montoDesembolsado - deuda.saldoActual,
    };
  }
  return { total: deuda.totalAPagar, pagado: deuda.totalPagado };
}

export function mesesRestantes(fechaFin: string | undefined | null): number | null {
  if (!fechaFin) return null;
  const hoy = new Date();
  const fin = new Date(`${fechaFin}T00:00:00`);
  let diffMeses =
    (fin.getFullYear() - hoy.getFullYear()) * 12 + (fin.getMonth() - hoy.getMonth());
  if (fin.getDate() < hoy.getDate()) diffMeses -= 1;
  return Math.max(diffMeses, 0);
}

/**
 * Aplica un pago a una deuda y devuelve la deuda actualizada. No muta el
 * objeto original.
 *
 * - Si la deuda tiene detalle bancario (montoDesembolsado + saldoActual,
 *   hoy solo el préstamo), el pago reduce el saldo actual (capital) y el
 *   saldo total, ya que el progreso de esas deudas se deriva de ahí
 *   (ver getProgreso). totalAPagar/totalPagado quedan sin tocar porque
 *   son solo el respaldo que se usa cuando NO hay detalle bancario.
 * - Si no tiene detalle bancario (tarjeta, auto, genéricas), el pago
 *   aumenta totalPagado directamente, que es lo que usa getProgreso en
 *   ese caso.
 */
export function aplicarPago(deuda: Deuda, monto: number): Deuda {
  const tieneDetalleBancario = deuda.montoDesembolsado != null && deuda.saldoActual != null;

  if (tieneDetalleBancario) {
    const saldoActual = Math.max((deuda.saldoActual ?? 0) - monto, 0);
    const saldoTotal =
      deuda.saldoTotal != null ? Math.max(deuda.saldoTotal - monto, 0) : deuda.saldoTotal;

    return { ...deuda, saldoActual, saldoTotal };
  }

  const totalPagado = Math.min(deuda.totalPagado + monto, deuda.totalAPagar);
  return { ...deuda, totalPagado };
}
