"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import EtiquetaDueno from "@/components/presupuesto/EtiquetaDueno";
import { formatearCentavos } from "@/lib/household/formato";
import type { AporteProyectoMes, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import { useT } from "@/lib/i18n/client";

// Lo que una persona aparta ese mes para un proyecto. El monto se define en
// Proyectos. Cualquier persona del hogar puede marcarlo como hecho o confirmar
// la sugerencia (como todo en el presupuesto), y eso actualiza lo apartado del
// proyecto.
export default function FilaAporteProyecto({
  aporte,
  members,
  ocupado,
  onMarcar,
  onConfirmar,
}: {
  aporte: AporteProyectoMes;
  members: MiembroHogar[];
  ocupado: boolean;
  onMarcar: (aporte: AporteProyectoMes, hecho: boolean) => void;
  onConfirmar: (aporte: AporteProyectoMes) => void;
}) {
  const t = useT();
  const etiqueta = aporte.hecho ? t("month.markSavedUndone") : t("month.markSavedDone");

  // Solo la sugerencia del mes: se ve la meta, pero no cuenta hasta confirmarla.
  if (aporte.sugerido) {
    return (
      <div className="border-b border-line px-4 py-2 last:border-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <Link href="/proyectos" className="truncate text-sm text-text transition hover:text-gold">
              {aporte.projectName}
            </Link>
            <EtiquetaDueno ownerMemberId={aporte.memberId} members={members} />
            <span className="text-xs text-gold">{t("month.suggested")}</span>
          </span>
          <span className="whitespace-nowrap text-sm font-medium text-text-muted">
            {formatearCentavos(aporte.montoCents)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-muted">{t("month.suggestedHint")}</p>
                    <button
            type="button"
            disabled={ocupado}
            onClick={() => onConfirmar(aporte)}
            className="rounded-lg bg-gold/15 px-3 py-1 text-xs font-semibold text-gold transition hover:bg-gold/25 disabled:opacity-60"
          >
            {t("month.confirmSaving")}
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-line px-4 py-2 last:border-0">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onMarcar(aporte, !aporte.hecho)}
          aria-pressed={aporte.hecho}
          aria-label={etiqueta}
          title={etiqueta}
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition disabled:cursor-not-allowed ${
            aporte.hecho
              ? "border-sage bg-sage/20 text-sage"
              : "border-line text-transparent enabled:hover:border-sage enabled:hover:text-sage/60"
          }`}
        >
          <Check size={13} strokeWidth={3} />
        </button>

        <span className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/proyectos"
            className={`truncate text-sm transition hover:text-gold ${
              aporte.hecho ? "text-text-muted line-through" : "text-text"
            }`}
          >
            {aporte.projectName}
          </Link>
          <EtiquetaDueno ownerMemberId={aporte.memberId} members={members} />
        </span>

        <span
          className={`whitespace-nowrap text-sm font-medium ${aporte.hecho ? "text-text-muted" : "text-text"}`}
        >
          {formatearCentavos(aporte.montoCents)}
        </span>
      </div>
    </div>
  );
}
