import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG, type CambioTipo } from "@/lib/changelog";
import { BackButton } from "@/components/back-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

// Public page (see PUBLIC_ROUTES in proxy.ts): only content from
// lib/changelog.ts, no database data. noindex so it does not show up in
// search engines.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("changes.metaTitle"),
    description: t("changes.metaDescription"),
    robots: { index: false, follow: false },
  };
}

const ETIQUETA: Record<CambioTipo, { texto: MessageKey; clase: string }> = {
  nuevo: { texto: "changes.new", clase: "border-sage/40 bg-sage/10 text-sage" },
  mejora: { texto: "changes.improvement", clase: "border-gold/40 bg-gold/10 text-gold" },
  ajuste: {
    texto: "changes.tweak",
    clase: "border-line bg-surface-raised text-text-muted",
  },
};

function formatearFecha(iso: string, locale: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

export default async function CambiosPage() {
  const { t, locale } = await getT();

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen outline-none bg-ink px-5 py-10 text-text">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BackButton />
          <LanguageSwitcher />
        </div>

        <header className="mb-8">
          <p className="text-sm text-text-muted">Budget Plus</p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            {t("changes.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {t("changes.subtitle")}
          </p>
        </header>

        <ol className="space-y-6">
          {CHANGELOG.map((entrada) => (
            <li
              key={entrada.fecha}
              className="rounded-[28px] border border-line bg-surface p-6 shadow-2xl shadow-black/20"
            >
              <time
                dateTime={entrada.fecha}
                className="text-xs uppercase tracking-wide text-text-muted"
              >
                {formatearFecha(entrada.fecha, locale)}
              </time>
              <h2 className="mt-1 font-display text-xl font-semibold">
                {entrada.titulo[locale]}
              </h2>

              <ul className="mt-4 space-y-3">
                {entrada.cambios.map((cambio, i) => {
                  const etiqueta = ETIQUETA[cambio.tipo];

                  return (
                    <li key={i} className="flex items-start gap-3 text-sm leading-6">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${etiqueta.clase}`}
                      >
                        {t(etiqueta.texto)}
                      </span>
                      <span>{cambio.texto[locale]}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="text-text-muted underline hover:text-text">
            {t("changes.goToApp")}
          </Link>
        </p>
      </div>
    </main>
  );
}
