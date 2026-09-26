import { DEFAULT_FALLBACK_LOCALE, isSupportedLocale, type Locale } from './locales';

export const DEFAULT_STORAGE_KEY = 'velvet-locale';

export const detectLocale = (storageKey: string): Locale => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && isSupportedLocale(stored)) return stored;
    }
  } catch {
    void 0;
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
      const primary = navigator.language.split('-')[0];
      if (isSupportedLocale(primary)) return primary;
    }
  } catch {
    void 0;
  }
  return DEFAULT_FALLBACK_LOCALE;
};

export const persistLocale = (storageKey: string, locale: Locale): void => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, locale);
  } catch {
    void 0;
  }
};

export const setDocumentLang = (locale: Locale): void => {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  } catch {
    void 0;
  }
};
