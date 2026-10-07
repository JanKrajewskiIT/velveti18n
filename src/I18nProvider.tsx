import { createEffect, createMemo, createSignal, type JSX, on, type ParentProps, untrack } from 'solid-js';

import { createI18nFunctions } from './createI18nFunctions';
import { createEmptyComposedDictionaries } from './dictionary/define';
import { lookup } from './dictionary/flatDictionary';
import { I18nContext } from './I18nContext';
import { warnOnce } from './internal/diagnostics';
import { setDocumentLanguage, writeStoredLocaleValue } from './locale/browserAccess';
import { DEFAULT_STORAGE_KEY } from './locale/defaults';
import { isSupportedLocale, type Locale } from './locale/locales';
import { resolveFallbackLocale, resolveInitialLocale } from './locale/resolveLocale';
import type { I18nContextValue, I18nProviderProps } from './types';

const EMPTY_DICTIONARIES = createEmptyComposedDictionaries();

export const I18nProvider = (props: ParentProps<I18nProviderProps>): JSX.Element => {
  const storageKey = (): string => props.storageKey ?? DEFAULT_STORAGE_KEY;
  const dictionaries = () => props.dictionaries ?? EMPTY_DICTIONARIES;
  const fallbackLocale = createMemo(() => resolveFallbackLocale(props.fallbackLocale));

  const [locale, setActiveLocale] = createSignal<Locale>(
    untrack(() => resolveInitialLocale(props.initialLocale, storageKey())),
  );

  const activeDictionary = createMemo(() => dictionaries()[locale()]);
  const fallbackDictionary = createMemo(() => dictionaries()[fallbackLocale()]);

  const lookupTemplate = (key: string): string | undefined => {
    const activeTemplate = lookup(activeDictionary(), key);
    if (activeTemplate !== undefined) {
      return activeTemplate;
    }

    const fallbackTemplate = lookup(fallbackDictionary(), key);
    warnOnce(
      fallbackTemplate === undefined
        ? `Missing translation key ${JSON.stringify(key)}.`
        : `Locale ${locale()} is missing key ${JSON.stringify(key)}; using fallback locale ${fallbackLocale()}.`,
    );
    return fallbackTemplate;
  };

  const setLocale = (next: Locale): void => {
    if (!isSupportedLocale(next)) {
      warnOnce(`Ignoring unsupported locale ${JSON.stringify(next)}.`);
      return;
    }
    setActiveLocale(next);
  };

  createEffect(() => {
    const active = locale();
    writeStoredLocaleValue(storageKey(), active);
    setDocumentLanguage(active);
  });

  createEffect(
    on(
      () => props.initialLocale,
      (requested) => {
        if (requested === undefined) {
          return;
        }
        if (isSupportedLocale(requested)) {
          setActiveLocale(requested);
        } else {
          warnOnce(`Ignoring unsupported initialLocale ${JSON.stringify(requested)}.`);
        }
      },
      { defer: true },
    ),
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    ...createI18nFunctions({ locale, lookupTemplate }),
  };

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};
