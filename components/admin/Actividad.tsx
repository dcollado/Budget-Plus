"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";
import type { EventoAdmin } from "@/lib/auth/eventos";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/client";

const ETIQUETAS: Record<string, MessageKey> = {
  crear_hogar: "activity.createHousehold",
  aceptar_solicitud: "activity.acceptRequest",
  rechazar_solicitud: "activity.denyRequest",
  archivar_hogar: "activity.archiveHousehold",
  restaurar_hogar: "activity.restoreHousehold",
  eliminar_hogar: "activity.deleteHousehold",
  invitar: "activity.invite",
  reenviar_invitacion: "activity.resendInvite",
  cancelar_invitacion: "activity.cancelInvite",
  aceptar_invitacion: "activity.acceptInvite",
  quitar_miembro: "activity.removeMember",
  reactivar_miembro: "activity.reactivateMember",
  editar_miembro: "activity.editMember",
  enviar_restablecer: "activity.sendReset",
  contrasena_restablecida: "activity.passwordReset",
  contrasena_cambiada: "activity.passwordChanged",
};

// Log of who did what. Only the super-admin sees it (Admin).
export default function Actividad({ refrescar }: { refrescar: number }) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const [eventos, setEventos] = useState<EventoAdmin[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;

    fetch("/api/admin/eventos", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { data?: EventoAdmin[]; message?: string };
        if (!res.ok || !json.data) throw new Error(json.message ?? "Error");
        setEventos(json.data);
        setError("");
      })
      .catch(() => setError(t("activity.loadError")));
  }, [abierto, refrescar, t]);

  return (
    <section className={`${sectionCardClass} p-0!`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-text">{t("activity.title")}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <div className="border-t border-line px-5 py-4">
          {error ? <p className="text-sm text-rust">{error}</p> : null}
          {eventos === null && !error ? (
            <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
          ) : null}
          {eventos?.length === 0 ? (
            <p className="text-sm text-text-muted">{t("activity.empty")}</p>
          ) : null}
          <ul className="divide-y divide-line">
            {eventos?.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <p className="text-text">
                  <span className="font-medium">{e.actor || t("activity.system")}</span>{" "}
                  {ETIQUETAS[e.accion] ? t(ETIQUETAS[e.accion]) : e.accion}
                  {e.objetivo ? <span className="text-text-muted"> {e.objetivo}</span> : null}
                  {e.detalle ? <span className="text-text-muted"> ({e.detalle})</span> : null}
                </p>
                <p className="text-xs text-text-muted">
                  {e.hogar ? `${e.hogar} · ` : ""}
                  {new Date(e.at).toLocaleString(t.locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
