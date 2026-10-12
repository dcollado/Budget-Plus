"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronDown, Mail, Pencil, Plus, RotateCcw, Send, UserMinus, X } from "lucide-react";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";

type Mensaje = { tipo: "ok" | "error"; texto: string };

const botonAccion =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60";

export default function AdminPage() {
  const [hogares, setHogares] = useState<HogarResumen[] | null>(null);
  const [yo, setYo] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombreHogar, setNombreHogar] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/hogares", { cache: "no-store" });
    if (res.status === 403) {
      setMensaje({ tipo: "error", texto: "Esta sección es solo para el super-admin." });
      setHogares([]);
      return;
    }
    const json = (await res.json()) as {
      data?: { hogares: HogarResumen[]; yo: string };
      message?: string;
    };
    if (!res.ok || !json.data) {
      setMensaje({ tipo: "error", texto: json.message ?? "No se pudieron cargar los hogares." });
      setHogares([]);
      return;
    }
    setHogares(json.data.hogares);
    setYo(json.data.yo);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Una sola vía para todas las acciones: muestra el resultado y recarga.
  async function ejecutar(
    url: string,
    init: RequestInit,
    exito: string
  ): Promise<boolean> {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as { message?: string; data?: { enlaceDev?: string } };
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: json.message ?? "No se pudo completar la acción." });
        return false;
      }
      const extra = json.data?.enlaceDev ? ` · Solo desarrollo: ${json.data.enlaceDev}` : "";
      setMensaje({ tipo: "ok", texto: exito + extra });
      await cargar();
      return true;
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo conectar. Intenta de nuevo." });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crearHogar(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(
      "/api/admin/hogares",
      { method: "POST", body: JSON.stringify({ nombreHogar, adminEmail }) },
      `Hogar «${nombreHogar.trim()}» creado. Invitación enviada a ${adminEmail.trim()}.`
    );
    if (ok) {
      setNombreHogar("");
      setAdminEmail("");
      setNuevoAbierto(false);
    }
  }

  const accion = (id: string, cuerpo: object, exito: string) =>
    ejecutar(
      `/api/admin/hogares/${id}/miembros`,
      { method: "POST", body: JSON.stringify(cuerpo) },
      exito
    );

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold">Administración</p>
          <h1 className="font-display text-2xl font-semibold text-text">Hogares y personas</h1>
        </div>
        <button
          type="button"
          onClick={() => setNuevoAbierto((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90"
        >
          <Plus size={16} /> Nuevo hogar
        </button>
      </div>

      {mensaje ? (
        <div
          role="status"
          className={`break-all rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-sage/30 bg-surface text-text"
              : "border-rust/30 bg-rust-soft text-rust"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {nuevoAbierto ? (
        <form onSubmit={crearHogar} className={`${sectionCardClass} space-y-4`}>
          <h2 className="text-base font-semibold text-text">Nuevo hogar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <p className={helperTextClass}>
            Le llega una invitación para crear su nombre y contraseña.
          </p>
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {ocupado ? "Enviando invitación..." : "Crear hogar e invitar"}
          </button>
        </form>
      ) : null}

      {hogares === null ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : (
        hogares.map((h) => (
          <TarjetaHogar
            key={h.id}
            hogar={h}
            yo={yo}
            ocupado={ocupado}
            onInvitar={(email, role) =>
              accion(h.id, { accion: "invitar", email, role }, `Invitación enviada a ${email}.`)
            }
            onReenviar={(invitacionId, email) =>
              accion(h.id, { accion: "reenviar", invitacionId }, `Invitación reenviada a ${email}.`)
            }
            onReset={(userId, email) =>
              accion(
                h.id,
                { accion: "reset", userId },
                `Enlace para cambiar contraseña enviado a ${email}.`
              )
            }
            onEditar={(userId, datos) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, ...datos }) },
                "Cambios guardados."
              )
            }
            onEstado={(userId, activo, etiqueta) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros`,
                { method: "PATCH", body: JSON.stringify({ userId, activo }) },
                activo ? `${etiqueta} reactivado.` : `${etiqueta} ya no tiene acceso.`
              )
            }
            onCancelar={(invitacionId, email) =>
              ejecutar(
                `/api/admin/hogares/${h.id}/miembros?id=${encodeURIComponent(invitacionId)}`,
                { method: "DELETE" },
                `Invitación a ${email} cancelada.`
              )
            }
          />
        ))
      )}
    </main>
  );
}

