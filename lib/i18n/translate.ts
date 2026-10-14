import { DEFAULT_LOCALE, type Locale } from "./config";
import { API_MESSAGES, MESSAGES, type MessageKey } from "./messages";

export type Params = Record<string, string | number>;

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const table = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  return interpolate(table[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key, params);
}

// API routes answer with fixed English messages (the canonical text); the
// client maps them to its language. Unknown messages pass through as-is.
export function translateApiMessage(locale: Locale, message: string): string {
  return API_MESSAGES[locale]?.[message] ?? message;
}
