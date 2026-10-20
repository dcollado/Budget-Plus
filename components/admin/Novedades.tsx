"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import {
  DIAS_MAX,
  DIAS_MIN,
  DIAS_POR_DEFECTO,
  diasRestantes,
  estadoDelAnuncio,
  fechaFinDelAnuncio,
  type Anuncio,
  type EstadoAnuncio,
} from "@/lib/anuncios";
import type { MessageKey } from "@/lib/i18n/messages";
import { fieldBaseClass, fieldNormalClass, helperTextClass, labelClass, sectionCardClass } from "@/lib/ui";

type Mensaje = { tipo: "ok" | "error"; texto: string };

type Borrador = {
  tituloEs: string;
  tituloEn: string;
  textoEs: string;
  textoEn: string;
  enlace: string;
  fecha: string;
  dias: number;
  activo: boolean;
};

const DURACIONES = [7, 14, 30, 60];

const ESTADOS: Record<EstadoAnuncio, { clave: MessageKey; clase: string }> = {
  vigente: { clave: "news.statusLive", clase: "bg-sage/20 text-sage" },
  programado: { clave: "news.statusScheduled", clase: "bg-gold-soft text-gold" },
  vencido: { clave: "news.statusExpired", clase: "bg-surface text-text-muted" },
  apagado: { clave: "news.statusOff", clase: "bg-surface text-text-muted" },
};

