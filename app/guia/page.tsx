import type { Metadata } from "next";
import { Pagina } from "@/components/pagina";
import { GUIA } from "@/lib/guia";
import { getT } from "@/lib/i18n/server";
import { sectionCardClass } from "@/lib/ui";

// Solo con sesión (no está en PUBLIC_ROUTES de proxy.ts). Contenido fijo de
// lib/guia.ts, sin datos de la base. noindex por si acaso.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("guide.metaTitle"),
    description: t("guide.metaDescription"),
    robots: { index: false, follow: false },
  };
}

// "**texto**" va en negrita.
function conNegrita(texto: string) {
  return texto.split("**").map((parte, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-text">
        {parte}
      </strong>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}

export default async function GuiaPage() {
  const { t, locale } = await getT();

  return (
    <Pagina ancho="estrecho">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-text">{t("guide.title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("guide.subtitle")}</p>
      </header>

      <nav aria-label={t("guide.index")} className={`${sectionCardClass} mb-6`}>
        <p className="text-xs uppercase tracking-wide text-text-muted">{t("guide.index")}</p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {GUIA.map((seccion) => (
            <li key={seccion.id}>
              <a
                href={`#${seccion.id}`}
                className="block rounded-lg px-2 py-1.5 text-text-muted transition hover:bg-surface-raised hover:text-gold"
              >
                {seccion.titulo[locale]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        {GUIA.map((seccion) => (
          <section
            key={seccion.id}
            id={seccion.id}
            aria-labelledby={`guia-${seccion.id}`}
            className={`${sectionCardClass} scroll-mt-24`}
          >
            <h2 id={`guia-${seccion.id}`} className="font-display text-2xl text-text">
              {seccion.titulo[locale]}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{seccion.intro[locale]}</p>

            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-text-muted marker:text-gold">
              {seccion.puntos[locale].map((punto, i) => (
                <li key={i}>{conNegrita(punto)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Pagina>
  );
}
