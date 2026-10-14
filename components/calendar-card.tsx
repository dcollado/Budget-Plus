"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";

type Estado = {
  conectado: boolean;
  calendarId: string | null;
  cuentaServicio: string | null;
  heredado: boolean;
};

type Mensaje = { tipo: "ok" | "error"; texto: string };

// Conectar el Google Calendar propio de un hogar. Lo usan Perfil (admin del
// hogar, endpoint /api/hogar/calendario) y Admin (super-admin, un hogar
// cualquiera, endpoint /api/admin/hogares/<id>/calendario).
export function CalendarCard({ endpoint, bare = false }: { endpoint: string; bare?: boolean }) {
  const t = useT();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [calendarId, setCalendarId] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const json = (await res.json()) as { data?: Estado; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "calendar.loadError") });
        return;
      }
      setEstado(json.data);
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    }
  }, [endpoint, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function llamar(url: string, init: RequestInit, exito: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as { data?: Estado; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return;
      }
      setEstado(json.data);
      setCalendarId("");
      setMensaje({ tipo: "ok", texto: exito });
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setOcupado(false);
    }
  }

  function conectar(e: React.FormEvent) {
    e.preventDefault();
    void llamar(
      endpoint,
      { method: "PUT", body: JSON.stringify({ calendarId }) },
      t("calendar.connectedOk")
    );
  }

  function desconectar() {
    if (!window.confirm(t("calendar.confirmDisconnect"))) return;
    void llamar(`${endpoint}?borrarEventos=1`, { method: "DELETE" }, t("calendar.disconnectedOk"));
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sin portapapeles: el correo sigue visible para copiarlo a mano */
    }
  }

  return (
    <div className={bare ? "space-y-4" : `${sectionCardClass} space-y-4`}>
      <div>
        <h2 className="text-base font-semibold text-text">{t("calendar.title")}</h2>
        <p className={helperTextClass}>{t("calendar.intro")}</p>
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-sage/30 bg-surface text-text"
              : "border-rust/30 bg-rust-soft text-rust"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {estado === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : (
        <>
          {estado.conectado ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sage/30 bg-surface-raised px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-sage">{t("calendar.connected")}</p>
                <p className="truncate text-xs text-text-muted">
                  {estado.heredado
                    ? t("calendar.inherited")
                    : t("calendar.syncingTo", { id: estado.calendarId ?? "" })}
                </p>
              </div>
              {estado.heredado ? null : (
                <button
                  type="button"
                  onClick={desconectar}
                  disabled={ocupado}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-rust transition hover:bg-rust/10 disabled:opacity-60"
                >
                  {t("calendar.disconnect")}
                </button>
              )}
            </div>
          ) : null}

          {estado.heredado ? null : (
            <>
              <ol className="space-y-2 text-sm text-text-muted">
                <li>{t("calendar.step1")}</li>
                <li>
                  {t("calendar.step2")}
                  {estado.cuentaServicio ? (
                    <span className="mt-1 flex items-center gap-2">
                      <code className="break-all rounded-lg bg-surface-raised px-2 py-1 text-xs text-text">
                        {estado.cuentaServicio}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copiar(estado.cuentaServicio!)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-gold transition hover:bg-surface-raised"
                      >
                        {copiado ? <Check size={13} /> : <Copy size={13} />}
                        {copiado ? t("calendar.copied") : t("calendar.copy")}
                      </button>
                    </span>
                  ) : (
                    <span className="mt-1 block text-rust">{t("calendar.noServiceAccount")}</span>
                  )}
                </li>
                <li>{t("calendar.step3")}</li>
              </ol>

              <form onSubmit={conectar} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[14rem] flex-1">
                  <label className={labelClass} htmlFor="calendarId">
                    {t("calendar.idLabel")}
                  </label>
                  <input
                    id="calendarId"
                    type="text"
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    placeholder={t("calendar.idPlaceholder")}
                    required
                    disabled={ocupado}
                    className={`${fieldBaseClass} ${fieldNormalClass}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={ocupado || !estado.cuentaServicio}
                  className="h-10 rounded-xl bg-rust px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {ocupado
                    ? t("calendar.connecting")
                    : estado.conectado
                      ? t("calendar.change")
                      : t("calendar.connect")}
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
