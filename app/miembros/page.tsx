"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";

type Miembro = {
  userId: string;
  nombre: string;
  email: string | null;
  role: string;
  activo: boolean;
};
type Invitacion = { id: string; email: string; role: string; venceEn: string };

export default function MiembrosPage() {
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [yo, setYo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/hogar/miembros", { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { miembros: Miembro[]; invitaciones: Invitacion[]; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setError(json.message ?? "No se pudieron cargar los miembros.");
      setMiembros([]);
      return;
    }
    setMiembros(json.data.miembros);
    setInvitaciones(json.data.invitaciones);
    setYo(json.data.yo);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function llamar(url: string, init: RequestInit): Promise<boolean> {
    setError("");
    setAviso("");
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const json = (await res.json()) as { message?: string; data?: { enlaceDev?: string } };
    if (!res.ok) {
      setError(json.message ?? "No se pudo completar la acción.");
      return false;
    }
    if (json.data?.enlaceDev) {
      setAviso(`Solo desarrollo: ${json.data.enlaceDev}`);
    }
    await cargar();
    return true;
  }

  async function invitar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const ok = await llamar("/api/hogar/miembros", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (ok) {
        setEmail("");
        setAviso((previo) => previo || `Invitación enviada a ${email.trim()}.`);
      }
    } finally {
      setEnviando(false);
    }
  }

  function cambiarEstado(m: Miembro, activo: boolean) {
    if (
      !activo &&
      !window.confirm(`¿Quitar a ${m.nombre || m.email}? Ya no podrá entrar a la app.`)
    ) {
      return;
    }
    void llamar("/api/hogar/miembros", {
      method: "PATCH",
      body: JSON.stringify({ userId: m.userId, activo }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-gold">Hogar</p>
        <h1 className="font-display text-2xl font-semibold text-text">Miembros</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
          {error}
        </div>
      ) : null}
      {aviso ? (
        <div className="break-all rounded-xl border border-sage/30 bg-surface px-4 py-3 text-sm text-text">
          {aviso}
        </div>
      ) : null}

      <form onSubmit={invitar} className={`${sectionCardClass} space-y-3`}>
        <h2 className="text-base font-semibold text-text">Invitar por correo</h2>
        <div>
          <label className={labelClass} htmlFor="emailInvitado">
            Correo de la persona
          </label>
          <input
            id="emailInvitado"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${fieldBaseClass} ${fieldNormalClass}`}
            required
          />
          <p className={helperTextClass}>
            Recibirá un enlace (vence en 7 días) para crear su contraseña.
          </p>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar invitación"}
        </button>
      </form>

      <section className={sectionCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">Personas</h2>
        {miembros === null ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : (
          <ul className="divide-y divide-line">
            {miembros.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {m.nombre || m.email}
                    {m.userId === yo ? " (tú)" : ""}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {m.email ?? "sin correo"} · {m.role === "admin" ? "admin" : "miembro"}
                    {m.activo ? "" : " · desactivado"}
                  </p>
                </div>
                {m.userId === yo ? null : m.activo ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(m, false)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-rust transition hover:bg-rust/10"
                  >
                    Quitar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(m, true)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-sage transition hover:bg-sage/10"
                  >
                    Reactivar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {invitaciones.length > 0 ? (
        <section className={sectionCardClass}>
          <h2 className="mb-3 text-base font-semibold text-text">Invitaciones pendientes</h2>
          <ul className="divide-y divide-line">
            {invitaciones.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{i.email}</p>
                  <p className="text-xs text-text-muted">
                    Vence el {new Date(i.venceEn).toLocaleDateString("es")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void llamar(`/api/hogar/miembros?id=${encodeURIComponent(i.id)}`, {
                      method: "DELETE",
                    })
                  }
                  className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-rust transition hover:bg-rust/10"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
