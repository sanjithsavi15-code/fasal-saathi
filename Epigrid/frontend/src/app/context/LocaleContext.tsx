"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { t, type Locale, LOCALE_LABELS } from "@/app/lib/i18n";

const STORAGE_KEY = "fasal_saathi_locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  labels: typeof LOCALE_LABELS;
  hasChosenLanguage: boolean;
  isLocaleReady: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [hasChosenLanguage, setHasChosenLanguage] = useState(false);
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "en" || stored === "hi" || stored === "mr") {
        setLocaleState(stored);
        setHasChosenLanguage(true);
      }
    } catch {
      /* ignore */
    }
    setIsLocaleReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setHasChosenLanguage(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => t(locale, key),
      labels: LOCALE_LABELS,
      hasChosenLanguage,
      isLocaleReady,
    }),
    [locale, setLocale, hasChosenLanguage, isLocaleReady]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
