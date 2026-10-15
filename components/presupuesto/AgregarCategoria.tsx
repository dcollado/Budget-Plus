"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryKind } from "@/lib/household/schema";
import { fechaDelDia, type CategoriaDelMes } from "@/lib/household/presupuesto";
import { fieldBaseClass, fieldNormalClass, helperTextClass, labelClass } from "@/lib/ui";
import type { CuentaHogar, MiembroHogar } from "@/lib/household/usePresupuestoMes";
import { nombreMiembro } from "@/components/presupuesto/EtiquetaDueno";
import { Modal } from "@/components/modal";
import { useT } from "@/lib/i18n/client";

type Props = {
  kind: CategoryKind;
  month: string;
  onAgregado: (item: CategoriaDelMes) => void;
  // false (default) = variable item for this month, with an exact date.
  // true = fixed category (Settings), with a day of the month that carries over.
  fixed?: boolean;
  // "cta" = primary button (page toolbar); "boton" = compact pill, for a
  // section header; "mini" = just "+ Add", for tight card headers.
  variant?: "cta" | "boton" | "mini";
  // If passed (Settings), shows an expense owner selector.
  members?: MiembroHogar[];
  // Owner selected when the form opens (e.g. the signed-in member).
  defaultOwner?: string;
  // Variable expense: selector for which account it goes to (informational only).
  cuentas?: CuentaHogar[];
};

// Botón que abre un modal para crear una categoría (fija o variable) con su
// monto del mes. El botón vive arriba de la lista; el formulario, en el modal.
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
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [dia, setDia] = useState("");
  const [dueno, setDueno] = useState(defaultOwner ?? "");
  const [cuentaId, setCuentaId] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [anio, mes] = month.split("-").map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const esIngreso = kind === "income";
  const conCuentas = !fixed && !esIngreso && cuentas && cuentas.length > 0;
  const conDueno = Boolean(members && members.length > 0);

  // El aviso de "agregado" se va solo.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  function abrir() {
    setNombre("");
    setMonto("");
    setFecha("");
    setDia("");
    setDueno(defaultOwner ?? "");
    setCuentaId("");
    setNota("");
    setError("");
    setAviso("");
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setError("");
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setError(t("cat.giveName"));
      return;
    }

    const plannedAmountCents = Math.round(Number(monto || 0) * 100);

    // A variable item with no amount does not appear in the list (only those
    // with something that month are listed), so creating it empty makes no sense.
    if (!fixed && plannedAmountCents <= 0) {
      setError(t("cat.amountPositive"));
      return;
    }

    const dueDay = fixed && dia ? Number(dia) : null;

    if (fixed && dia && !(Number.isInteger(dueDay) && dueDay! >= 1 && dueDay! <= 31)) {
      setError(t("cat.dayRange"));
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const resCategoria = await fetch("/api/hogar/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nombre.trim(),
          kind,
          fixed,
          dueDay,
          ownerMemberId: dueno,
        }),
      });

      const dataCategoria = await resCategoria.json();

      if (!resCategoria.ok || !dataCategoria.success) {
        throw new Error(t.msg(dataCategoria.message, "cat.createError"));
      }

      let category = dataCategoria.data;

      if (cuentaId) {
        const resCuenta = await fetch("/api/hogar/categorias", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: category.id, cuentaId }),
        });
        const dataCuenta = await resCuenta.json();
        if (!resCuenta.ok || !dataCuenta.success) {
          throw new Error(t.msg(dataCuenta.message, "common.saveAccountError"));
        }
        category = { ...category, cuentaId };
      }

      if (plannedAmountCents > 0) {
        const resMonto = await fetch("/api/hogar/presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: category.id,
            month,
            amount: monto,
            ...(fixed ? {} : { dueDate: fecha, nota }),
          }),
        });

        const dataMonto = await resMonto.json();

        if (!resMonto.ok || !dataMonto.success) {
          throw new Error(t.msg(dataMonto.message, "cat.saveAmountError"));
        }
      }

      onAgregado({
        category,
        plannedAmountCents,
        inherited: false,
        actualCents: 0,
        fechaPago: fixed ? fechaDelDia(month, dueDay) : fecha,
        nota: fixed ? "" : nota.trim(),
        pagado: false,
      });

      setAviso(t("cat.added", { name: nombre.trim() }));
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cat.addError"));
    } finally {
      setGuardando(false);
    }
  }

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
      : variant === "mini"
        ? "inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-gold px-2.5 py-1 text-xs font-semibold text-ink transition hover:brightness-110"
        : `inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition hover:border-gold/50 ${
            esIngreso ? "text-sage" : "text-rust"
          }`;

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={abrir}
          className={botonClase}
          aria-label={etiqueta}
          title={etiqueta}
        >
          <Plus size={variant === "cta" ? 16 : 13} />
          {variant === "mini" ? t("common.add") : etiqueta}
        </button>
        {aviso ? (
          <span role="status" className="text-xs font-medium text-sage">
            {aviso}
          </span>
        ) : null}
      </span>

      <Modal abierto={abierto} onCerrar={cerrar} titulo={etiqueta}>
        <form onSubmit={agregar} className="space-y-4">
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
              autoFocus
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="cat-monto">
                {t("row.amount")}
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
                  {t("cat.fieldDay")}
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

          {fixed ? <p className={`${helperTextClass} -mt-2`}>{t("cat.dayHint")}</p> : null}

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
            <p role="alert" className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? t("common.saving") : t("common.add")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
