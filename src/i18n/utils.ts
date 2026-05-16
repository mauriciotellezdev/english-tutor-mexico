/**
 * Translation utility for Astro i18n routing.
 *
 * Usage in any .astro page:
 *   ---
 *   import { t } from "@/i18n/utils.ts";
 *   const lang = Astro.locale;
 *   ---
 *   <h1>{t("hero.heading1", lang)}</h1>
 */

import en from "./en.json";
import es from "./es.json";

const dictionaries: Record<string, Record<string, string>> = { en, es };

export function t(key: string, locale: string = "es"): string {
  const dict = dictionaries[locale] || dictionaries.es;
  return dict[key] || dictionaries.en[key] || key;
}

export function getLocaleName(locale: string): string {
  return locale === "es" ? "Español" : "English";
}

export function getAlternateLocale(locale: string): string {
  return locale === "es" ? "en" : "es";
}
