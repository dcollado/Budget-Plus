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
      // Mismo mensaje exista o no el correo.
      setEnviado(true);
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthCard
        titulo="Revisa tu correo"
        subtitulo="Si ese correo tiene una cuenta, te enviamos un enlace para elegir una nueva contraseña. Vence en 1 hora."
      >
        <></>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Recuperar contraseña"
      subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace."
    >
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={enviando}
          className={authInputClass}
        />
        <button type="submit" disabled={enviando} className={authButtonClass}>
          {enviando ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </AuthCard>
  );
}
