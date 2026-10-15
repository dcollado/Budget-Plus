"use client";

import FilaCompacta from "@/components/presupuesto/FilaCompacta";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import type { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { ordenarPorFecha } from "@/lib/household/presupuesto";
import { formatearCentavos, formatearMes } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

type Props = {
  month: string;
  // Los datos los carga la página (usePresupuestoMes), así el primer mes
  // se comparte con "Tus transferencias" sin pedirle dos veces a la hoja.
  datos: ReturnType<typeof usePresupuestoMes>;
};

function Widget({
  label,
  valor,
  color,
}: {
  label: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${color}`}>{formatearCentavos(valor)}</p>
    </div>
  );
}

export default function MesPanel({ month, datos }: Props) {
  const t = useT();
  const {
    items,
    cuentas,
    cargando,
    error,
    handleGuardado,
    agregarItem,
    eliminarItem,
    asignarCuenta,
  } = datos;

  const suma = (lista: typeof items) =>
    lista.reduce((total, i) => total + i.plannedAmountCents, 0);

  const gastosFijos = ordenarPorFecha(
    items.filter((i) => i.category.kind === "expense" && i.category.fixed)
  );
  const ingresosFijos = items.filter((i) => i.category.kind === "income" && i.category.fixed);

  // Variables: only what was entered for this month (expenses and income
  // together, sorted by date). Old variable categories at $0
  // (Restaurants, etc.) are not listed.
  const variables = ordenarPorFecha(
    items.filter((i) => !i.category.fixed && i.plannedAmountCents > 0)
  );
  const gastosVariables = variables.filter((i) => i.category.kind === "expense");
  const ingresosVariables = variables.filter((i) => i.category.kind === "income");

  const ingresos = suma(ingresosFijos) + suma(ingresosVariables);
  const totalFijos = suma(gastosFijos);
  const totalVariables = suma(gastosVariables);
  const porGastar = ingresos - totalFijos - totalVariables;

  return (
    <section className="min-w-0">
      <h2 className="mb-3 font-serif text-xl font-semibold capitalize text-text">
        {formatearMes(month, t.locale)}
      </h2>

      {error ? (
        <div className="mb-3 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Widget label={t("report.income")} valor={ingresos} color="text-sage" />
        <Widget label={t("report.fixedExpenses")} valor={totalFijos} color="text-text" />
        <Widget label={t("month.variableExpenses")} valor={totalVariables} color="text-rust" />
        <Widget
          label={t("month.leftToSpend")}
          valor={porGastar}
          color={porGastar < 0 ? "text-rust" : "text-sage"}
        />
      </div>

      <div className={`${sectionCardClass} p-0!`}>
        <h3 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
          {t("month.extra")}
        </h3>

        {cargando ? (
          <p className="px-4 py-4 text-center text-sm text-text-muted">{t("common.loading")}</p>
        ) : variables.length === 0 ? (
          <p className="px-4 py-4 text-center text-sm text-text-muted">
            {t("month.nothing")}
          </p>
        ) : (
          variables.map((item) => (
            <FilaCompacta
              key={item.category.id}
              item={item}
              month={month}
              onGuardado={handleGuardado}
              onEliminar={eliminarItem}
              cuentas={cuentas}
              onCuenta={asignarCuenta}
            />
          ))
        )}

        <div className="flex flex-wrap gap-2 border-t border-line p-3">
          <AgregarCategoria
            kind="expense"
            month={month}
            onAgregado={agregarItem}
            variant="boton"
            cuentas={cuentas}
          />
          <AgregarCategoria kind="income" month={month} onAgregado={agregarItem} variant="boton" />
        </div>
      </div>
    </section>
  );
}
