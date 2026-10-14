"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, ReceiptText } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        setError(t.msg(data.message, "login.errorGeneric"));
        return;
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      const safeNextPath =
        nextPath?.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
          ? nextPath
          : "/";

      router.replace(safeNextPath);
      router.refresh();
    } catch {
      setError(t("login.connectError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-5 py-10 text-text">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-rust/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface-raised text-gold">
              <ReceiptText size={22} strokeWidth={2} />
            </div>

            <div>
              <p className="font-display text-xl font-semibold tracking-[-0.02em]">
                Budget Plus
              </p>
              <p className="text-sm text-text-muted">
                {t("login.tagline")}
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-sage">
              {t("login.kicker")}
            </p>

            <h1 className="font-display text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
              {t("login.headline")}
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-text-muted">
              {t("login.blurb")}
            </p>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: t("login.bills"), value: t("login.organized"), tone: "text-rust" },
              { label: t("login.transactions"), value: t("login.upToDate"), tone: "text-sage" },
              { label: t("login.reports"), value: t("login.clear"), tone: "text-gold" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-line bg-surface/80 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                  {item.label}
                </p>
                <p className={`mt-2 font-display text-lg font-semibold ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface-raised text-gold">
              <ReceiptText size={22} />
            </div>

            <div>
              <p className="font-display text-xl font-semibold">Budget Plus</p>
              <p className="text-xs text-text-muted">{t("login.tagline")}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-line bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-raised text-sage">
                <LockKeyhole size={22} />
              </div>

              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("login.privateAccess")}
              </p>

              <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
                {t("login.welcome")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {t("login.enterCredentials")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  {t("login.emailOrUser")}
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  required
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-line bg-surface-raised px-4 text-sm text-text outline-none transition placeholder:text-text-muted/60 focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  {t("login.password")}
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-line bg-surface-raised px-4 pr-12 text-sm text-text outline-none transition placeholder:text-text-muted/60 focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t("login.hide") : t("login.show")}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-muted transition hover:bg-line hover:text-text disabled:opacity-60"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-rust px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t("login.signingIn") : t("login.signIn")}
              </button>

              <p className="text-center text-sm">
                <Link
                  href="/olvide"
                  className="text-text-muted underline hover:text-text"
                >
                  {t("login.forgot")}
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            Budget Plus
          </p>
        </section>
      </div>
    </main>
  );
}