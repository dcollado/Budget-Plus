"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MailCheck, ReceiptText } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AuthError, authButtonClass, authInputClass } from "@/components/auth-card";
import { useT } from "@/lib/i18n/client";
import { labelClass } from "@/lib/ui";

// Pública: pedir acceso. Nada se crea hasta que el administrador aprueba.
export default function SolicitarPage() {
  const t = useT();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [hogar, setHogar] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [website, setWebsite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, hogar, mensaje, website }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(t.msg(json.message, "access.errorGeneric"));
        return;
      }
      setEnviado(true);
    } catch {
      setError(t("common.connectError"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-10 text-text">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <ReceiptText size={18} className="text-gold" /> Budget Plus
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-[28px] border border-line bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
          {enviado ? (
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-raised text-sage">
                <MailCheck size={22} />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
                {t("access.doneTitle")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">{t("access.doneBody")}</p>
              <Link
                href="/"
                className="mt-6 inline-block text-sm text-text-muted underline hover:text-text"
              >
                {t("access.backHome")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
                {t("access.title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">{t("access.subtitle")}</p>

              <form onSubmit={enviar} className="mt-6 space-y-4">
                <div>
                  <label className={labelClass} htmlFor="nombre">
                    {t("access.fieldName")}
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    autoComplete="name"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    maxLength={80}
                    disabled={enviando}
                    className={authInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="email">
                    {t("access.fieldEmail")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={enviando}
                    placeholder={t("forgot.emailPlaceholder")}
                    className={authInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="hogar">
                    {t("access.fieldHouseholdOptional")}
                  </label>
                  <input
                    id="hogar"
                    type="text"
                    value={hogar}
                    onChange={(e) => setHogar(e.target.value)}
                    maxLength={80}
                    disabled={enviando}
                    placeholder={t("access.householdPlaceholder")}
                    className={authInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="mensaje">
                    {t("access.fieldMessageOptional")}
                  </label>
                  <textarea
                    id="mensaje"
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    maxLength={500}
                    rows={3}
                    disabled={enviando}
                    className="w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/60 focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
                  />
                </div>

                {/* Trampa para bots: oculto a personas y a lectores de pantalla. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {error ? <AuthError>{error}</AuthError> : null}

                <button type="submit" disabled={enviando} className={authButtonClass}>
                  {enviando ? t("access.sending") : t("access.submit")}
                </button>
              </form>

              <p className="mt-5 text-center text-xs">
                <Link href="/cambios" className="text-text-muted underline hover:text-text">
                  {t("changes.title")}
                </Link>
              </p>

              <p className="mt-5 text-center text-sm text-text-muted">
                {t("access.haveAccount")}{" "}
                <Link href="/login" className="underline hover:text-text">
                  {t("login.signIn")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
