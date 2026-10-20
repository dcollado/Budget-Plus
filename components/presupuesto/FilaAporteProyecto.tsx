"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import EtiquetaDueno from "@/components/presupuesto/EtiquetaDueno";
import { formatearCentavos } from "@/lib/household/formato";
import type { AporteProyectoMes, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import { useT } from "@/lib/i18n/client";

// Lo que una persona aparta ese mes para un proyecto. Es de solo lectura: el
// monto se define en Proyectos. Solo quien aporta puede marcarlo como hecho
// (ya lo apartó), y eso actualiza lo apartado del proyecto.
export default function FilaAporteProyecto({
  aporte,
  members,
  esMio,
  ocupado,
  onMarcar,
}: {
  aporte: AporteProyectoMes;
  members: MiembroHogar[];
  esMio: boolean;
  ocupado: boolean;
  onMarcar: (aporte: AporteProyectoMes, hecho: boolean) => void;
}) {
  const t = useT();
  const etiqueta = aporte.hecho ? t("month.markSavedUndone") : t("month.markSavedDone");

  return (
    <div className="border-b border-line px-4 py-2 last:border-0">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          disabled={!esMio || ocupado}
          onClick={() => onMarcar(aporte, !aporte.hecho)}
          aria-pressed={aporte.hecho}
          aria-label={etiqueta}
          title={esMio ? etiqueta : t("month.onlyOwnerMarks")}
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
