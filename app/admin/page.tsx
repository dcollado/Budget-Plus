"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { TarjetaHogar } from "@/components/admin/TarjetaHogar";
import Actividad from "@/components/admin/Actividad";
import SolicitudesAcceso from "@/components/admin/SolicitudesAcceso";
import TablaHogares from "@/components/admin/TablaHogares";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";
import { useT } from "@/lib/i18n/client";
import { Pagina } from "@/components/pagina";

type Mensaje = { tipo: "ok" | "error"; texto: string };

export default function AdminPage() {
  const t = useT();
  const [hogares, setHogares] = useState<HogarResumen[] | null>(null);
  const [yo, setYo] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Increments on every reload: the open activity list refreshes itself.
  const [version, setVersion] = useState(0);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombreHogar, setNombreHogar] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/hogares", { cache: "no-store" });
    if (res.status === 403) {
      setMensaje({ tipo: "error", texto: t("admin.superOnly") });
      setHogares([]);
      return;
    }
    const json = (await res.json()) as {
      data?: { hogares: HogarResumen[]; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setMensaje({ tipo: "error", texto: t.msg(json.message, "admin.loadError") });
      setHogares([]);
      return;
    }
    setHogares(json.data.hogares);
    setYo(json.data.yo);
    setVersion((v) => v + 1);
  }, [t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // A single path for all actions: shows the result and reloads.
  async function ejecutar(
    url: string,
    init: RequestInit,
    exito: string
  ): Promise<boolean> {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as { message?: string; data?: { enlaceDev?: string } };
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: t.msg(json.message, "common.actionError") });
        return false;
      }
      const extra = json.data?.enlaceDev ? ` · ${t("common.devOnly")}: ${json.data.enlaceDev}` : "";
      setMensaje({ tipo: "ok", texto: exito + extra });
      await cargar();
      return true;
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crearHogar(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(
      "/api/admin/hogares",
      { method: "POST", body: JSON.stringify({ nombreHogar, adminEmail }) },
      t("admin.householdCreated", { name: nombreHogar.trim(), email: adminEmail.trim() })
    );
    if (ok) {
      setNombreHogar("");
      setAdminEmail("");
      setNuevoAbierto(false);
    }
  }

  const accion = (id: string, cuerpo: object, exito: string) =>
    ejecutar(
      `/api/admin/hogares/${id}/miembros`,
      { method: "POST", body: JSON.stringify(cuerpo) },
      exito
    );

  return (
    <Pagina ancho="ancho" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold">{t("admin.kicker")}</p>
          <h1 className="font-display text-2xl font-semibold text-text">{t("admin.title")}</h1>
        </div>
        <button
          type="button"
          onClick={() => setNuevoAbierto((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90"
        >
          <Plus size={16} /> {t("admin.newHousehold")}
        </button>
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`break-all rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-sage/30 bg-surface text-text"
              : "border-rust/30 bg-rust-soft text-rust-text"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      <SolicitudesAcceso onDecidida={() => void cargar()} />

      {nuevoAbierto ? (
        <form onSubmit={crearHogar} className={`${sectionCardClass} space-y-4`}>
          <h2 className="text-base font-semibold text-text">{t("admin.newHouseholdTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="nombreHogar">{t("admin.householdName")}</label>
              <input
                id="nombreHogar"
                value={nombreHogar}
                onChange={(e) => setNombreHogar(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="adminEmail">{t("admin.adminEmail")}</label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
          </div>
          <p className={helperTextClass}>
            {t("admin.inviteNote")}
          </p>
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {ocupado ? t("admin.sendingInvite") : t("admin.createInvite")}
          </button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {hogares === null ? (
        <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : (
        <TablaHogares
          hogares={hogares}
          renderDetalle={(h) => (
          <TarjetaHogar
            interior
            hogar={h}
            yo={yo}
            ocupado={ocupado}
            calendarioEndpoint={`/api/admin/hogares/${h.id}/calendario`}
            onInvitar={(email, role) =>
              accion(h.id, { accion: "invitar", email, role }, t("members.inviteSent", { email }))
            }
            onReenviar={(invitacionId, email) =>
              accion(h.id, { accion: "reenviar", invitacionId }, t("members.inviteResent", { email }))
            }
            onReset={(userId, email) =>
              accion(
                h.id,
                { accion: "reset", userId },
                t("members.resetSent", { email })
              )
            }
            onEditar={(userId, datos) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
                t("common.changesSaved")
              )
            }
            onEstado={(userId, activo, etiqueta) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, activo }) },
                activo ? t("members.reactivated", { name: etiqueta }) : t("members.removed", { name: etiqueta })
              )
            }
            onArchivar={() => {
              if (
                window.confirm(
                  t("admin.confirmArchive", { name: h.name })
                )
              ) {
                void ejecutar(
                  `/api/admin/hogares/${h.id}`,
                  { method: "PATCH", body: JSON.stringify({ accion: "archivar" }) },
                  t("admin.archived", { name: h.name })
                );
              }
            }}
            onRestaurar={() =>
              void ejecutar(
                `/api/admin/hogares/${h.id}`,
                { method: "PATCH", body: JSON.stringify({ accion: "restaurar" }) },
                t("admin.restored", { name: h.name })
              )
            }
            onEliminar={() => {
              const escrito = window.prompt(
                t("admin.confirmDelete", { name: h.name })
              );
              if (escrito === null) return;
              void ejecutar(
                `/api/admin/hogares/${h.id}?confirmar=${encodeURIComponent(escrito)}`,
                { method: "DELETE" },
                t("admin.deleted", { name: h.name })
              );
            }}
            onCancelar={(invitacionId, email) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros?id=${encodeURIComponent(invitacionId)}`,
                { method: "DELETE" },
                t("members.inviteCancelled", { email })
              )
            }
          />
          )}
        />
      )}

      <Actividad refrescar={version} />
      </div>
    </Pagina>
  );
}
