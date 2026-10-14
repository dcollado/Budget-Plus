"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { sectionCardClass } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

const CLAVE = "bp_primeros_pasos_ok";

// Welcome card for a household with no plan loaded. It can be closed and
// does not come back (per browser; if localStorage is unavailable, it just reappears).
export default function PrimerosPasos() {
  const t = useT();
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
        aria-label={t("common.close")}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-xl font-semibold text-text">{t("onboarding.welcome")}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {t("onboarding.nothingPlanned")}
      </p>

      <ol className="mt-4 space-y-3 text-sm text-text">
        <li>
          <span className="font-semibold text-gold">1.</span> {t("onboarding.review")}{" "}
          <Link href="/configuracion" className="underline">
            {t("onboarding.categoriesAccounts")}
          </Link>
          : {t("onboarding.adjust")}
        </li>
        <li>
          <span className="font-semibold text-gold">2.</span> {t("onboarding.enter")}{" "}
          <Link href="/configuracion" className="underline">
            {t("onboarding.fixedItems")}
          </Link>{" "}
          {t("onboarding.carryOver")}
        </li>
        <li>
          <span className="font-semibold text-gold">3.</span>{" "}
          {esAdmin ? (
            <>
              {t("onboarding.invite")}{" "}
              <Link href="/miembros" className="underline">
                {t("nav.members")}
              </Link>
              .
            </>
          ) : (
            <>{t("onboarding.logDaily")}</>
          )}
        </li>
      </ol>
    </div>
  );
}
