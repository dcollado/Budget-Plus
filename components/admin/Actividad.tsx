"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";
import type { EventoAdmin } from "@/lib/auth/eventos";

const ETIQUETAS: Record<string, string> = {
  crear_hogar: "Creó el hogar",
  archivar_hogar: "Archivó el hogar",
  restaurar_hogar: "Restauró el hogar",
  eliminar_hogar: "Eliminó el hogar",
  invitar: "Invitó a",
  reenviar_invitacion: "Reenvió la invitación a",
  cancelar_invitacion: "Canceló la invitación a",
  aceptar_invitacion: "Aceptó la invitación",
  quitar_miembro: "Quitó el acceso a",
  reactivar_miembro: "Reactivó a",
  editar_miembro: "Editó a",
  enviar_restablecer: "Envió restablecer contraseña a",
  contrasena_restablecida: "Restableció su contraseña",
};

// Registro de quién hizo qué. Solo lo ve el super-admin (Admin).
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
      .catch(() => setError("No se pudo cargar la actividad."));
  }, [abierto, refrescar]);

  return (
    <section className={`${sectionCardClass} p-0!`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-text">Actividad reciente</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <div className="border-t border-line px-5 py-4">
          {error ? <p className="text-sm text-rust">{error}</p> : null}
          {eventos === null && !error ? (
            <p className="text-sm text-text-muted">Cargando…</p>
          ) : null}
          {eventos?.length === 0 ? (
            <p className="text-sm text-text-muted">Todavía no hay actividad registrada.</p>
          ) : null}
          <ul className="divide-y divide-line">
            {eventos?.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <p className="text-text">
                  <span className="font-medium">{e.actor || "Sistema"}</span>{" "}
                  {ETIQUETAS[e.accion] ?? e.accion}
                  {e.objetivo ? <span className="text-text-muted"> {e.objetivo}</span> : null}
                  {e.detalle ? <span className="text-text-muted"> ({e.detalle})</span> : null}
                </p>
                <p className="text-xs text-text-muted">
                  {e.hogar ? `${e.hogar} · ` : ""}
                  {new Date(e.at).toLocaleString("es", {
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
