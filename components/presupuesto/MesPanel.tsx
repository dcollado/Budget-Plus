"use client";

import { useState } from "react";
import FilaCompacta from "@/components/presupuesto/FilaCompacta";
import FilaAporteProyecto from "@/components/presupuesto/FilaAporteProyecto";
import AgregarCategoria from "@/components/presupuesto/AgregarCategoria";
import type { AporteProyectoMes, usePresupuestoMes } from "@/lib/household/usePresupuestoMes";
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
  ancho = false,
}: {
  label: string;
  valor: number;
  color: string;
  // Ocupa las dos columnas (cuando queda un widget solo en su fila).
  ancho?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface px-3 py-2.5 ${ancho ? "col-span-2" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
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
    members,
    modificarCategoria,
    aportesProyecto,
    setAportesProyecto,
    yo,
  } = datos;
  const [ocupadoAporte, setOcupadoAporte] = useState(false);
  const [errorAporte, setErrorAporte] = useState("");

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
  // Lo que se aparta para proyectos ese mes (todas las personas): ya salió del flujo.
  const ahorroProyectos = aportesProyecto.reduce((total, a) => total + a.montoCents, 0);
  const porGastar = ingresos - totalFijos - totalVariables - ahorroProyectos;

  // Marcar un aporte como hecho actualiza lo apartado del proyecto.
  async function marcarAporte(aporte: AporteProyectoMes, hecho: boolean) {
    setOcupadoAporte(true);
    setErrorAporte("");

    try {
      const res = await fetch("/api/hogar/proyectos/aporte", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: aporte.projectId, mes: month, hecho }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(t.msg(data.message, "common.saveError"));
      }

      setAportesProyecto((actuales) =>
        actuales.map((a) =>
          a.projectId === aporte.projectId && a.memberId === aporte.memberId ? { ...a, hecho } : a
        )
      );
    } catch (err) {
      setErrorAporte(err instanceof Error ? err.message : t("common.savingError"));
    } finally {
      setOcupadoAporte(false);
    }
  }

  return (
    <section className="min-w-0">
      <h2 className="mb-3 font-serif text-xl font-semibold capitalize text-text">
        {formatearMes(month, t.locale)}
      </h2>

      {error ? (
        <div className="mb-3 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Widget label={t("report.income")} valor={ingresos} color="text-sage" />
        <Widget label={t("report.fixedExpenses")} valor={totalFijos} color="text-text" />
        <Widget label={t("month.variableExpenses")} valor={totalVariables} color="text-rust-text" />
        {ahorroProyectos > 0 ? (
          <Widget label={t("month.projectSavings")} valor={ahorroProyectos} color="text-gold" />
        ) : null}
        <Widget
          label={t("month.leftToSpend")}
          valor={porGastar}
          color={porGastar < 0 ? "text-rust-text" : "text-sage"}
          ancho={ahorroProyectos > 0}
        />
      </div>

      <div className={`${sectionCardClass} p-0!`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-text">{t("month.extra")}</h3>
          <div className="flex flex-wrap gap-2">
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
              members={members}
              onDueno={(id, ownerMemberId) => modificarCategoria(id, { ownerMemberId })}
            />
          ))
        )}
      </div>

      {aportesProyecto.length > 0 ? (
        <div className={`${sectionCardClass} mt-4 p-0!`}>
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-text">{t("month.projects")}</h3>
          </div>
          {aportesProyecto.map((a) => (
            <FilaAporteProyecto
              key={`${a.projectId}:${a.memberId}`}
              aporte={a}
              members={members}
              esMio={a.memberId === yo}
              ocupado={ocupadoAporte}
              onMarcar={(aporte, hecho) => void marcarAporte(aporte, hecho)}
            />
          ))}
          {errorAporte ? <p className="px-4 pb-2 text-xs text-rust-text">{errorAporte}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
