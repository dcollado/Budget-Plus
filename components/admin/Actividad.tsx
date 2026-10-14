"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";
import type { EventoAdmin } from "@/lib/auth/eventos";

const ETIQUETAS: Record<string, string> = {
  crear_hogar: "Created the household",
  archivar_hogar: "Archived the household",
  restaurar_hogar: "Restored the household",
  eliminar_hogar: "Deleted the household",
  invitar: "Invited",
  reenviar_invitacion: "Resent the invitation to",
  cancelar_invitacion: "Cancelled the invitation to",
  aceptar_invitacion: "Accepted the invitation",
  quitar_miembro: "Removed access for",
  reactivar_miembro: "Reactivated",
  editar_miembro: "Edited",
  enviar_restablecer: "Sent a password reset to",
  contrasena_restablecida: "Reset their password",
  contrasena_cambiada: "Changed their password",
};

// Log of who did what. Only the super-admin sees it (Admin).
export default function Actividad({ refrescar }: { refrescar: number }) {
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
      .catch(() => setError("Could not load activity."));
  }, [abierto, refrescar]);

  return (
    <section className={`${sectionCardClass} p-0!`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-text">Recent activity</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <div className="border-t border-line px-5 py-4">
          {error ? <p className="text-sm text-rust">{error}</p> : null}
          {eventos === null && !error ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : null}
          {eventos?.length === 0 ? (
            <p className="text-sm text-text-muted">No activity recorded yet.</p>
          ) : null}
          <ul className="divide-y divide-line">
            {eventos?.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <p className="text-text">
                  <span className="font-medium">{e.actor || "System"}</span>{" "}
                  {ETIQUETAS[e.accion] ?? e.accion}
                  {e.objetivo ? <span className="text-text-muted"> {e.objetivo}</span> : null}
                  {e.detalle ? <span className="text-text-muted"> ({e.detalle})</span> : null}
                </p>
                <p className="text-xs text-text-muted">
                  {e.hogar ? `${e.hogar} · ` : ""}
                  {new Date(e.at).toLocaleString("en", {
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
