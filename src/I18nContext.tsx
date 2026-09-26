import type { Accessor } from 'solid-js';
import { createContext, useContext } from 'solid-js';

import { formatDateForLocale, formatNumberForLocale, formatRelativeTimeForLocale } from './intl.js';
import { DEFAULT_FALLBACK_LOCALE } from './locales.js';
import { formatMessage, formatRichMessage } from './message/render.js';
import type { I18nContextValue, Locale } from './types.js';

const fallbackLocale: Accessor<Locale> = () => DEFAULT_FALLBACK_LOCALE;
const noOp = (): void => {};

export const fallbackI18nContext: I18nContextValue = {
  locale: fallbackLocale,
  setLocale: noOp,
  t: (key, params = {}) => formatMessage(key, params, DEFAULT_FALLBACK_LOCALE),
  ts: (key, params = {}) => formatMessage(key, params, DEFAULT_FALLBACK_LOCALE),
  tx: (key, params = {}) => formatRichMessage(key, params, DEFAULT_FALLBACK_LOCALE),
  formatNumber: (value, options) => formatNumberForLocale(DEFAULT_FALLBACK_LOCALE, value, options),
  formatDate: (value, options) => formatDateForLocale(DEFAULT_FALLBACK_LOCALE, value, options),
  formatRelativeTime: (value, unit, options) =>
    formatRelativeTimeForLocale(DEFAULT_FALLBACK_LOCALE, value, unit, options),
};

export const I18nContext = createContext<I18nContextValue | undefined>();

export const useI18n = (): I18nContextValue => useContext(I18nContext) ?? fallbackI18nContext;
