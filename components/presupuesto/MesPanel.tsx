"use client";

import FilaCompacta from "@/components/presupuesto/FilaCompacta";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import type { usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
import { ordenarPorFecha } from "@/lib/household/presupuesto";
import { formatearCentavos, formatearMes } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";
import { nombreMiembro } from "@/components/presupuesto/EtiquetaDueno";

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
  const {
    items,
    members,
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

  // Variables: solo lo que se cargó para este mes (gastos e ingresos
  // juntos, ordenados por fecha). Las categorías variables viejas en $0
  // (Restaurantes, etc.) no se listan.
  const variables = ordenarPorFecha(
    items.filter((i) => !i.category.fixed && i.plannedAmountCents > 0)
  );
  const gastosVariables = variables.filter((i) => i.category.kind === "expense");
  const ingresosVariables = variables.filter((i) => i.category.kind === "income");

  const ingresos = suma(ingresosFijos) + suma(ingresosVariables);
  const totalFijos = suma(gastosFijos);
  const totalVariables = suma(gastosVariables);
  const porGastar = ingresos - totalFijos - totalVariables;

  // Subtotal de fijos por persona (y "Conjunto" si hay alguno sin dueño).
  const fijosPorDueno = [
    ...members.map((m) => ({
      nombre: nombreMiembro(members, m.id),
      total: suma(gastosFijos.filter((i) => i.category.ownerMemberId === m.id)),
    })),
    {
      nombre: "Conjunto",
      total: suma(gastosFijos.filter((i) => !i.category.ownerMemberId)),
    },
  ].filter((d) => d.total > 0);

  return (
    <section className="min-w-0">
      <h2 className="mb-3 font-serif text-xl font-semibold capitalize text-text">
        {formatearMes(month)}
      </h2>

      {error ? (
        <div className="mb-3 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Widget label="Ingresos" valor={ingresos} color="text-sage" />
        <Widget label="Gastos fijos" valor={totalFijos} color="text-text" />
        <Widget label="Gastos variables" valor={totalVariables} color="text-rust" />
        <Widget
          label="Por gastar"
          valor={porGastar}
          color={porGastar < 0 ? "text-rust" : "text-sage"}
        />
      </div>

      <div className={`${sectionCardClass} p-0`}>
        <h3 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">
          Variables del mes
        </h3>

        {cargando ? (
          <p className="px-4 py-4 text-center text-sm text-text-muted">Cargando...</p>
        ) : variables.length === 0 ? (
          <p className="px-4 py-4 text-center text-sm text-text-muted">
            Nada cargado todavía para este mes.
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

      {/* Fijos: solo el total y el balance por persona. El detalle ítem por
          ítem vive en Configuración, y el cuadro de transferencias va arriba
          de todo en la página. */}
      <div className={`${sectionCardClass} mt-4 p-0`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Gastos fijos</h3>
          <span className="text-sm font-semibold text-text">
            {formatearCentavos(totalFijos)}
          </span>
        </div>

        {fijosPorDueno.length > 0 ? (
          <p className="border-t border-line px-4 py-2 text-xs text-text-muted">
            {fijosPorDueno.map((d) => `${d.nombre} ${formatearCentavos(d.total)}`).join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
