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
  // Sube cada vez que se recarga: la actividad abierta se actualiza sola.
  const [version, setVersion] = useState(0);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombreHogar, setNombreHogar] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/hogares", { cache: "no-store" });
    if (res.status === 403) {
      setMensaje({ tipo: "error", texto: "Esta sección es solo para el super-admin." });
      setHogares([]);
      return;
    }
    const json = (await res.json()) as {
      data?: { hogares: HogarResumen[]; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setMensaje({ tipo: "error", texto: json.message ?? "No se pudieron cargar los hogares." });
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

  // Una sola vía para todas las acciones: muestra el resultado y recarga.
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
        setMensaje({ tipo: "error", texto: json.message ?? "No se pudo completar la acción." });
        return false;
      }
      const extra = json.data?.enlaceDev ? ` · Solo desarrollo: ${json.data.enlaceDev}` : "";
      setMensaje({ tipo: "ok", texto: exito + extra });
      await cargar();
      return true;
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo conectar. Intenta de nuevo." });
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
      `Hogar «${nombreHogar.trim()}» creado. Invitación enviada a ${adminEmail.trim()}.`
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
          <p className="text-sm font-medium text-gold">Administración</p>
          <h1 className="font-display text-2xl font-semibold text-text">Hogares y personas</h1>
        </div>
        <button
          type="button"
          onClick={() => setNuevoAbierto((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90"
        >
          <Plus size={16} /> Nuevo hogar
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
          <h2 className="text-base font-semibold text-text">Nuevo hogar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="nombreHogar">Nombre del hogar</label>
              <input
                id="nombreHogar"
                value={nombreHogar}
                onChange={(e) => setNombreHogar(e.target.value)}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="adminEmail">Correo del administrador</label>
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
            Le llega una invitación para crear su nombre y contraseña.
          </p>
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {ocupado ? "Enviando invitación..." : "Crear hogar e invitar"}
          </button>
        </form>
      ) : null}

      {hogares === null ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : (
        hogares.map((h) => (
          <TarjetaHogar
            key={h.id}
            hogar={h}
            yo={yo}
            ocupado={ocupado}
            onInvitar={(email, role) =>
              accion(h.id, { accion: "invitar", email, role }, `Invitación enviada a ${email}.`)
            }
            onReenviar={(invitacionId, email) =>
              accion(h.id, { accion: "reenviar", invitacionId }, `Invitación reenviada a ${email}.`)
            }
            onReset={(userId, email) =>
              accion(
                h.id,
                { accion: "reset", userId },
                `Enlace para cambiar contraseña enviado a ${email}.`
              )
            }
            onEditar={(userId, datos) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
                "Cambios guardados."
              )
            }
            onEstado={(userId, activo, etiqueta) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, activo }) },
                activo ? `${etiqueta} reactivado.` : `${etiqueta} ya no tiene acceso.`
              )
            }
            onArchivar={() => {
              if (
                window.confirm(
                  `¿Archivar «${h.name}»? Nadie del hogar podrá entrar. Los datos se conservan y puedes restaurarlo.`
                )
              ) {
                void ejecutar(
                  `/api/admin/hogares/${h.id}`,
                  { method: "PATCH", body: JSON.stringify({ accion: "archivar" }) },
                  `Hogar «${h.name}» archivado.`
                );
              }
            }}
            onRestaurar={() =>
              void ejecutar(
                `/api/admin/hogares/${h.id}`,
                { method: "PATCH", body: JSON.stringify({ accion: "restaurar" }) },
                `Hogar «${h.name}» restaurado.`
              )
            }
            onEliminar={() => {
              const escrito = window.prompt(
                `Esto borra TODO el hogar «${h.name}» y las cuentas de sus miembros, sin vuelta atrás.

Escribe el nombre exacto del hogar para confirmar:`
              );
              if (escrito === null) return;
              void ejecutar(
                `/api/admin/hogares/${h.id}?confirmar=${encodeURIComponent(escrito)}`,
                { method: "DELETE" },
                `Hogar «${h.name}» eliminado.`
              );
            }}
            onCancelar={(invitacionId, email) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros?id=${encodeURIComponent(invitacionId)}`,
                { method: "DELETE" },
                `Invitación a ${email} cancelada.`
              )
            }
          />
        ))
      )}

      <Actividad refrescar={version} />
    </main>
  );
}
