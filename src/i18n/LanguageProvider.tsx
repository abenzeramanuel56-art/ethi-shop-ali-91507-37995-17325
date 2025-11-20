import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en';
import am from './locales/am';

type LocaleKey = 'en' | 'am';

const LOCALES: Record<LocaleKey, any> = { en, am };

interface I18nContextValue {
  locale: LocaleKey;
  setLocale: (l: LocaleKey) => void;
  t: (path: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleKey>(() => {
    try {
      const saved = localStorage.getItem('locale');
      if (saved === 'am' || saved === 'en') return saved;
    } catch (e) {}
    return 'en';
  });

  useEffect(() => {
    try { localStorage.setItem('locale', locale); } catch (e) {}
  }, [locale]);

  const setLocale = (l: LocaleKey) => setLocaleState(l);

  const t = useMemo(() => {
    return (path: string, fallback?: string) => {
      const parts = path.split('.');
      let cur: any = LOCALES[locale];
      for (const p of parts) {
        if (!cur) break;
        cur = cur[p];
      }
      if (typeof cur === 'string') return cur;
      return fallback ?? path;
    };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside LanguageProvider');
  return ctx;
}
