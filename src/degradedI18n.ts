import { createI18nFunctions } from './createI18nFunctions';
import { warnOnce } from './internal/diagnostics';
import { DEFAULT_FALLBACK_LOCALE } from './locale/defaults';
import type { Locale } from './locale/locales';
import type { I18nContextValue } from './types';

const locale = (): Locale => DEFAULT_FALLBACK_LOCALE;

export const degradedI18n: I18nContextValue = {
  locale,
  setLocale: () => {
    warnOnce('setLocale() was called outside <I18nProvider>; the locale was not changed.');
  },
  ...createI18nFunctions({ locale, lookupTemplate: (key) => key }),
};
