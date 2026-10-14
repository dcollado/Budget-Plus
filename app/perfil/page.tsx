"use client";

import { FormEvent, useEffect, useState } from "react";
import { EVENTO_PERFIL } from "@/components/app-shell";
import {
  fieldBaseClass,
  fieldNormalClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import { useT } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/language-switcher";

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
  const t = useT();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nombre, setNombre] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [mensajeNombre, setMensajeNombre] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        setPerfil(json.data as Perfil);
        setNombre(mayuscula((json.data as Perfil).nombre));
      })
      .catch(() => {});
  }, []);

  async function guardarNombre(e: FormEvent) {
    e.preventDefault();
    setMensajeNombre(null);
    setGuardandoNombre(true);

    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const json = (await res.json()) as { message?: string; data?: { nombre: string } };

      if (!res.ok || !json.data) {
        setMensajeNombre({ tipo: "error", texto: t.msg(json.message, "profile.nameError") });
        return;
      }

      const guardado = json.data.nombre;
      setPerfil((p) => (p ? { ...p, nombre: guardado } : p));
      setNombre(guardado);
      setMensajeNombre({ tipo: "ok", texto: t("profile.nameSaved") });
      // Let the header reflect it without reloading.
      window.dispatchEvent(new Event(EVENTO_PERFIL));
    } catch {
      setMensajeNombre({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (nueva !== confirmar) {
      setMensaje({ tipo: "error", texto: t("profile.newMismatch") });
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
        setMensaje({ tipo: "error", texto: t.msg(json.message, "profile.passwordError") });
        return;
      }

      setActual("");
      setNueva("");
      setConfirmar("");
      setMensaje({
        tipo: "ok",
        texto: t("profile.passwordChanged"),
      });
    } catch {
      setMensaje({ tipo: "error", texto: t("common.connectError") });
    } finally {
      setEnviando(false);
    }
  }

  const rolTexto = perfil?.esSuperadmin
    ? t("profile.roleSuper")
    : perfil?.rol === "admin"
      ? t("profile.roleAdmin")
      : t("profile.roleMember");

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-gold">{t("nav.myAccount")}</p>
        <h1 className="font-display text-2xl font-semibold text-text">{t("nav.profile")}</h1>
      </div>

      <section className={sectionCardClass}>
        {perfil === null ? (
          <p className="text-sm text-text-muted">{t("common.loadingEllipsis")}</p>
        ) : (
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-text-muted">{t("profile.email")}</dt>
            <dd className="break-all text-text">{perfil.email ?? t("profile.noEmail")}</dd>

            <dt className="text-text-muted">{t("profile.toSignIn")}</dt>
            <dd className="break-all text-text">
              {perfil.email ?? perfil.usuario}
              {perfil.email && perfil.usuario.toLowerCase() !== perfil.email.toLowerCase()
                ? ` (${t("profile.orUsername", { user: perfil.usuario })})`
                : ""}
            </dd>

            <dt className="text-text-muted">{t("profile.household")}</dt>
            <dd className="text-text">{perfil.hogar ?? t("profile.noHousehold")}</dd>

            <dt className="text-text-muted">{t("profile.role")}</dt>
            <dd className="text-text">{rolTexto}</dd>

            <dt className="text-text-muted">{t("profile.language")}</dt>
            <dd>
              <LanguageSwitcher persist />
            </dd>
          </dl>
        )}
      </section>

      {perfil ? (
        <form onSubmit={guardarNombre} className={`${sectionCardClass} space-y-4`}>
          <h2 className="text-base font-semibold text-text">{t("profile.yourName")}</h2>

          {mensajeNombre ? (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm ${
                mensajeNombre.tipo === "ok"
                  ? "border-sage/30 bg-surface text-text"
                  : "border-rust/30 bg-rust-soft text-rust"
              }`}
            >
              {mensajeNombre.texto}
            </div>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="nombre">{t("profile.howAppear")}</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              className={`${fieldBaseClass} ${fieldNormalClass}`}
              required
              disabled={guardandoNombre}
            />
          </div>

          <button
            type="submit"
            disabled={guardandoNombre || nombre.trim() === "" || nombre.trim() === mayuscula(perfil.nombre)}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {guardandoNombre ? t("common.saving") : t("profile.saveName")}
          </button>
        </form>
      ) : null}

      <form onSubmit={cambiar} className={`${sectionCardClass} space-y-4`}>
        <h2 className="text-base font-semibold text-text">{t("profile.changePasswordTitle")}</h2>

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
          <label className={labelClass} htmlFor="actual">{t("profile.currentPassword")}</label>
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
            <label className={labelClass} htmlFor="nueva">{t("profile.newPassword")}</label>
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
            <p className={helperTextClass}>{t("profile.minChars")}</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="confirmar">{t("profile.repeatNew")}</label>
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
          {enviando ? t("common.saving") : t("profile.changePassword")}
        </button>
      </form>
    </main>
  );
}
