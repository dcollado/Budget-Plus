"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale, useSetLocale } from "@/lib/i18n/client";

// Small EN | ES toggle. Saves the choice in a cookie and refreshes so the
// server-rendered parts pick it up too.
export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const setLocale = useSetLocale();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-raised p-0.5 text-xs"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={code === locale}
          title={LOCALE_LABELS[code]}
          className={`rounded-md px-2 py-1 font-medium uppercase transition ${
            code === locale ? "bg-gold-soft text-gold" : "text-text-muted hover:text-text"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
