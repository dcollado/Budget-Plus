"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { MODULOS, type ModuloClave, type Modulos as EstadoModulos } from "@/lib/modulos";
import type { MessageKey } from "@/lib/i18n/messages";
import { helperTextClass, sectionCardClass } from "@/lib/ui";

type Mensaje = { tipo: "ok" | "error"; texto: string };

const TEXTOS: Record<ModuloClave, { nombre: MessageKey; descripcion: MessageKey }> = {
  proyectos: { nombre: "modules.projects", descripcion: "modules.projectsDesc" },
  reportes: { nombre: "modules.reports", descripcion: "modules.reportsDesc" },
};

// Módulos (solo super-admin): encender o apagar partes de la app para todos.
// Apagar un módulo no borra sus datos: al volver a encenderlo todo sigue ahí.
export default function Modulos({ onCambio }: { onCambio: () => void }) {
  const t = useT();
  const [estado, setEstado] = useState<EstadoModulos | null>(null);
  const [ocupado, setOcupado] = useState<ModuloClave | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/modulos", { cache: "no-store" });
      const json = (await res.json()) as { data?: EstadoModulos; message?: string };
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

  async function cambiar(clave: ModuloClave, activo: boolean) {
    if (!activo && !window.confirm(t("modules.confirmOff", { name: t(TEXTOS[clave].nombre) }))) return;

    setOcupado(clave);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/modulos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, activo }),
      });
      const json = (await res.json()) as { data?: EstadoModulos; message?: string };
      if (!res.ok || !json.data) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return;
      }
      setEstado(json.data);
      setMensaje({
        tipo: "ok",
        texto: t(activo ? "modules.turnedOn" : "modules.turnedOff", { name: t(TEXTOS[clave].nombre) }),
      });
      onCambio();
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section className={`${sectionCardClass} space-y-4`}>
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
        <ul className="space-y-3">
          {MODULOS.map(({ clave }) => {
            const activo = estado[clave];
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
                  disabled={ocupado !== null}
                  onClick={() => void cambiar(clave, !activo)}
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
      )}
    </section>
  );
}
