"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CategoryKind } from "@/lib/household/schema";
import type { Category } from "@/lib/household/schema";
import { fechaDelDia, segundaFecha, type CategoriaDelMes } from "@/lib/household/presupuesto";
import { formatearCentavos } from "@/lib/household/formato";
import { fieldBaseClass, fieldNormalClass, helperTextClass, labelClass } from "@/lib/ui";
import type { CuentaHogar, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import { nombreMiembro } from "@/components/presupuesto/EtiquetaDueno";
import { Modal } from "@/components/modal";
import { useT } from "@/lib/i18n/client";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  kind: CategoryKind;
  month: string;
  // false = ítem variable del mes (con fecha exacta); true = fija (Configuración).
  fixed: boolean;
  members?: MiembroHogar[];
  // Dueño preseleccionado al agregar (p. ej. quien tiene la sesión).
  defaultOwner?: string;
  // Gasto variable: a qué cuenta va (solo informativo).
  cuentas?: CuentaHogar[];
  // Si viene, el modal edita esta categoría fija en vez de crear una nueva.
  editar?: CategoriaDelMes | null;
  onAgregado?: (item: CategoriaDelMes) => void;
  onModificada?: (
    categoryId: string,
    cambios: Partial<Category>,
    plannedAmountCents: number
  ) => void;
};

const aCentavos = (texto: string) => Math.round(Number(texto || 0) * 100);

