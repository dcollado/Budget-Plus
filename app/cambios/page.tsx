import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG, type CambioTipo } from "@/lib/changelog";

// Public page (see PUBLIC_ROUTES in proxy.ts): only content from
// lib/changelog.ts, no database data. noindex so it does not show up in
// search engines.
export const metadata: Metadata = {
  title: "Changes · Budget Plus",
  description: "Summary of Budget Plus interface changes",
  robots: { index: false, follow: false },
};

const ETIQUETA: Record<CambioTipo, { texto: string; clase: string }> = {
  nuevo: { texto: "New", clase: "border-sage/40 bg-sage/10 text-sage" },
  mejora: { texto: "Improvement", clase: "border-gold/40 bg-gold/10 text-gold" },
  ajuste: {
    texto: "Tweak",
    clase: "border-line bg-surface-raised text-text-muted",
  },
};

function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

export default function CambiosPage() {
  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-text">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-text-muted">Budget Plus</p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            Latest changes
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Summary of interface changes, newest first.
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
                {formatearFecha(entrada.fecha)}
              </time>
              <h2 className="mt-1 font-display text-xl font-semibold">
                {entrada.titulo}
              </h2>

              <ul className="mt-4 space-y-3">
                {entrada.cambios.map((cambio, i) => {
                  const etiqueta = ETIQUETA[cambio.tipo];

                  return (
                    <li key={i} className="flex items-start gap-3 text-sm leading-6">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${etiqueta.clase}`}
                      >
                        {etiqueta.texto}
                      </span>
                      <span>{cambio.texto}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="text-text-muted underline hover:text-text">
            Go to the app
          </Link>
        </p>
      </div>
    </main>
  );
}
