"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, AuthError, authButtonClass, authInputClass } from "@/components/auth-card";
import { useT } from "@/lib/i18n/client";

export default function RestablecerPage() {
  return (
    <Suspense fallback={null}>
      <Restablecer />
    </Suspense>
  );
}

function Restablecer() {
  const router = useRouter();
  const t = useT();
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
      setError(t("common.passwordsMismatch"));
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
        setError(t.msg(json.message, "reset.errorGeneric"));
        return;
      }
      router.replace("/login");
    } catch {
      setError(t("common.connectError"));
    } finally {
      setEnviando(false);
    }
  }

  if (valido === null) {
    return <AuthCard titulo={t("common.loadingEllipsis")}>{null}</AuthCard>;
  }

  if (!valido) {
    return (
      <AuthCard
        titulo={t("reset.invalidTitle")}
        subtitulo={t("reset.invalidBody")}
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo={t("reset.title")} subtitulo={t("reset.subtitle")}>
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          placeholder={t("reset.newPlaceholder")}
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
          {enviando ? t("common.saving") : t("reset.save")}
        </button>
      </form>
    </AuthCard>
  );
}
