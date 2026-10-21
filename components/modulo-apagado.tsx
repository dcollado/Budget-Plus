"use client";

import { useEffect, useState } from "react";
import { Pagina } from "@/components/pagina";
import { useT } from "@/lib/i18n/client";
import type { ModuloClave, Modulos } from "@/lib/modulos";

// Envuelve la página de un módulo: si está apagado para el hogar de quien la abre,
// muestra un aviso en vez de la página. El estado sale de /api/me (el del hogar).
// Mientras se sabe, no se muestra nada para no enseñar la página de un módulo apagado.
export default function PorModulo({ clave, children }: { clave: ModuloClave; children: React.ReactNode }) {
  const t = useT();
  const [encendido, setEncendido] = useState<boolean | null>(null);

  useEffect(() => {
    let vigente = true;

    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const modulos = json?.data?.modulos as Partial<Modulos> | undefined;
        if (vigente) setEncendido(modulos?.[clave] !== false);
      })
      // Si no se puede saber, se deja pasar: la API igual protege los datos.
      .catch(() => vigente && setEncendido(true));

    return () => {
      vigente = false;
    };
  }, [clave]);

  if (encendido === null) return null;
  if (encendido) return <>{children}</>;

  return (
    <Pagina className="space-y-3">
      <h1 className="font-display text-2xl font-semibold text-text">{t("modules.unavailableTitle")}</h1>
      <p className="text-sm text-text-muted">{t("modules.unavailableText")}</p>
    </Pagina>
  );
}
