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
  // Límite y saldo heredado (solo tarjeta)
  limiteCredito?: number | null;
  // Saldo que ya existía antes de trackear compras una por una. Los pagos
  // siguen contando como gasto hasta cubrir exactamente este monto —
  // después, ya no (las compras nuevas generan su propio gasto cada una).
  saldoHeredado?: number | null;
  usuarioId: string;
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

/**
 * Registra una compra con tarjeta: aumenta totalAPagar (el saldo que se
 * debe crece). No toca totalPagado. Solo tiene sentido para deudas sin
 * detalle bancario (hoy, tarjeta).
 */
export function aplicarCompra(deuda: Deuda, monto: number): Deuda {
  return { ...deuda, totalAPagar: deuda.totalAPagar + monto };
}

/**
 * Pago específico de tarjeta. A diferencia de aplicarPago (que se usa
 * para préstamo/auto y siempre genera un gasto), acá el pago reduce el
 * saldo igual, pero decide cuánto de ese pago corresponde a gasto real:
 * solo la porción que todavía es "saldoHeredado" (compras de antes de
 * trackearlas una por una con /api/compras-tarjeta). Una vez que el
 * heredado llega a 0, los pagos futuros no generan gasto — las compras
 * nuevas ya lo hicieron cada una por su lado, y contar el pago también
 * sería duplicar.
 */
export function procesarPagoTarjeta(
  deuda: Deuda,
  monto: number
): { deuda: Deuda; montoGasto: number } {
  const heredadoActual = deuda.saldoHeredado ?? 0;
  const montoGasto = Math.min(monto, heredadoActual);
  const saldoHeredado = Math.max(heredadoActual - monto, 0);

  const deudaConPago = aplicarPago(deuda, monto);

  return {
    deuda: { ...deudaConPago, saldoHeredado },
    montoGasto,
  };
}

/**
 * Ajusta el saldo de una deuda cuando se edita el monto de un movimiento
 * ya existente que está ligado a ella (un pago o una compra). Aplica
 * directamente la diferencia entre el monto viejo y el nuevo — mismo
 * resultado que "deshacer y reaplicar", más simple y predecible.
 *
 * - origenMovimiento "tarjeta" (una compra): la diferencia se suma a
 *   totalAPagar (si el monto subió, se debe más; si bajó, menos).
 * - origenMovimiento "deuda" (un pago): la diferencia se aplica como si
 *   fuera un pago adicional (o negativo) — reduce/aumenta saldoActual en
 *   deudas con detalle bancario, o totalPagado en las demás.
 */
export function ajustarSaldoPorEdicion(
  deuda: Deuda,
  montoViejo: number,
  montoNuevo: number,
  origenMovimiento: "tarjeta" | "deuda"
): Deuda {
  const delta = montoNuevo - montoViejo;
  if (delta === 0) return deuda;

  if (origenMovimiento === "tarjeta") {
    return { ...deuda, totalAPagar: Math.max(deuda.totalAPagar + delta, 0) };
  }

  const tieneDetalleBancario = deuda.montoDesembolsado != null && deuda.saldoActual != null;

  if (tieneDetalleBancario) {
    const saldoActual = Math.max((deuda.saldoActual ?? 0) - delta, 0);
    const saldoTotal =
      deuda.saldoTotal != null ? Math.max(deuda.saldoTotal - delta, 0) : deuda.saldoTotal;
    return { ...deuda, saldoActual, saldoTotal };
  }

  const totalPagado = Math.min(Math.max(deuda.totalPagado + delta, 0), deuda.totalAPagar);
  return { ...deuda, totalPagado };
}
