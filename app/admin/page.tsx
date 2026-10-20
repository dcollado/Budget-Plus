"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";
import { TarjetaHogar } from "@/components/admin/TarjetaHogar";
import Actividad from "@/components/admin/Actividad";
import Novedades from "@/components/admin/Novedades";
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

// El Admin va por pestañas para no ser una sola pantalla larga.
const PESTANAS = [
  { id: "general", clave: "admin.tabGeneral" },
  { id: "hogares", clave: "admin.tabHouseholds" },
  { id: "novedades", clave: "admin.tabNews" },
] as const satisfies readonly { id: string; clave: MessageKey }[];

type PestanaId = (typeof PESTANAS)[number]["id"];

function pestanaDelHash(): PestanaId {
  const hash = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  return PESTANAS.find((p) => p.id === hash)?.id ?? "general";
}

export default function AdminPage() {
  const t = useT();
  const [hogares, setHogares] = useState<HogarResumen[] | null>(null);
  const [yo, setYo] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Increments on every reload: the open activity list refreshes itself.
  const [version, setVersion] = useState(0);

  const [pestana, setPestana] = useState<PestanaId>("general");

  // La pestaña va en la dirección (#hogares) para poder volver a ella o compartirla.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPestana(pestanaDelHash());
    const alCambiar = () => setPestana(pestanaDelHash());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  function irA(id: PestanaId) {
    setPestana(id);
    window.history.replaceState(null, "", "#" + id);
  }

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
      </div>

      <div role="tablist" aria-label={t("admin.title")} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={"tab-" + p.id}
            aria-selected={pestana === p.id}
            aria-controls={"panel-" + p.id}
            onClick={() => irA(p.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              pestana === p.id
                ? "border-gold text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t(p.clave)}
          </button>
        ))}
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

      {pestana === "general" ? (
        <div role="tabpanel" id="panel-general" aria-labelledby="tab-general" className="space-y-6">
          <SolicitudesAcceso onDecidida={() => void cargar()} />
          <Actividad refrescar={version} abiertoAlInicio />
        </div>
      ) : null}

      {pestana === "novedades" ? (
        <div role="tabpanel" id="panel-novedades" aria-labelledby="tab-novedades">
          <Novedades onCambio={() => setVersion((v) => v + 1)} />
        </div>
      ) : null}

      {pestana === "hogares" ? (
      <div role="tabpanel" id="panel-hogares" aria-labelledby="tab-hogares" className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setNuevoAbierto((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90"
        >
          <Plus size={16} /> {t("admin.newHousehold")}
        </button>
      </div>

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
      </div>
      ) : null}
    </Pagina>
  );
}
