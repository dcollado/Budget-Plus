"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, AuthError, authButtonClass, authInputClass } from "@/components/auth-card";
import { useT } from "@/lib/i18n/client";

export default function InvitacionPage() {
  return (
    <Suspense fallback={null}>
      <Invitacion />
    </Suspense>
  );
}

function Invitacion() {
  const router = useRouter();
  const t = useT();
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
      setError(t("common.passwordsMismatch"));
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
        setError(t.msg(json.message, "invite.errorGeneric"));
        return;
      }
      router.replace("/login");
    } catch {
      setError(t("common.connectError"));
    } finally {
      setEnviando(false);
    }
  }

  if (invalida) {
    return (
      <AuthCard
        titulo={t("invite.invalidTitle")}
        subtitulo={t("invite.invalidBody")}
      >
        <></>
      </AuthCard>
    );
  }

  if (!info) {
    return <AuthCard titulo={t("invite.loading")}>{null}</AuthCard>;
  }

  return (
    <AuthCard
      titulo={t("invite.joinTitle", { household: info.hogar })}
      subtitulo={t("invite.joinSubtitle", { email: info.email })}
    >
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="text"
          autoComplete="name"
          placeholder={t("invite.namePlaceholder")}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={enviando}
          className={authInputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder={t("invite.passwordPlaceholder")}
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
          placeholder={t("common.repeatPassword")}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          minLength={8}
          disabled={enviando}
          className={authInputClass}
        />
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? t("invite.creating") : t("invite.create")}
        </button>
      </form>
    </AuthCard>
  );
}
