"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { MODULOS, type EstadoDeModulos, type ModuloClave } from "@/lib/modulos";
import type { MessageKey } from "@/lib/i18n/messages";
import { fieldBaseClass, fieldNormalClass, helperTextClass, labelClass, sectionCardClass } from "@/lib/ui";

type Mensaje = { tipo: "ok" | "error"; texto: string };

const TEXTOS: Record<ModuloClave, { nombre: MessageKey; descripcion: MessageKey }> = {
  proyectos: { nombre: "modules.projects", descripcion: "modules.projectsDesc" },
  reportes: { nombre: "modules.reports", descripcion: "modules.reportsDesc" },
};

// Módulos (solo super-admin): encender o apagar partes de la app. Hay un valor por
// defecto para todos los hogares y, encima, excepciones por hogar (p. ej. apagar un
// módulo para todos menos para tu hogar y el de pruebas). Apagar no borra datos.
export default function Modulos({ onCambio }: { onCambio: () => void }) {
  const t = useT();
  const [estado, setEstado] = useState<EstadoDeModulos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/modulos", { cache: "no-store" });
      const json = (await res.json()) as { data?: EstadoDeModulos; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "modules.loadError") });
        return;
      }
      setEstado(json.data);
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  async function enviar(cuerpo: object, exito: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/modulos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const json = (await res.json()) as { data?: EstadoDeModulos; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return;
      }
      setEstado(json.data);
      setMensaje({ tipo: "ok", texto: exito });
      onCambio();
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setOcupado(false);
    }
  }

  function cambiarPorDefecto(clave: ModuloClave, activo: boolean) {
    const nombre = t(TEXTOS[clave].nombre);
    if (!activo && !window.confirm(t("modules.confirmOff", { name: nombre }))) return;
    void enviar({ clave, activo }, t(activo ? "modules.defaultOn" : "modules.defaultOff", { name: nombre }));
  }

  function cambiarDeHogar(hogarId: string, nombreHogar: string, clave: ModuloClave, valor: string) {
    const activo = valor === "on" ? true : valor === "off" ? false : null;
    void enviar(
      { clave, activo, hogarId },
      t("modules.householdSaved", { household: nombreHogar, name: t(TEXTOS[clave].nombre) })
    );
  }

  return (
    <section className={`${sectionCardClass} space-y-6`}>
      <div>
        <h2 className="text-base font-semibold text-text">{t("modules.title")}</h2>
        <p className={helperTextClass}>{t("modules.intro")}</p>
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

      {estado === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text">{t("modules.defaultTitle")}</h3>
              <p className={helperTextClass}>{t("modules.defaultHelp")}</p>
            </div>

            <ul className="space-y-3">
              {MODULOS.map(({ clave }) => {
                const activo = estado.porDefecto[clave];
                return (
                  <li
                    key={clave}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised p-4"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-text">
                        {t(TEXTOS[clave].nombre)}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            activo ? "bg-sage/20 text-sage" : "bg-surface text-text-muted"
                          }`}
                        >
                          {t(activo ? "modules.on" : "modules.off")}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-text-muted">{t(TEXTOS[clave].descripcion)}</p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={activo}
                      aria-label={t(TEXTOS[clave].nombre)}
                      disabled={ocupado}
                      onClick={() => cambiarPorDefecto(clave, !activo)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                        activo ? "bg-sage" : "bg-line"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-text transition-all ${
                          activo ? "left-[1.375rem]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text">{t("modules.householdsTitle")}</h3>
              <p className={helperTextClass}>{t("modules.householdsHelp")}</p>
            </div>

            {estado.hogares.length === 0 ? (
              <p className="text-sm text-text-muted">{t("modules.noHouseholds")}</p>
            ) : (
              <ul className="space-y-3">
                {estado.hogares.map((h) => (
                  <li key={h.id} className="rounded-xl border border-line bg-surface-raised p-4">
                    <p className="text-sm font-medium text-text">{h.nombre}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {MODULOS.map(({ clave }) => {
                        const excepcion = h.excepciones[clave];
                        const valor = excepcion === undefined ? "default" : excepcion ? "on" : "off";
                        const efectivo = excepcion ?? estado.porDefecto[clave];
                        return (
                          <div key={clave}>
                            <label className={labelClass} htmlFor={`mh-${h.id}-${clave}`}>
                              {t(TEXTOS[clave].nombre)}
                              <span className={`ml-2 text-xs font-normal ${efectivo ? "text-sage" : "text-text-muted"}`}>
                                {t(efectivo ? "modules.on" : "modules.off")}
                              </span>
                            </label>
                            <select
                              id={`mh-${h.id}-${clave}`}
                              value={valor}
                              disabled={ocupado}
                              onChange={(e) => cambiarDeHogar(h.id, h.nombre, clave, e.target.value)}
                              className={`${fieldBaseClass} ${fieldNormalClass}`}
                            >
                              <option value="default">
                                {t("modules.sameAsDefault", {
                                  state: t(estado.porDefecto[clave] ? "modules.on" : "modules.off"),
                                })}
                              </option>
                              <option value="on">{t("modules.alwaysOn")}</option>
                              <option value="off">{t("modules.alwaysOff")}</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
