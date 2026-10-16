"use client";

import { useEffect } from "react";

// Último recurso: falla el layout raíz, así que no hay i18n ni estilos.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Global render error:", error.digest, error.message);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h2>Algo salió mal / Something went wrong</h2>
        <button onClick={() => unstable_retry()}>Reintentar / Try again</button>
      </body>
    </html>
  );
}
