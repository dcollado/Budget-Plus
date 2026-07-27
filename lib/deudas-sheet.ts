import type { Deuda, TipoDeuda } from "@/lib/deudas";

export const DEUDAS_SHEET = "Deudas";
// A:Y — se mantiene el mismo ancho aunque tarjeta ya no se use, para no
// correr el índice de usuarioId (columna W / índice 22), que varias
// rutas usan para verificar dueño. Las columnas que eran de tarjeta
// (X17-U21, límite y saldo heredado en X-Y) quedan vacías.
export const DEUDAS_RANGE = `${DEUDAS_SHEET}!A:Y`;

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
  const tipo: TipoDeuda = tipoRaw === "prestamo" ? tipoRaw : "generico";

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
    // Columnas 16-20 y 23-24 eran de tarjeta — ya no se leen.
    nota: row[21] ?? "",
    usuarioId: row[22] ?? "",
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
    // Columnas 16-20: antes detalle de tarjeta, ahora vacías.
    "",
    "",
    "",
    "",
    "",
    deuda.nota ?? "",
    deuda.usuarioId,
    // Columnas 23-24: antes límite/saldo heredado de tarjeta, ahora vacías.
    "",
    "",
  ];
}
