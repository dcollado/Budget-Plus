"use client";

import { formatearCentavos } from "@/lib/household/formato";
import { useT } from "@/lib/i18n/client";

// Una sola plantilla de columnas para el encabezado, las filas y el pie de la
// tabla de fijos: nombre | monto del mes | día de pago | acciones. Así los
// títulos y la suma caen siempre justo sobre sus campos.
// En el celular no caben cuatro columnas: cada fila pone el nombre arriba y los
// campos debajo, y los rótulos de las columnas solo salen desde `sm`.
export const COLUMNAS_FIJOS = "sm:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_5.25rem]";

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
    <div className={`grid grid-cols-1 ${COLUMNAS_FIJOS} items-end gap-2 border-b border-line px-3 py-2.5`}>
      <h2 className={`min-w-0 break-words text-sm font-semibold ${claseTitulo}`}>{titulo}</h2>
      <span className="hidden text-right text-xs uppercase tracking-wide text-text-muted sm:block">
        {t("settings.amountMonth")}
      </span>
      <span
        className="hidden whitespace-nowrap text-center text-xs uppercase tracking-wide text-text-muted sm:block"
        title={t("settings.paymentDay")}
      >
        {t("settings.dayShort")}
      </span>
      <span className="hidden sm:block" />
    </div>
  );
}

// Suma del mes, justo debajo de la columna de montos.
export function PieTablaFijos({ totalCents, verde = false }: { totalCents: number; verde?: boolean }) {
  const t = useT();

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] ${COLUMNAS_FIJOS} items-center gap-2 border-t border-line bg-surface-raised/40 px-3 py-2.5`}
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
      <span className="hidden sm:block" />
      <span className="hidden sm:block" />
    </div>
  );
}
