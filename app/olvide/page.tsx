"use client";

import { FormEvent, useState } from "react";
import { AuthCard, authButtonClass, authInputClass } from "@/components/auth-card";

export default function OlvidePage() {
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
        titulo="Check your email"
        subtitulo="If that email has an account, we sent you a link to choose a new password. It expires in 1 hour."
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Reset password"
      subtitulo="Enter your account email and we'll send you a link."
    >
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={enviando}
          className={authInputClass}
        />
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? "Sending..." : "Send link"}
        </button>
      </form>
    </AuthCard>
  );
}
