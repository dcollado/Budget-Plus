import type { Deuda, TipoDeuda } from "@/lib/deudas";

export const DEUDAS_SHEET = "Deudas";
// A:V — 22 columnas, ver IMPLEMENTACION.md sección 2 para el layout completo.
export const DEUDAS_RANGE = `${DEUDAS_SHEET}!A:V`;

function numOrNull(valor: string | undefined): number | null {
  const trimmed = (valor ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function numOrZero(valor: string | undefined): number {
  const trimmed = (valor ?? "").trim();
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

export function buildDeuda(row: string[]): Deuda {
  const tipoRaw = row[1] ?? "generico";
  const tipo: TipoDeuda =
    tipoRaw === "prestamo" || tipoRaw === "tarjeta" ? tipoRaw : "generico";

  return {
    id: row[0] ?? "",
    tipo,
    label: row[2] ?? "",
    pagoMensual: numOrZero(row[3]),
    tasaInteres: numOrNull(row[4]),
    totalAPagar: numOrZero(row[5]),
    totalPagado: numOrZero(row[6]),
    montoDesembolsado: numOrNull(row[7]),
    fechaDesembolso: row[8] ?? "",
    fechaPrimerPago: row[9] ?? "",
    fechaVencimiento: row[10] ?? "",
    plazoMeses: numOrNull(row[11]),
    saldoActual: numOrNull(row[12]),
    saldoTotal: numOrNull(row[13]),
    cargosPagados: numOrNull(row[14]),
    cargosPendientes: numOrNull(row[15]),
    tasaInteresAdelantos: numOrNull(row[16]),
    membresiaAnual: numOrNull(row[17]),
    pagoMinimoPorcentaje: numOrNull(row[18]),
    pagoMinimoMonto: numOrNull(row[19]),
    cargoPagoAtrasado: numOrNull(row[20]),
    nota: row[21] ?? "",
  };
}

export function deudaToRow(deuda: Deuda): (string | number)[] {
  return [
    deuda.id,
    deuda.tipo,
    deuda.label,
    deuda.pagoMensual,
    deuda.tasaInteres ?? "",
    deuda.totalAPagar,
    deuda.totalPagado,
    deuda.montoDesembolsado ?? "",
    deuda.fechaDesembolso ?? "",
    deuda.fechaPrimerPago ?? "",
    deuda.fechaVencimiento ?? "",
    deuda.plazoMeses ?? "",
    deuda.saldoActual ?? "",
    deuda.saldoTotal ?? "",
    deuda.cargosPagados ?? "",
    deuda.cargosPendientes ?? "",
    deuda.tasaInteresAdelantos ?? "",
    deuda.membresiaAnual ?? "",
    deuda.pagoMinimoPorcentaje ?? "",
    deuda.pagoMinimoMonto ?? "",
    deuda.cargoPagoAtrasado ?? "",
    deuda.nota ?? "",
  ];
}