function TarjetaHogar({
  hogar,
  yo,
  ocupado,
  onInvitar,
  onReenviar,
  onReset,
  onEstado,
  onEditar,
  onCancelar,
}: {
  hogar: HogarResumen;
  yo: string;
  ocupado: boolean;
  onInvitar: (email: string, role: "admin" | "member") => Promise<boolean>;
  onReenviar: (invitacionId: string, email: string) => void;
  onReset: (userId: string, email: string) => void;
  onEstado: (userId: string, activo: boolean, etiqueta: string) => void;
  onEditar: (
    userId: string,
    datos: { nombre: string; email: string; role: "admin" | "member" }
  ) => Promise<boolean>;
  onCancelar: (invitacionId: string, email: string) => void;
}) {
  const [abierto, setAbierto] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  // Persona en edición y su borrador.
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState({
    nombre: "",
    email: "",
    role: "member" as "admin" | "member",
  });

  async function guardarEdicion(e: FormEvent, userId: string) {
    e.preventDefault();
    if (await onEditar(userId, borrador)) setEditando(null);
  }

  async function invitar(e: FormEvent) {
    e.preventDefault();
    if (await onInvitar(email.trim(), role)) {
      setEmail("");
      setRole("member");
    }
  }

  const activos = hogar.miembros.filter((m) => m.activo).length;

  return (
    <section className={`${sectionCardClass} p-0!`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-base font-semibold text-text">{hogar.name}</span>
          <span className="block text-xs text-text-muted">
            {activos} {activos === 1 ? "persona" : "personas"}
            {hogar.invitaciones.length > 0
              ? ` · ${hogar.invitaciones.length} invitación${hogar.invitaciones.length === 1 ? "" : "es"} pendiente${hogar.invitaciones.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <div className="space-y-5 border-t border-line px-5 py-4">
          <ul className="divide-y divide-line">
            {hogar.miembros.map((m) => {
              const etiqueta = m.nombre || m.email || "La persona";
              const soyYo = m.userId === yo;

              if (editando === m.userId) {
                return (
                  <li key={m.userId} className="py-3">
                    <form
                      onSubmit={(e) => void guardarEdicion(e, m.userId)}
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <label className={labelClass} htmlFor={`n-${m.userId}`}>Nombre</label>
                        <input
                          id={`n-${m.userId}`}
                          value={borrador.nombre}
                          onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                          className={`${fieldBaseClass} ${fieldNormalClass}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`e-${m.userId}`}>Correo</label>
                        <input
                          id={`e-${m.userId}`}
                          type="email"
                          value={borrador.email}
                          onChange={(e) => setBorrador({ ...borrador, email: e.target.value })}
                          className={`${fieldBaseClass} ${fieldNormalClass}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`r-${m.userId}`}>Rol</label>
                        <select
                          id={`r-${m.userId}`}
                          value={borrador.role}
                          onChange={(e) =>
                            setBorrador({ ...borrador, role: e.target.value as "admin" | "member" })
                          }
                          className={`${fieldBaseClass} ${fieldNormalClass}`}
                        >
                          <option value="member">Miembro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 sm:col-span-3">
                        <button
                          type="submit"
                          disabled={ocupado}
                          className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="rounded-xl px-4 py-2 text-sm text-text-muted transition hover:bg-surface-raised hover:text-text"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                    {m.email ? (
                      <p className={helperTextClass}>
                        Si cambias el correo, la persona entra con el nuevo.
                      </p>
                    ) : null}
                  </li>
                );
              }

              return (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {etiqueta}
                      {soyYo ? " (tú)" : ""}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {m.email ?? "sin correo"} · {m.role === "admin" ? "admin" : "miembro"}
                      {m.activo ? "" : " · sin acceso"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        setBorrador({
                          nombre: m.nombre,
                          email: m.email ?? "",
                          role: m.role === "admin" ? "admin" : "member",
                        });
                        setEditando(m.userId);
                      }}
                      className={`${botonAccion} text-text-muted hover:bg-surface-raised hover:text-text`}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    {m.activo && m.email ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onReset(m.userId, m.email!)}
                        className={`${botonAccion} text-text-muted hover:bg-surface-raised hover:text-text`}
                        title="Enviar enlace para que cambie su contraseña"
                      >
                        <Mail size={14} /> Restablecer contraseña
                      </button>
                    ) : null}
                    {soyYo ? null : m.activo ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => {
                          if (window.confirm(`¿Quitar a ${etiqueta}? Ya no podrá entrar a la app.`)) {
                            onEstado(m.userId, false, etiqueta);
                          }
                        }}
                        className={`${botonAccion} text-rust hover:bg-rust/10`}
                      >
                        <UserMinus size={14} /> Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onEstado(m.userId, true, etiqueta)}
                        className={`${botonAccion} text-sage hover:bg-sage/10`}
                      >
                        <RotateCcw size={14} /> Reactivar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {hogar.invitaciones.length > 0 ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Invitaciones pendientes
              </h3>
              <ul className="divide-y divide-line">
                {hogar.invitaciones.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{i.email}</p>
                      <p className="text-xs text-text-muted">
                        {i.role === "admin" ? "admin" : "miembro"} · vence el{" "}
                        {new Date(i.venceEn).toLocaleDateString("es")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onReenviar(i.id, i.email)}
                        className={`${botonAccion} text-gold hover:bg-gold/10`}
                      >
                        <Send size={14} /> Reenviar
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onCancelar(i.id, i.email)}
                        className={`${botonAccion} text-rust hover:bg-rust/10`}
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form onSubmit={invitar} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className={labelClass} htmlFor={`inv-${hogar.id}`}>
                Agregar persona por correo
              </label>
              <input
                id={`inv-${hogar.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@correo.com"
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`rol-${hogar.id}`}>Rol</label>
              <select
                id={`rol-${hogar.id}`}
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
            >
              Invitar
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