// Novedades (solo super-admin): crear, editar, apagar y fijar cuánto tiempo
// está vivo cada aviso de lanzamiento.
export default function Novedades({ onCambio }: { onCambio: () => void }) {
  const t = useT();
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null);
  const [hoy, setHoy] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // null = formulario cerrado; "nuevo" o el id de la novedad que se edita.
  const [editando, setEditando] = useState<string | null>(null);
  const [b, setB] = useState<Borrador | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/novedades", { cache: "no-store" });
      const json = (await res.json()) as { data?: { anuncios: Anuncio[]; hoy: string }; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "news.loadError") });
        return;
      }
      setAnuncios(json.data.anuncios);
      setHoy(json.data.hoy);
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    }
  }, [t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!mensaje || mensaje.tipo !== "ok") return;
    const id = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(id);
  }, [mensaje]);

  const borradorVacio = (): Borrador => ({
    tituloEs: "",
    tituloEn: "",
    textoEs: "",
    textoEn: "",
    enlace: "/",
    fecha: hoy,
    dias: DIAS_POR_DEFECTO,
    activo: true,
  });

  const borradorDe = (a: Anuncio): Borrador => ({
    tituloEs: a.titulo.es,
    tituloEn: a.titulo.en,
    textoEs: a.texto.es,
    textoEn: a.texto.en,
    enlace: a.enlace,
    fecha: a.fecha,
    dias: a.dias,
    activo: a.activo,
  });

  const cuerpo = (x: Borrador) => ({
    titulo: { es: x.tituloEs, en: x.tituloEn },
    texto: { es: x.textoEs, en: x.textoEn },
    enlace: x.enlace,
    fecha: x.fecha,
    dias: x.dias,
    activo: x.activo,
  });

  async function enviar(url: string, init: RequestInit, exito: string): Promise<boolean> {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return false;
      }
      setMensaje({ tipo: "ok", texto: exito });
      await cargar();
      onCambio();
      return true;
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!b || !editando) return;
    const nuevo = editando === "nuevo";
    const ok = await enviar(
      nuevo ? "/api/admin/novedades" : `/api/admin/novedades/${editando}`,
      { method: nuevo ? "POST" : "PUT", body: JSON.stringify(cuerpo(b)) },
      nuevo ? t("news.created") : t("common.changesSaved")
    );
    if (ok) {
      setEditando(null);
      setB(null);
    }
  }

  function cambio<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setB((p) => (p ? { ...p, [campo]: valor } : p));
  }

  const fecha = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className={`${sectionCardClass} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text">{t("news.title")}</h2>
          <p className={helperTextClass}>{t("news.intro")}</p>
        </div>
        {editando === null ? (
          <button
            type="button"
            onClick={() => {
              setB(borradorVacio());
              setEditando("nuevo");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-medium text-ink transition hover:opacity-90"
          >
            <Plus size={14} /> {t("news.new")}
          </button>
        ) : null}
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok" ? "border-sage/30 bg-surface text-text" : "border-rust/30 bg-rust-soft text-rust-text"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {editando !== null && b ? (
        <form onSubmit={guardar} className="space-y-4 rounded-xl border border-line bg-surface-raised p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="nv-te">{t("news.fieldTitleEs")}</label>
              <input id="nv-te" value={b.tituloEs} maxLength={80} required
                onChange={(e) => cambio("tituloEs", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
            </div>
            <div>
              <label className={labelClass} htmlFor="nv-tn">{t("news.fieldTitleEn")}</label>
              <input id="nv-tn" value={b.tituloEn} maxLength={80} required
                onChange={(e) => cambio("tituloEn", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
            </div>
            <div>
              <label className={labelClass} htmlFor="nv-xe">{t("news.fieldTextEs")}</label>
              <textarea id="nv-xe" value={b.textoEs} maxLength={240} required rows={3}
                onChange={(e) => cambio("textoEs", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
            </div>
            <div>
              <label className={labelClass} htmlFor="nv-xn">{t("news.fieldTextEn")}</label>
              <textarea id="nv-xn" value={b.textoEn} maxLength={240} required rows={3}
                onChange={(e) => cambio("textoEn", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="nv-en">{t("news.fieldLink")}</label>
              <input id="nv-en" value={b.enlace} required
                onChange={(e) => cambio("enlace", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
              <p className={helperTextClass}>{t("news.linkHelp")}</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="nv-fe">{t("news.fieldStart")}</label>
              <input id="nv-fe" type="date" value={b.fecha} required
                onChange={(e) => cambio("fecha", e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="nv-di">{t("news.fieldDays")}</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="nv-di" type="number" inputMode="numeric" min={DIAS_MIN} max={DIAS_MAX} value={b.dias} required
                onChange={(e) => cambio("dias", Number(e.target.value))}
                className={`${fieldBaseClass} ${fieldNormalClass} !w-24`} />
              {DURACIONES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => cambio("dias", n)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    b.dias === n ? "bg-gold text-ink" : "bg-surface text-text-muted hover:text-text"
                  }`}
                >
                  {t("news.daysOption", { n })}
                </button>
              ))}
            </div>
            <p className={helperTextClass}>{t("news.daysHelp")}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={b.activo} onChange={(e) => cambio("activo", e.target.checked)} />
            {t("news.fieldActive")}
          </label>

          <div>
            <p className={labelClass}>{t("news.preview")}</p>
            <div className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-text">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
              <p className="leading-6">
                <span className="font-semibold text-gold">{t("banner.new")}</span>{" "}
                <span className="font-medium">{(t.locale === "es" ? b.tituloEs : b.tituloEn) || "…"}.</span>{" "}
                <span className="text-text-muted">{t.locale === "es" ? b.textoEs : b.textoEn}</span>{" "}
                <span className="font-medium text-gold">{t("banner.open")}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
            >
              {editando === "nuevo" ? t("news.create") : t("news.save")}
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                setEditando(null);
                setB(null);
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition hover:text-text"
            >
              {t("news.cancel")}
            </button>
          </div>
        </form>
      ) : null}

      {anuncios === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : anuncios.length === 0 ? (
        <p className="text-sm text-text-muted">{t("news.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {anuncios.map((a) => {
            const estado = estadoDelAnuncio(a, hoy);
            const e = ESTADOS[estado];
            return (
              <li key={a.id} className="rounded-xl border border-line bg-surface-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-text">
                    {t.locale === "es" ? a.titulo.es : a.titulo.en}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.clase}`}>{t(e.clave)}</span>
                </div>
                <p className="mt-1 text-sm text-text-muted">{t.locale === "es" ? a.texto.es : a.texto.en}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {t("news.range", { from: fecha(a.fecha), to: fecha(fechaFinDelAnuncio(a)), days: a.dias })}
                  {estado === "vigente" ? ` · ${t("news.daysLeft", { n: diasRestantes(a, hoy) })}` : ""}
                  {` · ${a.enlace}`}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      setB(borradorDe(a));
                      setEditando(a.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-surface hover:text-text disabled:opacity-60"
                  >
                    <Pencil size={14} /> {t("news.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      void enviar(
                        `/api/admin/novedades/${a.id}`,
                        { method: "PUT", body: JSON.stringify(cuerpo({ ...borradorDe(a), activo: !a.activo })) },
                        t("common.changesSaved")
                      )
                    }
                    className="rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-surface hover:text-text disabled:opacity-60"
                  >
                    {a.activo ? t("news.turnOff") : t("news.turnOn")}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      const titulo = t.locale === "es" ? a.titulo.es : a.titulo.en;
                      if (window.confirm(t("news.confirmDelete", { title: titulo }))) {
                        void enviar(`/api/admin/novedades/${a.id}`, { method: "DELETE" }, t("news.deleted"));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rust-text transition hover:bg-rust/10 disabled:opacity-60"
                  >
                    <Trash2 size={14} /> {t("news.delete")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
