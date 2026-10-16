"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fieldBaseClass, fieldNormalClass, labelClass, sectionCardClass } from "@/lib/ui";
import type { Solicitud } from "@/lib/solicitudes";

type Borrador = { nombre: string; email: string; hogar: string };
type Mensaje = { tipo: "ok" | "error"; texto: string };

// Bandeja de solicitudes de acceso (solo super-admin). Cada solicitud se
// puede corregir antes de aceptarla; al aceptar se crea el hogar y se envía
// la invitación.
export default function SolicitudesAcceso({ onDecidida }: { onDecidida: () => void }) {
  const t = useT();
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/solicitudes", { cache: "no-store" });
      const json = (await res.json()) as { data?: Solicitud[]; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "requests.loadError") });
        return;
      }
      setSolicitudes(json.data);
      setBorradores((previos) => {
        const siguientes: Record<string, Borrador> = {};
        for (const s of json.data!) {
          siguientes[s.id] = previos[s.id] ?? { nombre: s.nombre, email: s.email, hogar: s.hogar };
        }
        return siguientes;
      });
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    }
  }, [t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // El aviso de éxito se va solo a los pocos segundos.
  useEffect(() => {
    if (!mensaje || mensaje.tipo !== "ok") return;
    const id = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(id);
  }, [mensaje]);

  async function decidir(
    s: Solicitud,
    accion: "editar" | "aprobar" | "rechazar",
    exito: string
  ) {
    const b = borradores[s.id];
    setOcupado(s.id);
    setMensaje(null);
    try {
      const res = await fetch(`/api/admin/solicitudes/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, ...b }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return;
      }
      setMensaje({ tipo: "ok", texto: exito });
      // Los datos editados ya son los de la solicitud: se vuelven a leer.
      setBorradores((previos) => {
        const copia = { ...previos };
        delete copia[s.id];
        return copia;
      });
      await cargar();
      // Aceptar o rechazar queda en la actividad reciente: que se refresque.
      if (accion !== "editar") onDecidida();
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setOcupado(null);
    }
  }

  const pendientes = solicitudes?.filter((s) => s.estado === "pendiente") ?? [];

  return (
    <section className={`${sectionCardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{t("requests.title")}</h2>
        {pendientes.length > 0 ? (
          <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">
            {pendientes.length}
          </span>
        ) : null}
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-sage/30 bg-surface text-text"
              : "border-rust/30 bg-rust-soft text-rust-text"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {solicitudes === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-text-muted">{t("requests.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {pendientes.map((s) => {
            const b = borradores[s.id] ?? { nombre: s.nombre, email: s.email, hogar: s.hogar };
            const cambio = (campo: keyof Borrador, valor: string) =>
              setBorradores((p) => ({ ...p, [s.id]: { ...b, [campo]: valor } }));
            const ocupada = ocupado === s.id;

            return (
              <li key={s.id} className="rounded-xl border border-line bg-surface-raised p-4">
                <p className="mb-3 text-xs text-text-muted">
                  {t("requests.received", {
                    date: new Date(s.creadaEn).toLocaleString(t.locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor={`sn-${s.id}`}>
                      {t("access.fieldName")}
                    </label>
                    <input
                      id={`sn-${s.id}`}
                      value={b.nombre}
                      onChange={(e) => cambio("nombre", e.target.value)}
                      disabled={ocupada}
                      className={`${fieldBaseClass} ${fieldNormalClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`se-${s.id}`}>
                      {t("access.fieldEmail")}
                    </label>
                    <input
                      id={`se-${s.id}`}
                      type="email"
                      value={b.email}
                      onChange={(e) => cambio("email", e.target.value)}
                      disabled={ocupada}
                      className={`${fieldBaseClass} ${fieldNormalClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`sh-${s.id}`}>
                      {t("access.fieldHousehold")}
                    </label>
                    <input
                      id={`sh-${s.id}`}
                      value={b.hogar}
                      onChange={(e) => cambio("hogar", e.target.value)}
                      disabled={ocupada}
                      placeholder={b.nombre}
                      className={`${fieldBaseClass} ${fieldNormalClass}`}
                    />
                  </div>
                </div>

                {s.mensaje ? (
                  <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">
                    <span className="font-medium text-text">{t("access.fieldMessage")}: </span>
                    {s.mensaje}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ocupada}
                    onClick={() =>
                      void decidir(s, "aprobar", t("requests.acceptedOk", { name: b.nombre, email: b.email }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sage/20 px-3 py-2 text-xs font-semibold text-sage transition hover:bg-sage/30 disabled:opacity-60"
                  >
                    <Check size={14} /> {t("requests.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={ocupada}
                    onClick={() => void decidir(s, "editar", t("common.changesSaved"))}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-surface hover:text-text disabled:opacity-60"
                  >
                    {t("requests.saveChanges")}
                  </button>
                  <button
                    type="button"
                    disabled={ocupada}
                    onClick={() => {
                      if (window.confirm(t("requests.confirmDeny", { name: s.nombre }))) {
                        void decidir(s, "rechazar", t("requests.deniedOk"));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rust-text transition hover:bg-rust/10 disabled:opacity-60"
                  >
                    <X size={14} /> {t("requests.deny")}
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
