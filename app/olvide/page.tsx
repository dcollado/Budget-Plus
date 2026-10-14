"use client";

import { FormEvent, useState } from "react";
import { AuthCard, authButtonClass, authInputClass } from "@/components/auth-card";
import { useT } from "@/lib/i18n/client";

export default function OlvidePage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fetch("/api/password/olvide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      // Same message whether or not the email exists.
      setEnviado(true);
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthCard
        titulo={t("forgot.checkEmail")}
        subtitulo={t("forgot.sentBody")}
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo={t("forgot.title")}
      subtitulo={t("forgot.subtitle")}
    >
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="email"
          autoComplete="email"
          placeholder={t("forgot.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={enviando}
          className={authInputClass}
        />
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? t("forgot.sending") : t("forgot.send")}
        </button>
      </form>
    </AuthCard>
  );
}
