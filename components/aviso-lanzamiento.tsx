"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import type { Anuncio } from "@/lib/anuncios";
import { useLocale, useT } from "@/lib/i18n/client";
import { EVENTO_NOTIFICACIONES } from "@/components/notificaciones-campana";
import type { Notificacion } from "@/lib/notificaciones";

// Aviso de lanzamiento que se ve al entrar a la app: la novedad más reciente
// que esta persona todavía no ha leído. Va ligado a su notificación: cerrarlo
// (o abrir la novedad) la marca como leída, así no vuelve a salir.
export function AvisoLanzamiento() {
  const t = useT();
  const locale = useLocale();
  const [pendiente, setPendiente] = useState<{ id: number; anuncio: Anuncio } | null>(null);

  const cargar = useCallback(() => {
    fetch("/api/notificaciones", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const items = json.data.items as Notificacion[];
        const vigentes = json.data.anuncios as Anuncio[];
        // Solo se muestra si la novedad sigue vigente (si se apaga o vence, el aviso se va).
        for (const n of items) {
          if (n.tipo !== "novedad" || n.leida) continue;
          const anuncio = vigentes.find((a) => a.id === n.datos.id);
          if (anuncio) {
            setPendiente({ id: n.id, anuncio });
            return;
          }
        }
        setPendiente(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_NOTIFICACIONES, cargar);
    return () => window.removeEventListener(EVENTO_NOTIFICACIONES, cargar);
  }, [cargar]);

  if (!pendiente) return null;
  const { id, anuncio } = pendiente;

  async function marcarLeida() {
    setPendiente(null);
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    // La campana y, si hay otra novedad sin leer, este mismo aviso se actualizan.
    window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-text"
      >
        <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
        <p className="min-w-0 flex-1 leading-6">
          <span className="font-semibold text-gold">{t("banner.new")}</span>{" "}
          <span className="font-medium">{anuncio.titulo[locale]}.</span>{" "}
          <span className="text-text-muted">{anuncio.texto[locale]}</span>{" "}
          <Link
            href={anuncio.enlace}
            onClick={() => void marcarLeida()}
            className="font-medium text-gold underline-offset-2 hover:underline"
          >
            {t("banner.open")}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => void marcarLeida()}
          aria-label={t("banner.dismiss")}
          className="shrink-0 rounded-lg p-1 text-text-muted transition hover:bg-surface-raised hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
