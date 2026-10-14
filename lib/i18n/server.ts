import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { translate, type Params } from "./translate";
import type { MessageKey } from "./messages";

// Language of the current request: the `lang` cookie, else the browser's
// Accept-Language, else the default. Safe to call outside a request.
export async function getLocale(): Promise<Locale> {
  try {
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    return localeFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: MessageKey, params?: Params) => translate(locale, key, params),
  };
}
