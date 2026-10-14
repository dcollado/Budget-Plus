"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, AuthError, authButtonClass, authInputClass } from "@/components/auth-card";

export default function InvitacionPage() {
  return (
    <Suspense fallback={null}>
      <Invitacion />
    </Suspense>
  );
}

function Invitacion() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [info, setInfo] = useState<{ email: string; hogar: string } | null>(null);
  const [invalida, setInvalida] = useState(false);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/invitacion?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) return setInvalida(true);
        const json = (await res.json()) as { data: { email: string; hogar: string } };
        setInfo(json.data);
      })
      .catch(() => setInvalida(true));
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
      const res = await fetch("/api/invitacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nombre, password }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message ?? "Could not accept the invitation.");
        return;
      }
      router.replace("/login");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setEnviando(false);
    }
  }

  if (invalida) {
    return (
      <AuthCard
        titulo="Invalid invitation"
        subtitulo="The link has expired or was already used. Ask the administrator to send you a new one."
      >
        <></>
      </AuthCard>
    );
  }

  if (!info) {
    return <AuthCard titulo="Loading invitation…">{null}</AuthCard>;
  }

  return (
    <AuthCard
      titulo={`Join ${info.hogar}`}
      subtitulo={`Create your account for ${info.email}. That email will be your username to sign in.`}
    >
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="text"
          autoComplete="name"
          placeholder="Your name (as others in the household will see it)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={enviando}
          className={authInputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Password (minimum 8 characters)"
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
          {enviando ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
