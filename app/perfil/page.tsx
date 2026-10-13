"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";

type Perfil = {
  nombre: string;
  usuario: string;
  email: string | null;
  hogar: string | null;
  esSuperadmin: boolean;
  rol: "admin" | "member" | null;
};

const mayuscula = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setPerfil(json.data as Perfil))
      .catch(() => {});
  }, []);

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (nueva !== confirmar) {
      setMensaje({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const json = (await res.json()) as { message?: string };

      if (!res.ok) {
        setMensaje({ tipo: "error", texto: json.message ?? "No se pudo cambiar la contraseña." });
        return;
      }

      setActual("");
      setNueva("");
      setConfirmar("");
      setMensaje({
        tipo: "ok",
        texto: "Contraseña cambiada. Tus otras sesiones abiertas se cerraron.",
      });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo conectar. Intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  const rolTexto = perfil?.esSuperadmin
    ? "Super-admin"
    : perfil?.rol === "admin"
      ? "Administrador del hogar"
      : "Miembro";

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-gold">Mi cuenta</p>
        <h1 className="font-display text-2xl font-semibold text-text">Perfil</h1>
      </div>

      <section className={sectionCardClass}>
        {perfil === null ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : (
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-text-muted">Nombre</dt>
            <dd className="font-medium text-text">{mayuscula(perfil.nombre)}</dd>

            <dt className="text-text-muted">Correo</dt>
            <dd className="break-all text-text">{perfil.email ?? "Sin correo registrado"}</dd>

            <dt className="text-text-muted">Usuario</dt>
            <dd className="break-all text-text">{perfil.usuario}</dd>

            <dt className="text-text-muted">Hogar</dt>
            <dd className="text-text">{perfil.hogar ?? "Sin hogar"}</dd>

            <dt className="text-text-muted">Rol</dt>
            <dd className="text-text">{rolTexto}</dd>
          </dl>
        )}
      </section>

      <form onSubmit={cambiar} className={`${sectionCardClass} space-y-4`}>
        <h2 className="text-base font-semibold text-text">Cambiar contraseña</h2>

        {mensaje ? (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              mensaje.tipo === "ok"
                ? "border-sage/30 bg-surface text-text"
                : "border-rust/30 bg-rust-soft text-rust"
            }`}
          >
            {mensaje.texto}
          </div>
        ) : null}

        <div>
          <label className={labelClass} htmlFor="actual">Contraseña actual</label>
          <input
            id="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className={`${fieldBaseClass} ${fieldNormalClass}`}
            required
            disabled={enviando}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="nueva">Contraseña nueva</label>
            <input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
              required
              minLength={8}
              disabled={enviando}
            />
            <p className={helperTextClass}>Mínimo 8 caracteres.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="confirmar">Repite la nueva</label>
            <input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
              required
              minLength={8}
              disabled={enviando}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </main>
  );
}
