"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryKind } from "@/lib/household/schema";
import type { CategoriaDelMes } from "@/lib/household/presupuesto";
import type { CuentaHogar, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import CategoriaModal from "@/components/presupuesto/CategoriaModal";
import { useT } from "@/lib/i18n/client";

type Props = {
  kind: CategoryKind;
  month: string;
  onAgregado: (item: CategoriaDelMes) => void;
  // false (default) = variable item for this month, with an exact date.
  // true = fixed category (Settings), with a day of the month that carries over.
  fixed?: boolean;
  // "cta" = primary button (page toolbar); "boton" = compact pill, for a
  // section header; "fila" = a quiet row at the bottom of a list.
  variant?: "cta" | "boton" | "fila";
  // If passed (Settings), shows an owner selector.
  members?: MiembroHogar[];
  // Owner selected when the form opens (e.g. the signed-in member).
  defaultOwner?: string;
  // Variable expense: selector for which account it goes to (informational only).
  cuentas?: CuentaHogar[];
};

// Botón que abre el modal para crear un ítem (fijo o variable) con su monto del
// mes. El botón vive junto a la lista; el formulario, en el modal.
export default function AgregarCategoria({
  kind,
  month,
  onAgregado,
  fixed = false,
  variant = "cta",
  members,
  defaultOwner,
  cuentas,
}: Props) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState("");

  const esIngreso = kind === "income";

  // El aviso de "agregado" se va solo.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  const etiqueta = fixed
    ? esIngreso
      ? t("cat.addFixedIncome")
      : t("cat.addFixedExpense")
    : esIngreso
      ? t("cat.variableIncome")
      : t("cat.variableExpense");

  const botonClase =
    variant === "cta"
      ? "inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
      : variant === "fila"
        ? "flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-muted transition hover:text-gold"
        : `inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition hover:border-gold/50 ${
            esIngreso ? "text-sage" : "text-rust"
          }`;

  return (
    <>
      <span className={variant === "fila" ? "block" : "inline-flex flex-wrap items-center gap-3"}>
        <button type="button" onClick={() => setAbierto(true)} className={botonClase}>
          <Plus size={variant === "cta" ? 16 : 14} />
          {etiqueta}
        </button>
        {aviso ? (
          <span role="status" className="px-4 text-xs font-medium text-sage">
            {aviso}
          </span>
        ) : null}
      </span>

      <CategoriaModal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        kind={kind}
        month={month}
        fixed={fixed}
        members={members}
        defaultOwner={defaultOwner}
        cuentas={cuentas}
        onAgregado={(item) => {
          onAgregado(item);
          setAviso(t("cat.added", { name: item.category.name }));
        }}
      />
    </>
  );
}
