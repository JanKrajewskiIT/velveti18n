import { type Component, createEffect, createMemo, createSignal, onMount } from 'solid-js';

import { createEmptyComposedDictionaries, lookup } from './dictionary.js';
import { detectLocale, persistLocale, setDocumentLanguage, warnOnce } from './env.js';
import { I18nContext } from './I18nContext.js';
import { formatDateForLocale, formatNumberForLocale, formatRelativeTimeForLocale } from './intl.js';
import { DEFAULT_FALLBACK_LOCALE, DEFAULT_STORAGE_KEY, isSupportedLocale } from './locales.js';
import { formatMessage, formatRichMessage } from './message/render.js';
import type { I18nContextValue, I18nProviderProps, MessageParams, RichMessageParams } from './types.js';

export const I18nProvider: Component<I18nProviderProps> = (props) => {
  const initialLocale = isSupportedLocale(props.initialLocale) ? props.initialLocale : DEFAULT_FALLBACK_LOCALE;
  const [locale, setLocaleSignal] = createSignal(initialLocale);
  const [initialized, setInitialized] = createSignal(false);

  const resolvedFallbackLocale = createMemo(() => {
    const configuredLocale = props.fallbackLocale;
    if (configuredLocale === undefined) {
      return DEFAULT_FALLBACK_LOCALE;
    }
    if (isSupportedLocale(configuredLocale)) {
      return configuredLocale;
    }

    warnOnce('invalid-fallback-locale', 'Unsupported fallback locale; using "en".');
    return DEFAULT_FALLBACK_LOCALE;
  });

  const composedDictionaries = createMemo(() => props.dictionaries ?? createEmptyComposedDictionaries());
  const activeDictionary = createMemo(() => composedDictionaries()[locale()]);
  const fallbackDictionary = createMemo(() => composedDictionaries()[resolvedFallbackLocale()]);

  const setLocale: I18nContextValue['setLocale'] = (nextLocale) => {
    if (!isSupportedLocale(nextLocale)) {
      warnOnce(`invalid-set-locale:${String(nextLocale)}`, `Unsupported locale "${String(nextLocale)}" was ignored.`);
      return;
    }

    setLocaleSignal(nextLocale);
  };

  onMount(() => {
    const configuredLocale: unknown = props.initialLocale;
    if (configuredLocale === undefined) {
      setLocaleSignal(detectLocale(props.storageKey ?? DEFAULT_STORAGE_KEY));
    } else if (isSupportedLocale(configuredLocale)) {
      setLocaleSignal(configuredLocale);
    } else {
      warnOnce('invalid-initial-locale', 'Unsupported initial locale; detecting locale instead.');
      setLocaleSignal(detectLocale(props.storageKey ?? DEFAULT_STORAGE_KEY));
    }

    setInitialized(true);
  });

  createEffect(() => {
    const configuredLocale: unknown = props.initialLocale;
    if (configuredLocale === undefined) {
      return;
    }
    if (isSupportedLocale(configuredLocale)) {
      setLocaleSignal(configuredLocale);
      return;
    }

    warnOnce('invalid-initial-locale', 'Unsupported initial locale was ignored.');
  });

  createEffect(() => {
    const activeLocale = locale();
    if (!initialized()) {
      return;
    }

    persistLocale(props.storageKey ?? DEFAULT_STORAGE_KEY, activeLocale);
    setDocumentLanguage(activeLocale);
  });

  const translate = (key: string, params: MessageParams = {}) => {
    const activeLocale = locale();
    const template = lookup(activeDictionary(), key) ?? lookup(fallbackDictionary(), key);
    return formatMessage(template ?? key, params, activeLocale);
  };

  const translateRich = (key: string, params: RichMessageParams = {}) => {
    const activeLocale = locale();
    const template = lookup(activeDictionary(), key) ?? lookup(fallbackDictionary(), key);
    return formatRichMessage(template ?? key, params, activeLocale);
  };

  const contextValue: I18nContextValue = {
    locale,
    setLocale,
    t: translate,
    ts: translate,
    tx: translateRich,
    formatNumber: (value, options) => formatNumberForLocale(locale(), value, options),
    formatDate: (value, options) => formatDateForLocale(locale(), value, options),
    formatRelativeTime: (value, unit, options) => formatRelativeTimeForLocale(locale(), value, unit, options),
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
};
