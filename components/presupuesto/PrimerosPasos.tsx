"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";

const CLAVE = "bp_primeros_pasos_ok";

// Tarjeta de bienvenida para un hogar sin plan cargado. Se puede cerrar y
// no vuelve (por navegador; si localStorage no está, simplemente reaparece).
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
      // sin localStorage: reaparece la próxima vez, no pasa nada.
    }
  }

  return (
    <div className={`${sectionCardClass} relative mb-6 border-gold/40`}>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-xl font-semibold text-text">Bienvenido a tu hogar</h2>
      <p className="mt-1 text-sm text-text-muted">
        Todavía no hay nada planeado. Tres pasos para dejarlo andando:
      </p>

      <ol className="mt-4 space-y-3 text-sm text-text">
        <li>
          <span className="font-semibold text-gold">1.</span> Revisa tus{" "}
          <Link href="/configuracion" className="underline">
            categorías y cuentas
          </Link>
          : ajusta los nombres a tu realidad.
        </li>
        <li>
          <span className="font-semibold text-gold">2.</span> Carga tus{" "}
          <Link href="/configuracion" className="underline">
            gastos e ingresos fijos
          </Link>{" "}
          una sola vez; se heredan mes a mes.
        </li>
        <li>
          <span className="font-semibold text-gold">3.</span>{" "}
          {esAdmin ? (
            <>
              Invita a tu gente desde{" "}
              <Link href="/miembros" className="underline">
                Miembros
              </Link>
              .
            </>
          ) : (
            <>Anota tus gastos del día a día en el presupuesto.</>
          )}
        </li>
      </ol>
    </div>
  );
}