// Crear o editar un ítem (fijo o variable). Para los fijos muestra, en vivo, el
// total del mes y cómo se reparte entre los pagos.
export default function CategoriaModal({
  abierto,
  onCerrar,
  kind,
  month,
  fixed,
  members,
  defaultOwner,
  cuentas,
  editar,
  onAgregado,
  onModificada,
}: Props) {
  const t = useT();
  const esEdicion = Boolean(editar);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [dia, setDia] = useState("");
  const [quincenal, setQuincenal] = useState(false);
  const [dia2, setDia2] = useState("31");
  const [dueno, setDueno] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [nota, setNota] = useState("");
  const [ahorro, setAhorro] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const esIngreso = kind === "income";
  const conCuentas = !fixed && !esIngreso && cuentas && cuentas.length > 0;
  const conDueno = Boolean(members && members.length > 0);
  const conAhorro = fixed && !esIngreso;

  // Al abrir: valores de la categoría que se edita, o los iniciales.
  useEffect(() => {
    if (!abierto) return;

    setError("");
    setGuardando(false);

    if (editar) {
      const c = editar.category;
      const dos = c.quincenal;
      setNombre(c.name);
      setQuincenal(dos);
      setMonto(String(editar.plannedAmountCents / 100 / (dos ? 2 : 1)));
      setDia(c.dueDay ? String(c.dueDay) : "");
      setDia2(c.dueDay2 ? String(c.dueDay2) : "31");
      setDueno(c.ownerMemberId);
      setAhorro(c.ahorro);
      setFecha(editar.fechaPago);
      setNota(editar.nota);
      setCuentaId(c.cuentaId);
    } else {
      setNombre("");
      setMonto("");
      setFecha("");
      setDia("");
      setQuincenal(false);
      setDia2("31");
      setDueno(defaultOwner ?? "");
      setAhorro(false);
      setNota("");
      setCuentaId("");
    }
  }, [abierto, editar, defaultOwner]);

  const dosPagos = fixed && quincenal;
  const porPagoCents = aCentavos(monto);
  const totalCents = porPagoCents * (dosPagos ? 2 : 1);

  const textoDia = (valor: string) => {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1) return "—";
    return n === 31 ? t("cat.lastDay") : t("cat.dayN", { n });
  };

  async function guardar(e: FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setError(t("cat.giveName"));
      return;
    }

    // Un ítem variable sin monto no aparece en la lista del mes.
    if (!fixed && totalCents <= 0) {
      setError(t("cat.amountPositive"));
      return;
    }

    const dueDay = fixed && dia ? Number(dia) : null;

    if (fixed && dia && !(Number.isInteger(dueDay) && dueDay! >= 1 && dueDay! <= 31)) {
      setError(t("cat.dayRange"));
      return;
    }

    const dueDay2 = dosPagos ? Number(dia2) : null;

    if (dosPagos) {
      const ok = (n: number | null) => n !== null && Number.isInteger(n) && n >= 1 && n <= 31;
      if (!ok(dueDay) || !ok(dueDay2)) {
        setError(t("cat.twiceDays"));
        return;
      }
      if (dueDay === dueDay2) {
        setError(t("cat.twiceDifferent"));
        return;
      }
    }

    setGuardando(true);
    setError("");

    try {
      if (editar) {
        const id = editar.category.id;

        const resCategoria = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name: nombre.trim(),
            ownerMemberId: dueno,
            quincenal: dosPagos,
            dueDay,
            dueDay2,
            ...(conAhorro ? { ahorro } : {}),
          }),
        });
        const dataCategoria = await resCategoria.json();

        if (!resCategoria.ok || !dataCategoria.success) {
          throw new Error(t.msg(dataCategoria.message, "common.saveError"));
        }

        if (totalCents !== editar.plannedAmountCents) {
          const resMonto = await fetch("/api/hogar/presupuesto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: id, month, amount: String(totalCents / 100) }),
          });
          const dataMonto = await resMonto.json();

          if (!resMonto.ok || !dataMonto.success) {
            throw new Error(t.msg(dataMonto.message, "cat.saveAmountError"));
          }
        }

        onModificada?.(
          id,
          {
            name: nombre.trim(),
            ownerMemberId: dueno,
            quincenal: dosPagos,
            dueDay,
            dueDay2,
            ...(conAhorro ? { ahorro } : {}),
          },
          totalCents
        );
        onCerrar();
        return;
      }

      // ---- crear ----
      const resCategoria = await fetch("/api/hogar/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nombre.trim(),
          kind,
          fixed,
          dueDay,
          quincenal: dosPagos,
          dueDay2,
          ownerMemberId: dueno,
        }),
      });

      const dataCategoria = await resCategoria.json();

      if (!resCategoria.ok || !dataCategoria.success) {
        throw new Error(t.msg(dataCategoria.message, "cat.createError"));
      }

      let category = dataCategoria.data;

      if (cuentaId || (conAhorro && ahorro)) {
        const resExtra = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: category.id,
            ...(cuentaId ? { cuentaId } : {}),
            ...(conAhorro && ahorro ? { ahorro: true } : {}),
          }),
        });
        const dataExtra = await resExtra.json();
        if (!resExtra.ok || !dataExtra.success) {
          throw new Error(t.msg(dataExtra.message, "common.saveAccountError"));
        }
        category = { ...category, ...(cuentaId ? { cuentaId } : {}), ahorro: conAhorro && ahorro };
      }

      if (totalCents > 0) {
        const resMonto = await fetch("/api/hogar/presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: category.id,
            month,
            amount: String(totalCents / 100),
            ...(fixed ? {} : { dueDate: fecha, nota }),
          }),
        });

        const dataMonto = await resMonto.json();

        if (!resMonto.ok || !dataMonto.success) {
          throw new Error(t.msg(dataMonto.message, "cat.saveAmountError"));
        }
      }

      onAgregado?.({
        category,
        plannedAmountCents: totalCents,
        inherited: false,
        actualCents: 0,
        fechaPago: fixed ? fechaDelDia(month, dueDay) : fecha,
        fechaPago2: fixed ? segundaFecha({ ...category, quincenal: dosPagos, dueDay2 }, month) : "",
        nota: fixed ? "" : nota.trim(),
        pagado: false,
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cat.addError"));
    } finally {
      setGuardando(false);
    }
  }

  const titulo = esEdicion
    ? esIngreso
      ? t("cat.editFixedIncome")
      : t("cat.editFixedExpense")
    : fixed
      ? esIngreso
        ? t("cat.addFixedIncome")
        : t("cat.addFixedExpense")
      : esIngreso
        ? t("cat.variableIncome")
        : t("cat.variableExpense");

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="cat-nombre">
            {t("cat.fieldName")}
          </label>
          <input
            id="cat-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={fixed ? t("cat.exampleFixed") : t("cat.exampleVariable")}
            maxLength={80}
            required
            autoFocus={!esEdicion}
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>

        {fixed ? (
          <div>
            <label className={labelClass} htmlFor="cat-frecuencia">
              {t("cat.fieldFrequency")}
            </label>
            <select
              id="cat-frecuencia"
              value={quincenal ? "2" : "1"}
              onChange={(e) => {
                const dos = e.target.value === "2";
                setQuincenal(dos);
                // Al pasar a dos pagos: el monto escrito sigue siendo el total
                // del mes, repartido en dos; y días iniciales cómodos.
                if (dos) {
                  if (!dia) setDia("15");
                  if (monto) setMonto(String(Number(monto) / 2));
                } else if (monto) {
                  setMonto(String(Number(monto) * 2));
                }
              }}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            >
              <option value="1">{t("cat.freqMonthly")}</option>
              <option value="2">{t("cat.freqTwice")}</option>
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="cat-monto">
              {dosPagos
                ? t("cat.fieldAmountPerPayment")
                : fixed
                  ? t("cat.fieldAmountMonth")
                  : t("row.amount")}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                $
              </span>
              <input
                id="cat-monto"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`${fieldBaseClass} ${fieldNormalClass} pl-8`}
              />
            </div>
          </div>

          {fixed ? (
            <div>
              <label className={labelClass} htmlFor="cat-dia">
                {dosPagos ? t("cat.fieldDay1") : t("cat.fieldDay")}
              </label>
              <input
                id="cat-dia"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                placeholder="1–31"
                className={`${fieldBaseClass} ${fieldNormalClass}`}
              />
            </div>
          ) : (
            <div>
              <label className={labelClass} htmlFor="cat-fecha">
                {t("row.paymentDate")}
              </label>
              <input
                id="cat-fecha"
                type="date"
                value={fecha}
                min={`${month}-01`}
                max={`${month}-${String(ultimoDia).padStart(2, "0")}`}
                onChange={(e) => setFecha(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
              />
            </div>
          )}
        </div>

        {dosPagos ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="cat-dia2">
                {t("cat.fieldDay2")}
              </label>
              <input
                id="cat-dia2"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={dia2}
                onChange={(e) => setDia2(e.target.value)}
                placeholder="31"
                className={`${fieldBaseClass} ${fieldNormalClass}`}
              />
            </div>
            <p className={`${helperTextClass} sm:self-end sm:pb-3`}>{t("cat.dayHintTwice")}</p>
          </div>
        ) : fixed ? (
          <p className={`${helperTextClass} -mt-2`}>{t("cat.dayHint")}</p>
        ) : null}

        {fixed ? (
          <div className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm">
            <p className="font-medium text-text">
              {t("cat.summaryTotal", { total: formatearCentavos(totalCents) })}
            </p>
            {dosPagos ? (
              <p className="mt-1 text-text-muted">
                {t("cat.summaryTwice", {
                  each: formatearCentavos(porPagoCents),
                  d1: textoDia(dia),
                  d2: textoDia(dia2),
                })}
              </p>
            ) : (
              <p className="mt-1 text-text-muted">
                {dia ? t("cat.summaryOnce", { d: textoDia(dia) }) : t("cat.summaryNoDay")}
              </p>
            )}
          </div>
        ) : null}

        {conCuentas || conDueno ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {conCuentas ? (
              <div>
                <label className={labelClass} htmlFor="cat-cuenta">
                  {t("cat.fieldAccount")}
                </label>
                <select
                  id="cat-cuenta"
                  value={cuentaId}
                  onChange={(e) => setCuentaId(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass}`}
                >
                  <option value="">{t("row.noAccount")}</option>
                  {cuentas!.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {conDueno ? (
              <div>
                <label className={labelClass} htmlFor="cat-dueno">
                  {t("cat.fieldOwner")}
                </label>
                <select
                  id="cat-dueno"
                  value={dueno}
                  onChange={(e) => setDueno(e.target.value)}
                  className={`${fieldBaseClass} ${fieldNormalClass}`}
                >
                  <option value="">{t("cat.joint")}</option>
                  {members!.map((m) => (
                    <option key={m.id} value={m.id}>
                      {nombreMiembro(members!, m.id)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        {conAhorro ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3">
            <input
              type="checkbox"
              checked={ahorro}
              onChange={(e) => setAhorro(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-sage)]"
            />
            <span>
              <span className="block text-sm font-medium text-text">{t("cat.savingsLabel")}</span>
              <span className="block text-xs text-text-muted">{t("cat.savingsHint")}</span>
            </span>
          </label>
        ) : null}

        {!fixed ? (
          <div>
            <label className={labelClass} htmlFor="cat-nota">
              {t("cat.fieldNote")}
            </label>
            <input
              id="cat-nota"
              type="text"
              value={nota}
              maxLength={200}
              onChange={(e) => setNota(e.target.value)}
              placeholder={t("cat.noteExample")}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? t("common.saving") : esEdicion ? t("common.save") : t("common.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
