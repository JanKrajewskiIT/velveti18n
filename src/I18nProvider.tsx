import { createEffect, createMemo, createSignal, on, type ParentProps } from 'solid-js';

import { DEFAULT_STORAGE_KEY, detectLocale, persistLocale, setDocumentLang } from './detection';
import { createEmptyComposedDictionaries } from './dictionary';
import { createI18nFunctions } from './i18n-functions';
import { I18nContext } from './I18nContext';
import { warnOnce } from './internal/env';
import { DEFAULT_FALLBACK_LOCALE, isSupportedLocale, type Locale } from './locales';
import type { ComposedDictionaries, FlatDictionary } from './types';

export interface I18nProviderProps {
  dictionaries?: ComposedDictionaries;
  storageKey?: string;
  initialLocale?: Locale;
  fallbackLocale?: Locale;
}

const EMPTY_COMPOSED = createEmptyComposedDictionaries();
const EMPTY_DICTIONARY: FlatDictionary = Object.freeze({});

const I18nProvider = (props: ParentProps<I18nProviderProps>) => {
  const storageKey = createMemo(() => props.storageKey ?? DEFAULT_STORAGE_KEY);

  const fallbackLocale = createMemo<Locale>(() => {
    const value = props.fallbackLocale;
    if (value === undefined) return DEFAULT_FALLBACK_LOCALE;
    if (!isSupportedLocale(value)) {
      warnOnce(
        `bad-fallback:${String(value)}`,
        `[i18n] Unsupported fallbackLocale "${String(value)}"; using "${DEFAULT_FALLBACK_LOCALE}".`,
      );
      return DEFAULT_FALLBACK_LOCALE;
    }
    return value;
  });

  const initialLocale = props.initialLocale ?? detectLocale(props.storageKey ?? DEFAULT_STORAGE_KEY);
  const [locale, setLocaleSignal] = createSignal<Locale>(initialLocale);

  const setLocale = (next: Locale): void => {
    if (!isSupportedLocale(next)) {
      warnOnce(
        `bad-set-locale:${String(next)}`,
        `[i18n] setLocale received unsupported locale "${String(next)}"; ignoring.`,
      );
      return;
    }
    setLocaleSignal(next);
  };

  const composed = createMemo<ComposedDictionaries>(() => props.dictionaries ?? EMPTY_COMPOSED);
  const activeDictionary = createMemo<FlatDictionary>(() => composed()[locale()] ?? EMPTY_DICTIONARY);
  const fallbackDictionary = createMemo<FlatDictionary>(() => composed()[fallbackLocale()] ?? EMPTY_DICTIONARY);

  createEffect(
    on(locale, (current) => {
      persistLocale(storageKey(), current);
      setDocumentLang(current);
    }),
  );

  createEffect(
    on(
      () => props.initialLocale,
      (next) => {
        if (next === undefined) return;
        if (!isSupportedLocale(next)) {
          warnOnce(
            `bad-initial-locale:${String(next)}`,
            `[i18n] Unsupported initialLocale "${String(next)}"; keeping current locale.`,
          );
          return;
        }
        setLocaleSignal(next);
      },
      { defer: true },
    ),
  );

  const value = createI18nFunctions({
    locale,
    setLocale,
    activeDictionary,
    fallbackDictionary,
    hasDictionaries: true,
  });

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};

export default I18nProvider;
