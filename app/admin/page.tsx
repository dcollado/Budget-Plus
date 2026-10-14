"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { TarjetaHogar } from "@/components/admin/TarjetaHogar";
import Actividad from "@/components/admin/Actividad";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";

type Mensaje = { tipo: "ok" | "error"; texto: string };

export default function AdminPage() {
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
      setMensaje({ tipo: "error", texto: "This section is for the super-admin only." });
      setHogares([]);
      return;
    }
    const json = (await res.json()) as {
      data?: { hogares: HogarResumen[]; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setMensaje({ tipo: "error", texto: json.message ?? "Could not load households." });
      setHogares([]);
      return;
    }
    setHogares(json.data.hogares);
    setYo(json.data.yo);
    setVersion((v) => v + 1);
  }, []);

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
        setMensaje({ tipo: "error", texto: json.message ?? "Could not complete the action." });
        return false;
      }
      const extra = json.data?.enlaceDev ? ` · Development only: ${json.data.enlaceDev}` : "";
      setMensaje({ tipo: "ok", texto: exito + extra });
      await cargar();
      return true;
    } catch {
      setMensaje({ tipo: "error", texto: "Could not connect. Please try again." });
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
      `Household "${nombreHogar.trim()}" created. Invitation sent to ${adminEmail.trim()}.`
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
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold">Administration</p>
          <h1 className="font-display text-2xl font-semibold text-text">Households and people</h1>
        </div>
        <button
          type="button"
          onClick={() => setNuevoAbierto((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90"
        >
          <Plus size={16} /> New household
        </button>
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`break-all rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-sage/30 bg-surface text-text"
              : "border-rust/30 bg-rust-soft text-rust"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {nuevoAbierto ? (
        <form onSubmit={crearHogar} className={`${sectionCardClass} space-y-4`}>
          <h2 className="text-base font-semibold text-text">New household</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="nombreHogar">Household name</label>
              <input
                id="nombreHogar"
                value={nombreHogar}
                onChange={(e) => setNombreHogar(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="adminEmail">Administrator email</label>
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
            They receive an invitation to set their name and password.
          </p>
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {ocupado ? "Sending invitation..." : "Create household and invite"}
          </button>
        </form>
      ) : null}

      {hogares === null ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        hogares.map((h) => (
          <TarjetaHogar
            key={h.id}
            hogar={h}
            yo={yo}
            ocupado={ocupado}
            onInvitar={(email, role) =>
              accion(h.id, { accion: "invitar", email, role }, `Invitation sent to ${email}.`)
            }
            onReenviar={(invitacionId, email) =>
              accion(h.id, { accion: "reenviar", invitacionId }, `Invitation resent to ${email}.`)
            }
            onReset={(userId, email) =>
              accion(
                h.id,
                { accion: "reset", userId },
                `Password change link sent to ${email}.`
              )
            }
            onEditar={(userId, datos) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
                "Changes saved."
              )
            }
            onEstado={(userId, activo, etiqueta) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, activo }) },
                activo ? `${etiqueta} reactivated.` : `${etiqueta} no longer has access.`
              )
            }
            onArchivar={() => {
              if (
                window.confirm(
                  `Archive "${h.name}"? Nobody in the household will be able to sign in. The data is kept and you can restore it.`
                )
              ) {
                void ejecutar(
                  `/api/admin/hogares/${h.id}`,
                  { method: "PATCH", body: JSON.stringify({ accion: "archivar" }) },
                  `Household "${h.name}" archived.`
                );
              }
            }}
            onRestaurar={() =>
              void ejecutar(
                `/api/admin/hogares/${h.id}`,
                { method: "PATCH", body: JSON.stringify({ accion: "restaurar" }) },
                `Household "${h.name}" restored.`
              )
            }
            onEliminar={() => {
              const escrito = window.prompt(
                `This deletes the ENTIRE household "${h.name}" and its members accounts, with no way back.

Type the exact household name to confirm:`
              );
              if (escrito === null) return;
              void ejecutar(
                `/api/admin/hogares/${h.id}?confirmar=${encodeURIComponent(escrito)}`,
                { method: "DELETE" },
                `Household "${h.name}" deleted.`
              );
            }}
            onCancelar={(invitacionId, email) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros?id=${encodeURIComponent(invitacionId)}`,
                { method: "DELETE" },
                `Invitation to ${email} cancelled.`
              )
            }
          />
        ))
      )}

      <Actividad refrescar={version} />
    </main>
  );
}
