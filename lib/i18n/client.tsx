"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import type { MessageKey } from "./messages";
import { translate, translateApiMessage, type Params } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export type TFunction = ((key: MessageKey, params?: Params) => string) & {
  // Translate a fixed message that came back from the API.
  msg: (message: string | undefined | null, fallback: MessageKey) => string;
  locale: Locale;
};

export function useT(): TFunction {
  const locale = useLocale();
  return useMemo(
    () =>
      Object.assign(
        (key: MessageKey, params?: Params) => translate(locale, key, params),
        {
          msg: (message: string | undefined | null, fallback: MessageKey) =>
            message ? translateApiMessage(locale, message) : translate(locale, fallback),
          locale,
        }
      ),
    [locale]
  );
}

// Saves the choice in a cookie (the server reads it on the next request).
export function useSetLocale() {
  return useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);
}
