import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "en" | "ur";

interface LanguageState {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: "en",
      direction: "ltr",
      setLocale: (locale) => set({ locale, direction: locale === "ur" ? "rtl" : "ltr" }),
    }),
    { name: "erp-language-storage" }
  )
);
