"use client";

import { formatearCentavos } from "@/lib/household/formato";
import { useT } from "@/lib/i18n/client";

// Una sola plantilla de columnas para el encabezado, las filas y el pie de la
// tabla de fijos: nombre | monto del mes | día de pago | acciones. Así los
// títulos y la suma caen siempre justo sobre sus campos.
export const COLUMNAS_FIJOS =
  "grid-cols-[minmax(0,1fr)_5.5rem_4.25rem_5.25rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_5.25rem]";

// Título del widget y rótulos de las columnas en la misma fila.
export function EncabezadoTablaFijos({
  titulo,
  claseTitulo = "text-text",
}: {
  titulo: string;
  claseTitulo?: string;
}) {
  const t = useT();

  return (
    <div className={`grid ${COLUMNAS_FIJOS} items-end gap-2 border-b border-line px-3 py-2.5`}>
      <h2 className={`min-w-0 break-words text-sm font-semibold ${claseTitulo}`}>{titulo}</h2>
      <span className="text-right text-xs uppercase tracking-wide text-text-muted">
        {t("settings.amountMonth")}
      </span>
      <span
        className="whitespace-nowrap text-center text-xs uppercase tracking-wide text-text-muted"
        title={t("settings.paymentDay")}
      >
        {t("settings.dayShort")}
      </span>
      <span />
    </div>
  );
}

// Suma del mes, justo debajo de la columna de montos.
export function PieTablaFijos({ totalCents, verde = false }: { totalCents: number; verde?: boolean }) {
  const t = useT();

  return (
    <div
      className={`grid ${COLUMNAS_FIJOS} items-center gap-2 border-t border-line bg-surface-raised/40 px-3 py-2.5`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {t("settings.totalMonth")}
      </span>
      <span
        className={`pr-2 text-right text-sm font-semibold tabular-nums ${
          verde ? "text-sage" : "text-text"
        }`}
      >
        {formatearCentavos(totalCents)}
      </span>
      <span />
      <span />
    </div>
  );
}
