"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

// Ícono "i" con una explicación corta. Se abre con el mouse, con el foco del
// teclado o tocándolo (móvil); se cierra con Escape o tocando fuera. El
// globo se ancla al contenedor posicionado (relative) más cercano, así que
// `className` elige de qué lado queda (left-0 / right-0).
export function InfoTip({
  texto,
  etiqueta,
  className = "left-0",
}: {
  texto: string;
  etiqueta: string;
  className?: string;
}) {
  const [fijo, setFijo] = useState(false);
  const [encima, setEncima] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const visible = fijo || encima;

  useEffect(() => {
    if (!visible) return;

    function alTocarFuera(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setFijo(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFijo(false);
        setEncima(false);
      }
    }

    document.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [visible]);

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
    >
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={visible}
        aria-describedby={visible ? id : undefined}
        onClick={() => setFijo((v) => !v)}
        className="rounded-full p-1 text-text-muted transition hover:text-text"
      >
        <Info size={13} aria-hidden="true" />
      </button>

      {visible ? (
        <span role="tooltip" id={id} className={`absolute top-full z-20 w-64 max-w-[calc(100vw-2rem)] pt-1 ${className}`}>
          <span className="block rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-text shadow-lg">
            {texto}
          </span>
        </span>
      ) : null}
    </span>
  );
}
