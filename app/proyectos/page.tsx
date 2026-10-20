"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Pagina } from "@/components/pagina";
import { InfoTip } from "@/components/info-tip";
import { Modal } from "@/components/modal";
import { formatearCentavos } from "@/lib/household/formato";
import type { ProyectoVista } from "@/lib/household/proyectos-datos";
import type { Proyecto, ProyectoItem } from "@/lib/household/schema";
import { useT } from "@/lib/i18n/client";
import { fieldBaseClass, fieldNormalClass, helperTextClass, labelClass, sectionCardClass } from "@/lib/ui";


function fechaLarga(fecha: string, locale: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function enviar(url: string, metodo: string, cuerpo?: unknown) {
  const res = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) throw new Error(json.message ?? "");
}

function Dato({
  label,
  valor,
  tono = "",
  ayuda,
}: {
  label: string;
  valor: string;
  tono?: string;
  ayuda?: ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-line bg-surface-raised px-3 py-2.5">
      <div className="flex items-center gap-1">
        <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
        {ayuda}
      </div>
      <p className={`mt-0.5 text-base font-semibold ${tono || "text-text"}`}>{valor}</p>
    </div>
  );
}

export default function ProyectosPage() {
  const t = useT();
  const [proyectos, setProyectos] = useState<ProyectoVista[] | null>(null);
  const [archivados, setArchivados] = useState<Proyecto[]>([]);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/hogar/proyectos", { cache: "no-store" });
      const json = (await res.json()) as {
        data?: { proyectos: ProyectoVista[]; archivados?: Proyecto[] };
        message?: string;
      };
      if (!res.ok || !json.data) throw new Error(t.msg(json.message, "proj.loadError"));
      setProyectos(json.data.proyectos);
      setArchivados(json.data.archivados ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("proj.loadError"));
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  return (
    <Pagina ancho="normal">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-text">{t("proj.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("proj.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
        >
          <Plus size={16} aria-hidden="true" />
          {t("proj.new")}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text"
        >
          {error}
        </p>
      ) : null}

      {proyectos && proyectos.length === 0 ? (
        <p className={`${sectionCardClass} text-sm text-text-muted`}>{t("proj.empty")}</p>
      ) : null}

      <div className="space-y-6">
        {proyectos?.map((p) => (
          <TarjetaProyecto key={p.proyecto.id} vista={p} onCambio={cargar} />
        ))}
      </div>

      {archivados.length > 0 ? (
        <details className="mt-8 rounded-2xl border border-line bg-surface px-5 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-text-muted">
            {t("proj.archived", { n: archivados.length })}
          </summary>
          <ul className="mt-2 divide-y divide-line">
            {archivados.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 text-text">
                  <span className="break-words">{a.name}</span>
                  <span className="ml-2 text-xs text-text-muted">{fechaLarga(a.targetDate, t.locale)}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void enviar("/api/hogar/proyectos", "PATCH", { id: a.id, archived: false })
                      .then(cargar)
                      .catch((e) =>
                        setError(e instanceof Error ? t.msg(e.message, "proj.saveError") : t("proj.saveError"))
                      )
                  }
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-surface-raised"
                >
                  {t("proj.restore")}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <NuevoProyecto abierto={creando} onCerrar={() => setCreando(false)} onCreado={cargar} />
    </Pagina>
  );
}

// Crea un proyecto o, con `editar`, cambia su nombre y su fecha.
function NuevoProyecto({
  abierto,
  onCerrar,
  onCreado,
  editar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => Promise<void>;
  editar?: Proyecto;
}) {
  const t = useT();
  const [nombre, setNombre] = useState(editar?.name ?? "");
  const [fecha, setFecha] = useState(editar?.targetDate ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");

    try {
      await enviar(
        "/api/hogar/proyectos",
        editar ? "PATCH" : "POST",
        editar ? { id: editar.id, name: nombre, targetDate: fecha } : { name: nombre, targetDate: fecha }
      );
      setNombre("");
      setFecha("");
      await onCreado();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "proj.saveError") : t("proj.saveError"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={editar ? t("proj.edit") : t("proj.new")}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="proj-nombre">
            {t("proj.fieldName")}
          </label>
          <input
            id="proj-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t("proj.nameExample")}
            maxLength={80}
            required
            autoFocus
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="proj-fecha">
            {t("proj.fieldDate")}
          </label>
          <input
            id="proj-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text"
          >
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-1">
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
            {guardando ? t("common.saving") : editar ? t("common.save") : t("proj.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Una fila de la lista del proyecto: marcar pagado, editar o eliminar.
function FilaItemProyecto({
  item,
  ocupado,
  hacer,
}: {
  item: ProyectoItem;
  ocupado: boolean;
  hacer: (accion: () => Promise<void>) => Promise<void>;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [concepto, setConcepto] = useState(item.concepto);
  const [monto, setMonto] = useState(String(item.montoCents / 100));
  const [fecha, setFecha] = useState(item.fecha);
  const [borrando, setBorrando] = useState(false);

  function abrirEdicion() {
    setConcepto(item.concepto);
    setMonto(String(item.montoCents / 100));
    setFecha(item.fecha);
    setEditando(true);
  }

  function guardar(e: FormEvent) {
    e.preventDefault();
    void hacer(async () => {
      await enviar("/api/hogar/proyectos/items", "PATCH", { id: item.id, concepto, monto, fecha });
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <li className="py-3">
        <form
          onSubmit={guardar}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end"
        >
          <div>
            <label className={labelClass} htmlFor={`edit-nombre-${item.id}`}>
              {t("proj.itemName")}
            </label>
            <input
              id={`edit-nombre-${item.id}`}
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              maxLength={120}
              required
              autoFocus
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`edit-monto-${item.id}`}>
              {t("proj.itemAmount")}
            </label>
            <input
              id={`edit-monto-${item.id}`}
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`edit-fecha-${item.id}`}>
              {t("proj.itemDate")}
            </label>
            <input
              id={`edit-fecha-${item.id}`}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={item.pagado}
        disabled={ocupado}
        aria-label={t("proj.paid")}
        onChange={(e) =>
          void hacer(() =>
            enviar("/api/hogar/proyectos/items", "PATCH", { id: item.id, pagado: e.target.checked })
          )
        }
        className="h-4 w-4 shrink-0 accent-[var(--color-sage)]"
      />
      <div className={`min-w-0 flex-1 ${item.pagado ? "text-text-muted line-through" : "text-text"}`}>
        <p className="break-words">{item.concepto}</p>
        <p className="text-xs text-text-muted no-underline">
          {item.pagado
            ? t("proj.paid")
            : item.fecha
              ? t("proj.dueOn", { date: fechaLarga(item.fecha, t.locale) })
              : t("proj.noDate")}
        </p>
      </div>
      <span className="whitespace-nowrap font-medium">{formatearCentavos(item.montoCents)}</span>
      {borrando ? (
        <span className="flex items-center gap-1 text-xs">
          <span className="text-text-muted">{t("proj.deleteItemQuestion")}</span>
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              void hacer(() =>
                enviar(`/api/hogar/proyectos/items?id=${encodeURIComponent(item.id)}`, "DELETE")
              )
            }
            className="rounded-lg px-2 py-1 font-medium text-rust-text transition hover:bg-rust-soft"
          >
            {t("proj.yes")}
          </button>
          <button
            type="button"
            onClick={() => setBorrando(false)}
            className="rounded-lg px-2 py-1 font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            {t("proj.no")}
          </button>
        </span>
      ) : (
        <>
          <button
            type="button"
            disabled={ocupado}
            aria-label={`${t("proj.editItem")}: ${item.concepto}`}
            onClick={abrirEdicion}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={ocupado}
            aria-label={`${t("proj.deleteItem")}: ${item.concepto}`}
            onClick={() => setBorrando(true)}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-rust-text"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </>
      )}
    </li>
  );
}

// Monto que se edita ahí mismo y se guarda al salir del campo (o con Enter).
// Vacío = 0. Quien lo usa lo vuelve a montar (key) cuando cambia el valor
// guardado, para que el campo muestre lo que quedó en el servidor.
function CampoMonto({
  id,
  label,
  cents,
  tono = "",
  placeholder,
  disabled,
  ayuda,
  plano = false,
  onCambio,
  onGuardar,
}: {
  id: string;
  label: string;
  cents: number;
  tono?: string;
  placeholder: string;
  disabled: boolean;
  ayuda?: ReactNode;
  // Sin borde ni fondo propios: va dentro de otra caja.
  plano?: boolean;
  // Se llama cada vez que se escribe (p. ej. para borrar un aviso viejo).
  onCambio?: () => void;
  onGuardar: (texto: string) => void;
}) {
  const inicial = cents > 0 ? String(cents / 100) : "";
  const [texto, setTexto] = useState(inicial);

  return (
    <div
      className={`relative ${
        plano
          ? ""
          : "rounded-xl border border-line bg-surface-raised px-3 py-2.5"
      }`}
    >
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-xs uppercase tracking-wide text-text-muted">
          {label}
        </label>
        {ayuda}
      </div>
      <div
        className={`mt-1.5 flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 transition focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/30 ${
          disabled ? "opacity-60" : "hover:border-gold"
        }`}
      >
        <span className="text-base font-semibold text-text-muted" aria-hidden="true">
          $
        </span>
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={texto}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setTexto(e.target.value);
            onCambio?.();
          }}
          onBlur={() => {
            if (texto !== inicial) onGuardar(texto);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`w-full min-w-0 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-text-muted ${tono || "text-text"}`}
        />
      </div>
    </div>
  );
}

// Cuánto aparta cada persona por mes para el proyecto. La primera versión se
// calcula con el tiempo que falta y con lo que cada una tiene libre; cada
// persona puede cambiar la suya, sin pasar de lo que le queda libre.
function AhorroMensual({
  vista,
  ocupado,
  hacer,
}: {
  vista: ProyectoVista;
  ocupado: boolean;
  hacer: (accion: () => Promise<void>) => Promise<void>;
}) {
  const t = useT();
  const { proyecto, plan, cobertura, aportes, mio } = vista;
  const [aviso, setAviso] = useState("");
  const [reinicio, setReinicio] = useState(0);

  const libre = mio.salarioCents - mio.fijosCents - mio.extrasCents - mio.otrosProyectosCents;
  const sinLibre = mio.topeCents <= 0;
  const total = cobertura.aportesMensualCents;

  function guardar(texto: string) {
    const cents = Math.round(Number(texto || 0) * 100);

    if (cents > mio.topeCents) {
      setAviso(t("proj.overAvailable", { amount: formatearCentavos(mio.topeCents) }));
      // Vuelve a mostrar lo que quedó guardado.
      setReinicio((n) => n + 1);
      return;
    }

    setAviso("");
    void hacer(() =>
      enviar("/api/hogar/proyectos/aporte", "PUT", { projectId: proyecto.id, monto: texto })
    );
  }

  function fijar(cents: number) {
    setAviso("");
    void hacer(() =>
      enviar("/api/hogar/proyectos/aporte", "PUT", { projectId: proyecto.id, monto: String(cents / 100) })
    );
  }

  const fila = (label: string, cents: number, signo: "+" | "-") => (
    <div className="flex justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="whitespace-nowrap text-text">
        {signo === "-" ? "−" : "+"} {formatearCentavos(cents)}
      </dd>
    </div>
  );

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text">{t("proj.savingTitle")}</h3>

      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-raised px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">{t("proj.freeThisMonth")}</p>
          <dl className="mt-2 space-y-1 text-sm">
            {fila(t("proj.fixedIncome"), mio.salarioCents, "+")}
            {fila(t("proj.fixedExpenses"), mio.fijosCents, "-")}
            {fila(t("proj.extraExpenses"), mio.extrasCents, "-")}
            {mio.otrosProyectosCents > 0 ? fila(t("proj.otherProjects"), mio.otrosProyectosCents, "-") : null}
            <div className="flex justify-between gap-3 border-t border-line pt-1 font-semibold">
              <dt className="text-text">{t("proj.free")}</dt>
              <dd className={libre < 0 ? "text-rust-text" : "text-sage"}>{formatearCentavos(libre)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-surface-raised px-4 py-3">
          <CampoMonto
            key={`aporte-${mio.montoCents}-${reinicio}`}
            id={`aporte-${proyecto.id}`}
            label={t("proj.myContribution")}
            cents={mio.montoCents}
            tono="text-gold"
            placeholder="0.00"
            disabled={ocupado || sinLibre}
            plano
            onCambio={() => setAviso("")}
            ayuda={
              <InfoTip
                texto={t("proj.myContributionHelp")}
                etiqueta={t("proj.moreInfo", { name: t("proj.myContribution") })}
                className="left-0"
              />
            }
            onGuardar={guardar}
          />
          {sinLibre ? (
            <p className={helperTextClass}>{t("proj.noFree")}</p>
          ) : (
            <p className={helperTextClass}>
              {t("proj.limits", {
                max: formatearCentavos(mio.topeCents),
                suggested: formatearCentavos(mio.sugeridoCents),
              })}
            </p>
          )}
          {mio.montoCents > 0 ? (
            <p className={helperTextClass}>
              {!mio.definido ? `${t("proj.suggestedTag")} · ` : ""}
              {t("proj.perBiweekly", { amount: formatearCentavos(Math.round(mio.montoCents / 2)) })}
            </p>
          ) : null}
          {aviso ? (
            <p role="alert" className="mt-2 text-sm text-rust-text">
              {aviso}
            </p>
          ) : null}
          {!mio.definido && mio.montoCents > 0 ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => fijar(mio.montoCents)}
              className="mt-2 rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:bg-surface"
            >
              {t("proj.confirm")}
            </button>
          ) : null}
          {mio.definido && mio.montoCents !== mio.sugeridoCents && !sinLibre ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => fijar(mio.sugeridoCents)}
              className="mt-2 rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:bg-surface"
            >
              {t("proj.useSuggested")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-text-muted">{t("proj.everyone")}</p>
        <ul className="mt-1 space-y-0.5">
          {aportes.map((a) => (
            <li key={a.memberId} className="flex justify-between gap-3">
              <span className="text-text">
                {a.nombre}
                {a.esMio ? ` ${t("proj.you")}` : ""}
                {!a.definido ? (
                  <span className="ml-2 text-xs text-text-muted">{t("proj.suggestedTag")}</span>
                ) : null}
              </span>
              <span className="whitespace-nowrap font-medium text-text">
                {formatearCentavos(a.montoCents)}
              </span>
            </li>
          ))}
        </ul>

        {plan.comprometidoCents > 0 ? (
          total <= 0 ? (
            <p className="mt-2 text-rust-text">{t("proj.coverNone")}</p>
          ) : cobertura.alcanza ? (
            <p className="mt-2 text-sage">
              {t("proj.coverOk", { amount: formatearCentavos(total) })}
              {cobertura.mesesParaCubrirTodo !== null && cobertura.mesesParaCubrirTodo > 0
                ? ` ${
                    cobertura.mesesParaCubrirTodo === 1
                      ? t("proj.coverMonthsOne")
                      : t("proj.coverMonthsMany", { n: cobertura.mesesParaCubrirTodo })
                  }`
                : ""}
            </p>
          ) : cobertura.problemaYaVencido ? (
            <p className="mt-2 text-rust-text">
              {t("proj.coverOverdue", {
                date: fechaLarga(cobertura.fechaProblema, t.locale),
                short: formatearCentavos(cobertura.faltanteEnFechaCents),
              })}
            </p>
          ) : (
            <p className="mt-2 text-rust-text">
              {t("proj.coverShort", {
                amount: formatearCentavos(total),
                date: fechaLarga(cobertura.fechaProblema, t.locale),
                short: formatearCentavos(cobertura.faltanteEnFechaCents),
                missing: formatearCentavos(cobertura.faltanteMensualCents),
              })}
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function TarjetaProyecto({
  vista,
  onCambio,
}: {
  vista: ProyectoVista;
  onCambio: () => Promise<void>;
}) {
  const t = useT();
  const { proyecto, items, plan } = vista;
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [editandoProyecto, setEditandoProyecto] = useState(false);

  async function hacer(accion: () => Promise<void>) {
    setOcupado(true);
    setError("");

    try {
      await accion();
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? t.msg(err.message, "proj.saveError") : t("proj.saveError"));
    } finally {
      setOcupado(false);
    }
  }

  function agregar(e: FormEvent) {
    e.preventDefault();
    void hacer(async () => {
      await enviar("/api/hogar/proyectos/items", "POST", {
        projectId: proyecto.id,
        concepto,
        monto,
        fecha,
      });
      setConcepto("");
      setMonto("");
      setFecha("");
    });
  }

  const hayObjetivo = proyecto.objetivoCents > 0;
  const avance = hayObjetivo
    ? Math.min(100, Math.round(((plan.pagadoCents + plan.comprometidoCents) / proyecto.objetivoCents) * 100))
    : 0;
  const hayCuota = plan.cuotaMensualCents > 0;
  // Pendientes primero; lo ya pagado al final.
  const itemsOrdenados = [...items].sort((a, b) => Number(a.pagado) - Number(b.pagado));
  // Si algún pago cae después de la fecha del proyecto, se avisa.
  const ultimoPago = items.reduce((max, i) => (i.fecha > max ? i.fecha : max), "");

  return (
    <section className={sectionCardClass} aria-label={proyecto.name}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="font-display text-2xl text-text">{proyecto.name}</h2>
            <button
              type="button"
              disabled={ocupado}
              aria-label={t("proj.edit")}
              onClick={() => setEditandoProyecto(true)}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-text-muted">
            {fechaLarga(proyecto.targetDate, t.locale)}
            {ultimoPago > proyecto.targetDate
              ? ` · ${t("proj.lastPayment", { date: fechaLarga(ultimoPago, t.locale) })}`
              : ""}
          </p>
          <p role="status" aria-live="polite" className="min-h-4 text-xs text-text-muted">
            {ocupado ? t("common.saving") : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              void hacer(() => enviar("/api/hogar/proyectos", "PATCH", { id: proyecto.id, archived: true }))
            }
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            {t("proj.archive")}
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setConfirmando(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-rust-soft hover:text-rust-text"
          >
            {t("proj.delete")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato
          label={t("proj.committed")}
          valor={formatearCentavos(plan.comprometidoCents)}
          ayuda={
            <InfoTip
              texto={t("proj.committedHelp")}
              etiqueta={t("proj.moreInfo", { name: t("proj.committed") })}
            />
          }
        />
        <CampoMonto
          key={`objetivo-${proyecto.objetivoCents}`}
          id={`objetivo-${proyecto.id}`}
          label={t("proj.target")}
          cents={proyecto.objetivoCents}
          placeholder={t("proj.optional")}
          disabled={ocupado}
          ayuda={
            <InfoTip
              texto={t("proj.targetHelp")}
              etiqueta={t("proj.moreInfo", { name: t("proj.target") })}
              className="right-0 sm:left-0 sm:right-auto"
            />
          }
          onGuardar={(texto) =>
            void hacer(() => enviar("/api/hogar/proyectos", "PATCH", { id: proyecto.id, objetivo: texto }))
          }
        />
        <CampoMonto
          key={`ahorrado-${proyecto.ahorradoCents}`}
          id={`ahorrado-${proyecto.id}`}
          label={t("proj.saved")}
          cents={proyecto.ahorradoCents}
          tono="text-sage"
          placeholder="0.00"
          disabled={ocupado}
          ayuda={
            <InfoTip
              texto={t("proj.savedHelp")}
              etiqueta={t("proj.moreInfo", { name: t("proj.saved") })}
            />
          }
          onGuardar={(texto) =>
            void hacer(() => enviar("/api/hogar/proyectos", "PATCH", { id: proyecto.id, ahorrado: texto }))
          }
        />
        <Dato label={t("proj.remaining")} valor={formatearCentavos(plan.faltaCents)} />
      </div>

      {plan.pagadoCents > 0 ? (
        <p className={helperTextClass}>
          {t("proj.paidSoFar", {
            paid: formatearCentavos(plan.pagadoCents),
            left: formatearCentavos(plan.apartadoDisponibleCents),
          })}
        </p>
      ) : null}

      {!hayObjetivo ? <p className={helperTextClass}>{t("proj.targetHint")}</p> : null}

      {hayObjetivo ? (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-raised"
            role="progressbar"
            aria-valuenow={avance}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("proj.committed")}
          >
            <div
              className={`h-full rounded-full ${plan.sobreObjetivoCents > 0 ? "bg-rust" : "bg-gold"}`}
              style={{ width: `${avance}%` }}
            />
          </div>
          <p className={`${helperTextClass} ${plan.sobreObjetivoCents > 0 ? "text-rust-text" : ""}`}>
            {plan.sobreObjetivoCents > 0
              ? t("proj.overTarget", { amount: formatearCentavos(plan.sobreObjetivoCents) })
              : t("proj.unassigned", { amount: formatearCentavos(plan.porAsignarCents) })}
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-line bg-surface-raised px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-text-muted">{t("proj.minSaving")}</p>
        {hayCuota ? (
          <>
            <p className="mt-0.5 text-lg font-semibold text-gold">
              {t("proj.perMonth", { amount: formatearCentavos(plan.cuotaMensualCents) })}
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({t("proj.perBiweekly", { amount: formatearCentavos(plan.cuotaQuincenalCents) })})
              </span>
            </p>
            <p className={helperTextClass}>
              {t("proj.limitedBy", { date: fechaLarga(plan.fechaLimitante, t.locale) })}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-text-muted">
            {plan.comprometidoCents === 0 && plan.pagadoCents === 0
              ? t("proj.noItems")
              : plan.comprometidoCents === 0
                ? t("proj.allPaid")
                : t("proj.covered")}
          </p>
        )}
        {plan.urgenteCents > 0 ? (
          <p className="mt-2 text-sm text-rust-text">
            {t("proj.urgent", { amount: formatearCentavos(plan.urgenteCents) })}
          </p>
        ) : null}
      </div>

      <AhorroMensual vista={vista} ocupado={ocupado} hacer={hacer} />

      <h3 className="mt-6 text-sm font-semibold text-text">{t("proj.items")}</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">{t("proj.noItems")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line text-sm">
          {itemsOrdenados.map((item) => (
            <FilaItemProyecto key={item.id} item={item} ocupado={ocupado} hacer={hacer} />
          ))}
        </ul>
      )}

      <form onSubmit={agregar} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end">
        <div>
          <label className={labelClass} htmlFor={`item-nombre-${proyecto.id}`}>
            {t("proj.itemName")}
          </label>
          <input
            id={`item-nombre-${proyecto.id}`}
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder={t("proj.itemExample")}
            maxLength={120}
            required
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`item-monto-${proyecto.id}`}>
            {t("proj.itemAmount")}
          </label>
          <input
            id={`item-monto-${proyecto.id}`}
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            required
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`item-fecha-${proyecto.id}`}>
            {t("proj.itemDate")}
          </label>
          <input
            id={`item-fecha-${proyecto.id}`}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${fieldBaseClass} ${fieldNormalClass}`}
          />
        </div>
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("proj.add")}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-text"
        >
          {error}
        </p>
      ) : null}

      {editandoProyecto ? (
        <NuevoProyecto
          abierto
          editar={proyecto}
          onCerrar={() => setEditandoProyecto(false)}
          onCreado={onCambio}
        />
      ) : null}

      <Modal abierto={confirmando} onCerrar={() => setConfirmando(false)} titulo={t("proj.deleteTitle")}>
        <p className="text-sm text-text-muted">{t("proj.deleteBody", { name: `"${proyecto.name}"` })}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              setConfirmando(false);
              void hacer(() =>
                enviar(`/api/hogar/proyectos?id=${encodeURIComponent(proyecto.id)}`, "DELETE")
              );
            }}
            className="rounded-xl bg-rust px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("proj.deleteConfirm")}
          </button>
        </div>
      </Modal>
    </section>
  );
}
