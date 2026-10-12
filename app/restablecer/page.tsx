"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, AuthError, authButtonClass, authInputClass } from "@/components/auth-card";

export default function RestablecerPage() {
  return (
    <Suspense fallback={null}>
      <Restablecer />
    </Suspense>
  );
}

function Restablecer() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [valido, setValido] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/password/restablecer?token=${encodeURIComponent(token)}`)
      .then((res) => setValido(res.ok))
      .catch(() => setValido(false));
  }, [token]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/password/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message ?? "No se pudo restablecer la contraseña.");
        return;
      }
      router.replace("/login");
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (valido === null) {
    return <AuthCard titulo="Cargando…">{null}</AuthCard>;
  }

  if (!valido) {
    return (
      <AuthCard
        titulo="Enlace no válido"
        subtitulo="El enlace venció o ya se usó. Solicita uno nuevo desde «Olvidé mi contraseña»."
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Nueva contraseña" subtitulo="Elige una contraseña de al menos 8 caracteres.">
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={enviando}
          className={authInputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          minLength={8}
          disabled={enviando}
          className={authInputClass}
        />
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthCard>
  );
}
