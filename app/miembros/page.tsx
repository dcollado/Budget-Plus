"use client";

import { useCallback, useEffect, useState } from "react";
import { TarjetaHogar } from "@/components/admin/TarjetaHogar";
import type { HogarResumen } from "@/lib/admin/hogares";

type Mensaje = { tipo: "ok" | "error"; texto: string };

const URL_MIEMBROS = "/api/hogar/miembros";

// El admin del hogar gestiona a su gente: invitar, editar, restablecer
// contraseña, quitar/reactivar y manejar invitaciones. El hogar lo fija el
// servidor según su sesión.
export default function MiembrosPage() {
  const [hogar, setHogar] = useState<HogarResumen | null>(null);
  const [yo, setYo] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(URL_MIEMBROS, { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { hogar: HogarResumen; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setMensaje({ tipo: "error", texto: json.message ?? "No se pudieron cargar los miembros." });
      return;
    }
    setHogar(json.data.hogar);
    setYo(json.data.yo);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function ejecutar(url: string, init: RequestInit, exito: string): Promise<boolean> {
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

  const post = (cuerpo: object, exito: string) =>
    ejecutar(URL_MIEMBROS, { method: "POST", body: JSON.stringify(cuerpo) }, exito);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-gold">Mi hogar</p>
        <h1 className="font-display text-2xl font-semibold text-text">Personas</h1>
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

      {hogar === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">Cargando…</p>
      ) : (
        <TarjetaHogar
          hogar={hogar}
          yo={yo}
          ocupado={ocupado}
          onInvitar={(email, role) =>
            post({ accion: "invitar", email, role }, `Invitación enviada a ${email}.`)
          }
          onReenviar={(invitacionId, email) =>
            post({ accion: "reenviar", invitacionId }, `Invitación reenviada a ${email}.`)
          }
          onReset={(userId, email) =>
            post(
              { accion: "reset", userId },
              `Enlace para cambiar contraseña enviado a ${email}.`
            )
          }
          onEditar={(userId, datos) =>
            ejecutar(
              URL_MIEMBROS,
              { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
              "Cambios guardados."
            )
          }
          onEstado={(userId, activo, etiqueta) =>
            ejecutar(
              URL_MIEMBROS,
              { method: "PATCH", body: JSON.stringify({ userId, activo }) },
              activo ? `${etiqueta} reactivado.` : `${etiqueta} ya no tiene acceso.`
            )
          }
          onCancelar={(invitacionId, email) =>
            ejecutar(
              `${URL_MIEMBROS}?id=${encodeURIComponent(invitacionId)}`,
              { method: "DELETE" },
              `Invitación a ${email} cancelada.`
            )
          }
        />
      )}
    </main>
  );
}
