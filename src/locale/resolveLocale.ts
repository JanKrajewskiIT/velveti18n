import { warnOnce } from '../internal/diagnostics';
import { readNavigatorLanguage, readStoredLocaleValue } from './browserAccess';
import { DEFAULT_FALLBACK_LOCALE } from './defaults';
import { isSupportedLocale, type Locale } from './locales';

const detectLocale = (storageKey: string): Locale => {
  const stored = readStoredLocaleValue(storageKey);
  if (isSupportedLocale(stored)) {
    return stored;
  }

  const primaryLanguage = readNavigatorLanguage()?.split('-')[0]?.toLowerCase();
  if (isSupportedLocale(primaryLanguage)) {
    return primaryLanguage;
  }

  return DEFAULT_FALLBACK_LOCALE;
};

export const resolveInitialLocale = (requested: Locale | undefined, storageKey: string): Locale => {
  if (requested === undefined) {
    return detectLocale(storageKey);
  }
  if (isSupportedLocale(requested)) {
    return requested;
  }

  warnOnce(`Ignoring unsupported initialLocale ${JSON.stringify(requested)}; detecting the locale instead.`);
  return detectLocale(storageKey);
};

export const resolveFallbackLocale = (requested: Locale | undefined): Locale => {
  if (requested === undefined) {
    return DEFAULT_FALLBACK_LOCALE;
  }
  if (isSupportedLocale(requested)) {
    return requested;
  }

  warnOnce(`Ignoring unsupported fallbackLocale ${JSON.stringify(requested)}; using ${DEFAULT_FALLBACK_LOCALE}.`);
  return DEFAULT_FALLBACK_LOCALE;
};
