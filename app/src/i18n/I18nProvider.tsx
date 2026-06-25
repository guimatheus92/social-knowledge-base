"use client";

// Lightweight, dependency-free i18n for client components. Locale lives in React
// state + localStorage; first paint uses DEFAULT_LOCALE on both server and client
// to avoid hydration mismatch, then useEffect adopts the saved/browser locale.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_LOCALE, LOCALES, messages, type Locale, type MessageKey } from "@/i18n/dictionary";

// MessageKey gives literal-key autocomplete; `string & {}` still allows a dynamic
// key held in a variable (e.g. t(opt.labelKey)). Runtime falls back to the key string.
type TFn = (key: MessageKey | (string & {}), vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "kb.locale";

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocaleState(saved);
    } else if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) {
      setLocaleState("en");
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (l: Locale) => {
      setLocaleState(l);
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {
        /* storage may be unavailable; ignore */
      }
    };
    // Cast to a string-indexable record so dynamic keys (string & {}) are allowed.
    const dict = messages[locale] as Record<string, string>;
    const fallback = messages[DEFAULT_LOCALE] as Record<string, string>;
    const t: TFn = (key, vars) => interpolate(dict[key] ?? fallback[key] ?? String(key), vars);
    return { locale, setLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** Shorthand for the translate function. */
export function useT(): TFn {
  return useI18n().t;
}
