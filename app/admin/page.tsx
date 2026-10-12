"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";

type Creado = { usuario: string; passwordTemporal: string; hogar: string };

export default function AdminPage() {
  const [hogares, setHogares] = useState<HogarResumen[] | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);

  const [nombreHogar, setNombreHogar] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/hogares", { cache: "no-store" });
    if (res.status === 403) {
      setError("Esta sección es solo para el super-admin.");
      setHogares([]);
      return;
    }
    const json = (await res.json()) as { data?: HogarResumen[]; message?: string };
    if (!res.ok) {
      setError(json.message ?? "No se pudieron cargar los hogares.");
      setHogares([]);
      return;
    }
    setHogares(json.data ?? []);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setCreado(null);

    try {
      const res = await fetch("/api/admin/hogares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreHogar, adminNombre, adminEmail }),
      });
      const json = (await res.json()) as {
        data?: { usuario: string; passwordTemporal: string };
        message?: string;
      };
      if (!res.ok || !json.data) {
        setError(json.message ?? "No se pudo crear el hogar.");
        return;
      }
      setCreado({ ...json.data, hogar: nombreHogar.trim() });
      setNombreHogar("");
      setAdminNombre("");
      setAdminEmail("");
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-text">Hogares</h1>

      {error ? <p className="text-sm text-rust">{error}</p> : null}

      {creado ? (
        <div className={`${sectionCardClass} border-gold`}>
          <p className="text-sm font-medium text-text">
            Hogar «{creado.hogar}» creado. Entrégale estos datos al administrador:
          </p>
          <p className="mt-2 text-sm text-text">
            Usuario: <span className="font-mono">{creado.usuario}</span>
          </p>
          <p className="text-sm text-text">
            Contraseña temporal:{" "}
            <span className="font-mono">{creado.passwordTemporal}</span>
          </p>
          <p className={helperTextClass}>
            Se muestra una sola vez y no queda guardada en claro.
          </p>
        </div>
      ) : null}

      <form onSubmit={crear} className={`${sectionCardClass} space-y-4`}>
        <h2 className="text-base font-semibold text-text">Nuevo hogar</h2>
        <div>
          <label className={labelClass} htmlFor="nombreHogar">Nombre del hogar</label>
          <input
            id="nombreHogar"
            value={nombreHogar}
            onChange={(e) => setNombreHogar(e.target.value)}
            className={`${fieldBaseClass} ${fieldNormalClass}`}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="adminNombre">Administrador</label>
            <input
              id="adminNombre"
              value={adminNombre}
              onChange={(e) => setAdminNombre(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="adminEmail">Correo del administrador</label>
            <input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
        >
          {guardando ? "Creando..." : "Crear hogar"}
        </button>
      </form>

      <section className="space-y-3">
        {hogares === null ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : (
          hogares.map((h) => (
            <div key={h.id} className={sectionCardClass}>
              <p className="text-base font-semibold text-text">{h.name}</p>
              <ul className="mt-2 space-y-1">
                {h.miembros.map((m) => (
                  <li key={m.userId} className="text-sm text-text-muted">
                    {m.nombre || m.email} · {m.email ?? "sin correo"} ·{" "}
                    <span className="text-text">{m.role === "admin" ? "admin" : "miembro"}</span>
                    {m.activo ? "" : " · desactivado"}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
