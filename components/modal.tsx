"use client";

import { useEffect, useRef } from "react";
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

  const dialogoRef = useRef<HTMLDivElement>(null);
  // El callback cambia en cada render del padre: se guarda en una ref para
  // que el efecto de foco no se reinicie (y le robe el foco al usuario).
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
  });

  // Último elemento enfocado FUERA de un diálogo = quien lo abrió. No sirve
  // leer document.activeElement al abrir: un campo con autoFocus ya se llevó
  // el foco durante el montaje.
  const ultimoFueraRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function alEnfocar(e: FocusEvent) {
      const el = e.target as HTMLElement | null;
      if (el && !el.closest('[role="dialog"]')) ultimoFueraRef.current = el;
    }

    document.addEventListener("focusin", alEnfocar);
    return () => document.removeEventListener("focusin", alEnfocar);
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const dialogo = dialogoRef.current;
    const quienAbrio = ultimoFueraRef.current;

    function enfocables(): HTMLElement[] {
      return Array.from(
        dialogo?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    }

    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrarRef.current();
        return;
      }

      // Tab queda dentro del diálogo: del último vuelve al primero y al revés.
      if (e.key !== "Tab") return;

      const lista = enfocables();
      if (lista.length === 0) {
        e.preventDefault();
        dialogo?.focus();
        return;
      }

      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;

      if (e.shiftKey && (activo === primero || activo === dialogo)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: el primer campo si lo hay; si no, el propio diálogo.
    const campo = dialogo?.querySelector<HTMLElement>("input, select, textarea");
    (campo ?? dialogo)?.focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
      // Devuelve el foco a quien abrió el diálogo (si sigue en la página).
      if (quienAbrio?.isConnected) quienAbrio.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[92dvh] w-full overflow-y-auto outline-none rounded-t-3xl border border-line bg-surface p-5 shadow-2xl shadow-black/40 sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-text">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("common.close")}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-raised hover:text-text"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
