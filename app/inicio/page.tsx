import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ChartNoAxesCombined,
  Repeat,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

// Página de inicio pública: qué es la herramienta y cómo pedir acceso.
// Con sesión, "/" lleva directo a Presupuesto; esta ruta se puede ver siempre.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("home.metaTitle"),
    description: t("home.metaDescription"),
  };
}

const FEATURES: { icon: typeof Users; title: MessageKey; body: MessageKey; tone: string }[] = [
  { icon: Users, title: "home.f1Title", body: "home.f1Body", tone: "text-gold" },
  { icon: Repeat, title: "home.f2Title", body: "home.f2Body", tone: "text-sage" },
  { icon: Wallet, title: "home.f3Title", body: "home.f3Body", tone: "text-rust-text" },
  { icon: ChartNoAxesCombined, title: "home.f4Title", body: "home.f4Body", tone: "text-gold" },
  { icon: CalendarCheck, title: "home.f5Title", body: "home.f5Body", tone: "text-sage" },
  { icon: ShieldCheck, title: "home.f6Title", body: "home.f6Body", tone: "text-rust-text" },
];

const STEPS: { title: MessageKey; body: MessageKey }[] = [
  { title: "home.s1Title", body: "home.s1Body" },
  { title: "home.s2Title", body: "home.s2Body" },
  { title: "home.s3Title", body: "home.s3Body" },
];

export default async function InicioPage() {
  const { t } = await getT();

  return (
    <main id="contenido" tabIndex={-1} className="relative min-h-screen outline-none overflow-hidden bg-ink text-text">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-rust/10 blur-3xl" />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute left-1/3 top-[28rem] h-64 w-64 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-5">
        {/* Móvil: logo, idioma e "Iniciar sesión" en UNA línea. Todo es
            nowrap y más compacto; por debajo de 370px solo queda el ícono. */}
        <header className="flex items-center justify-between gap-3 py-5 sm:py-6">
          <Link href="/inicio" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface-raised text-gold sm:h-10 sm:w-10">
              <ReceiptText size={20} />
            </span>
            <span className="whitespace-nowrap font-display text-base font-semibold tracking-[-0.02em] max-[369px]:sr-only sm:text-lg">
              Budget Plus
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition hover:border-sage/50 sm:px-4"
            >
              {t("login.signIn")}
            </Link>
          </div>
        </header>

        <section className="max-w-3xl py-16 sm:py-24">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-sage">
            {t("home.kicker")}
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
            {t("home.headline")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">{t("home.subhead")}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/solicitar"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-rust px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t("access.submit")} <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 text-sm font-medium text-text transition hover:border-sage/50"
            >
              {t("login.signIn")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-text-muted">{t("home.inviteOnly")}</p>
        </section>

        <section className="pb-16">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.03em]">
            {t("home.whatTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icono, title, body, tone }) => (
              <div key={title} className="rounded-2xl border border-line bg-surface/80 p-5">
                <span
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised ${tone}`}
                >
                  <Icono size={20} />
                </span>
                <h3 className="font-display text-lg font-semibold">{t(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{t(body)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.03em]">
            {t("home.howTitle")}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((paso, i) => (
              <li key={paso.title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="font-mono text-xs font-semibold text-gold">0{i + 1}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{t(paso.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{t(paso.body)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-20">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-line bg-surface p-6 sm:p-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
                {t("home.ctaTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{t("home.ctaBody")}</p>
            </div>
            <Link
              href="/solicitar"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-rust px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t("access.submit")} <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-text-muted">
          <span>Budget Plus</span>
          <Link href="/cambios" className="underline hover:text-text">
            {t("changes.title")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
