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
      setError("Passwords do not match.");
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
        setError(json.message ?? "Could not reset the password.");
        return;
      }
      router.replace("/login");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setEnviando(false);
    }
  }

  if (valido === null) {
    return <AuthCard titulo="Loading…">{null}</AuthCard>;
  }

  if (!valido) {
    return (
      <AuthCard
        titulo="Invalid link"
        subtitulo="The link has expired or was already used. Request a new one from the Forgot password page."
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="New password" subtitulo="Choose a password of at least 8 characters.">
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password"
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
          placeholder="Repeat the password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          minLength={8}
          disabled={enviando}
          className={authInputClass}
        />
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? "Saving..." : "Save password"}
        </button>
      </form>
    </AuthCard>
  );
}
