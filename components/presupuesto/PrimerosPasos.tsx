"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";

const CLAVE = "bp_primeros_pasos_ok";

// Welcome card for a household with no plan loaded. It can be closed and
// does not come back (per browser; if localStorage is unavailable, it just reappears).
export default function PrimerosPasos() {
  // Solo se monta con el hogar ya cargado (después de hidratar), así que leer
  // localStorage al inicializar no desajusta el HTML del servidor.
  const [cerrada, setCerrada] = useState(() => {
    try {
      return window.localStorage.getItem(CLAVE) === "1";
    } catch {
      return false;
    }
  });
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setEsAdmin(json?.data?.rol === "admin"))
      .catch(() => {});
  }, []);

  if (cerrada) return null;

  function cerrar() {
    setCerrada(true);
    try {
      window.localStorage.setItem(CLAVE, "1");
    } catch {
      // without localStorage: it reappears next time, no big deal.
    }
  }

  return (
    <div className={`${sectionCardClass} relative mb-6 border-gold/40`}>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-xl font-semibold text-text">Welcome to your household</h2>
      <p className="mt-1 text-sm text-text-muted">
        Nothing is planned yet. Three steps to get going:
      </p>

      <ol className="mt-4 space-y-3 text-sm text-text">
        <li>
          <span className="font-semibold text-gold">1.</span> Review your{" "}
          <Link href="/configuracion" className="underline">
            categories and accounts
          </Link>
          : adjust the names to fit your reality.
        </li>
        <li>
          <span className="font-semibold text-gold">2.</span> Enter your{" "}
          <Link href="/configuracion" className="underline">
            fixed expenses and income
          </Link>{" "}
          just once; they carry over month to month.
        </li>
        <li>
          <span className="font-semibold text-gold">3.</span>{" "}
          {esAdmin ? (
            <>
              Invite your people from{" "}
              <Link href="/miembros" className="underline">
                Members
              </Link>
              .
            </>
          ) : (
            <>Log your day-to-day expenses in the budget.</>
          )}
        </li>
      </ol>
    </div>
  );
}
