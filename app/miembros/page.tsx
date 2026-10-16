"use client";

import { useCallback, useEffect, useState } from "react";
import { TarjetaHogar } from "@/components/admin/TarjetaHogar";
import type { HogarResumen } from "@/lib/admin/hogares";
import { useT } from "@/lib/i18n/client";
import { Pagina } from "@/components/pagina";

type Mensaje = { tipo: "ok" | "error"; texto: string };

const URL_MIEMBROS = "/api/hogar/miembros";

// The household admin manages their people: invite, edit, reset
// password, remove/reactivate and manage invitations. The household is set
// by the server from their session.
export default function MiembrosPage() {
  const t = useT();
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
      setMensaje({ tipo: "error", texto: t.msg(json.message, "members.loadError") });
      return;
    }
    setHogar(json.data.hogar);
    setYo(json.data.yo);
  }, [t]);

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

  const post = (cuerpo: object, exito: string) =>
    ejecutar(URL_MIEMBROS, { method: "POST", body: JSON.stringify(cuerpo) }, exito);

  return (
    <Pagina ancho="normal" className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gold">{t("members.kicker")}</p>
        <h1 className="font-display text-2xl font-semibold text-text">{t("members.title")}</h1>
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

      {hogar === null ? (
        mensaje ? null : <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
      ) : (
        <TarjetaHogar
          hogar={hogar}
          yo={yo}
          ocupado={ocupado}
          onInvitar={(email, role) =>
            post({ accion: "invitar", email, role }, t("members.inviteSent", { email }))
          }
          onReenviar={(invitacionId, email) =>
            post({ accion: "reenviar", invitacionId }, t("members.inviteResent", { email }))
          }
          onReset={(userId, email) =>
            post(
              { accion: "reset", userId },
              t("members.resetSent", { email })
            )
          }
          onEditar={(userId, datos) =>
            ejecutar(
              URL_MIEMBROS,
              { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
              t("common.changesSaved")
            )
          }
          onEstado={(userId, activo, etiqueta) =>
            ejecutar(
              URL_MIEMBROS,
              { method: "PATCH", body: JSON.stringify({ userId, activo }) },
              activo ? t("members.reactivated", { name: etiqueta }) : t("members.removed", { name: etiqueta })
            )
          }
          onCancelar={(invitacionId, email) =>
            ejecutar(
              `${URL_MIEMBROS}?id=${encodeURIComponent(invitacionId)}`,
              { method: "DELETE" },
              t("members.inviteCancelled", { email })
            )
          }
        />
      )}
    </Pagina>
  );
}
