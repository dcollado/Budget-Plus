"use client";

import { FormEvent, useState } from "react";
import {
  Archive,
  ChevronDown,
  Mail,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import type { HogarResumen } from "@/lib/admin/hogares";

const botonAccion =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60";

// Card for a household with its people and invitations. Used by /admin
// (super-admin, all households) and /miembros (admin, only their own).
export function TarjetaHogar({
  hogar,
  yo,
  ocupado,
  onInvitar,
  onReenviar,
  onReset,
  onEstado,
  onEditar,
  onCancelar,
  onArchivar,
  onRestaurar,
  onEliminar,
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
  // Only the super-admin passes these (Admin); /miembros does not show them.
  onArchivar?: () => void;
  onRestaurar?: () => void;
  onEliminar?: () => void;
}) {
  const [abierto, setAbierto] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  // Person being edited and their draft.
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
          <span className="block text-base font-semibold text-text">
            {hogar.name}
            {hogar.archivadoEn ? (
              <span className="ml-2 rounded-md bg-surface-raised px-2 py-0.5 align-middle text-xs font-medium text-text-muted">
                Archived
              </span>
            ) : null}
          </span>
          <span className="block text-xs text-text-muted">
            {activos} {activos === 1 ? "person" : "people"}
            {hogar.invitaciones.length > 0
              ? ` · ${hogar.invitaciones.length} pending invitation${hogar.invitaciones.length === 1 ? "" : "s"}`
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
                        <label className={labelClass} htmlFor={`n-${m.userId}`}>Name</label>
                        <input
                          id={`n-${m.userId}`}
                          value={borrador.nombre}
                          onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                          className={`${fieldBaseClass} ${fieldNormalClass}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`e-${m.userId}`}>Email</label>
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
                        <label className={labelClass} htmlFor={`r-${m.userId}`}>Role</label>
                        <select
                          id={`r-${m.userId}`}
                          value={borrador.role}
                          onChange={(e) =>
                            setBorrador({ ...borrador, role: e.target.value as "admin" | "member" })
                          }
                          className={`${fieldBaseClass} ${fieldNormalClass}`}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 sm:col-span-3">
                        <button
                          type="submit"
                          disabled={ocupado}
                          className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="rounded-xl px-4 py-2 text-sm text-text-muted transition hover:bg-surface-raised hover:text-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                    {m.email ? (
                      <p className={helperTextClass}>
                        If you change the email, the person signs in with the new one.
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
                      {soyYo ? " (you)" : ""}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {m.email ?? "no email"} · {m.role === "admin" ? "admin" : "member"}
                      {m.activo ? "" : " · no access"}
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
                      <Pencil size={14} /> Edit
                    </button>
                    {m.activo && m.email ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onReset(m.userId, m.email!)}
                        className={`${botonAccion} text-text-muted hover:bg-surface-raised hover:text-text`}
                        title="Send a link so they can change their password"
                      >
                        <Mail size={14} /> Reset password
                      </button>
                    ) : null}
                    {soyYo ? null : m.activo ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => {
                          if (window.confirm(`Remove ${etiqueta}? They will no longer be able to sign in to the app.`)) {
                            onEstado(m.userId, false, etiqueta);
                          }
                        }}
                        className={`${botonAccion} text-rust hover:bg-rust/10`}
                      >
                        <UserMinus size={14} /> Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onEstado(m.userId, true, etiqueta)}
                        className={`${botonAccion} text-sage hover:bg-sage/10`}
                      >
                        <RotateCcw size={14} /> Reactivate
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
                Pending invitations
              </h3>
              <ul className="divide-y divide-line">
                {hogar.invitaciones.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{i.email}</p>
                      <p className="text-xs text-text-muted">
                        {i.role === "admin" ? "admin" : "member"} · expires on{" "}
                        {new Date(i.venceEn).toLocaleDateString("en")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onReenviar(i.id, i.email)}
                        className={`${botonAccion} text-gold hover:bg-gold/10`}
                      >
                        <Send size={14} /> Resend
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => onCancelar(i.id, i.email)}
                        className={`${botonAccion} text-rust hover:bg-rust/10`}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hogar.archivadoEn ? null : (
          <form onSubmit={invitar} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className={labelClass} htmlFor={`inv-${hogar.id}`}>
                Add person by email
              </label>
              <input
                id={`inv-${hogar.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
                className={`${fieldBaseClass} ${fieldNormalClass}`}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`rol-${hogar.id}`}>Role</label>
              <select
                id={`rol-${hogar.id}`}
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                className={`${fieldBaseClass} ${fieldNormalClass}`}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
            >
              Invite
            </button>
          </form>
          )}

          {!hogar.tieneSuperadmin && (onArchivar || onRestaurar || onEliminar) ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {hogar.archivadoEn ? (
                <>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={onRestaurar}
                    className={`${botonAccion} text-sage hover:bg-sage/10`}
                  >
                    <RotateCcw size={14} /> Restore household
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={onEliminar}
                    className={`${botonAccion} text-rust hover:bg-rust/10`}
                  >
                    <Trash2 size={14} /> Delete permanently
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={onArchivar}
                  className={`${botonAccion} text-text-muted hover:bg-surface-raised hover:text-text`}
                >
                  <Archive size={14} /> Archive household
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
