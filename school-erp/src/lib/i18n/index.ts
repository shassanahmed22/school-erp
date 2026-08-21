import en from "@/locales/en.json";
import ur from "@/locales/ur.json";

export const translations = { en, ur } as const;
export type Locale = keyof typeof translations;

/**
 * Simple dot-path translator, e.g. t("nav.dashboard")
 * Swap this for next-intl / i18next later without touching call sites.
 */
export function getTranslator(locale: Locale) {
  const dict = translations[locale] ?? translations.en;
  return function t(path: string): string {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, dict);
    return typeof value === "string" ? value : path;
  };
}
