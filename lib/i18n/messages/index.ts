import type { Locale } from "../config";
import { en } from "./en";
import { es, esApi } from "./es";

export type MessageKey = keyof typeof en;

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, es };

// English API message -> translation, per language (English is canonical).
export const API_MESSAGES: Partial<Record<Locale, Record<string, string>>> = { es: esApi };
