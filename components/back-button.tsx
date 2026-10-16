"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n/client";

// Vuelve a la pantalla de donde se vino. Si la página se abrió directo (pestaña
// nueva, enlace pegado) no hay a dónde volver: history.length no sirve para
// saberlo (una pestaña nueva ya cuenta 2), así que se intenta retroceder y, si
// la ruta no cambió, se va al inicio.
export function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  const t = useT();

  function volver() {
    const rutaActual = window.location.pathname;

    if (window.history.length <= 1) {
      router.push(fallbackHref);
      return;
    }

    router.back();
    window.setTimeout(() => {
      if (window.location.pathname === rutaActual) router.push(fallbackHref);
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={volver}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-text-muted transition hover:bg-surface-raised hover:text-text"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      {t("common.back")}
    </button>
  );
}
