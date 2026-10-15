"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

// Diálogo modal sencillo: se cierra con Escape, con el fondo o con la X.
// En móvil se pega abajo (como una hoja); en pantallas grandes va centrado.
export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!abierto) return;

    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }

    document.addEventListener("keydown", alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl shadow-black/40 sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-text">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
