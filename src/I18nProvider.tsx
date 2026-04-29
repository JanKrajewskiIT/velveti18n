import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  type ParentProps,
  useContext,
} from 'solid-js';

import { type ComposedDictionaries } from './defineDictionary';
import { warnDevOnce } from './dev';
import { compileMessage, compileRichMessage, type RichNode } from './format/compiler';
import { coerceDate, getDateTimeFormat, getNumberFormat, getRelativeTimeFormat } from './format/intl';
import { type FlatDictionary, type Locale, type MessageParams, SUPPORTED_LOCALES, type VelvetI18nKey } from './types';

const DEFAULT_STORAGE_KEY = 'velvet-locale';
const DEFAULT_FALLBACK_LOCALE: Locale = 'en';

const EMPTY_DICTIONARIES: ComposedDictionaries = Object.freeze({
  en: Object.freeze({}) as FlatDictionary,
  pl: Object.freeze({}) as FlatDictionary,
});

const isSupportedLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value);

const warnMissing = (locale: Locale, key: string, fallbackLocale: Locale | null): void => {
  warnDevOnce(
    fallbackLocale
      ? `[velvet-i18n] Missing key "${key}" for locale "${locale}". Falling back to "${fallbackLocale}".`
      : `[velvet-i18n] Missing key "${key}" in every locale. Returning the key verbatim.`,
  );
};

const canUseWindow = (): boolean => typeof window !== 'undefined';

const canUseDocument = (): boolean => typeof document !== 'undefined';

const detectInitialLocale = (storageKey: string): Locale => {
  if (!canUseWindow()) return DEFAULT_FALLBACK_LOCALE;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch {
    warnDevOnce(`[velvet-i18n] Failed to read locale from localStorage key "${storageKey}".`);
  }
  if (stored && isSupportedLocale(stored)) return stored;
  const browser = window.navigator.language.split('-')[0];
  if (browser && isSupportedLocale(browser)) return browser;
  return DEFAULT_FALLBACK_LOCALE;
};

const persistLocale = (storageKey: string, locale: Locale): void => {
  if (canUseWindow()) {
    try {
      window.localStorage.setItem(storageKey, locale);
    } catch {
      warnDevOnce(`[velvet-i18n] Failed to persist locale to localStorage key "${storageKey}".`);
    }
  }
  if (canUseDocument()) {
    document.documentElement.setAttribute('lang', locale);
  }
};

const stringParams = (params: RichMessageParams | undefined): MessageParams | undefined => {
  if (!params) return undefined;
  const output: Record<string, string | number | boolean | Date | null | undefined> = {};
  for (const key in params) {
    const value = params[key];
    if (typeof value === 'function') continue;
    output[key] = value;
  }
  return output;
};

const renderRichToJsx = (nodes: ReadonlyArray<RichNode>, params: RichMessageParams | undefined): JSX.Element => {
  const output: JSX.Element[] = [];
  for (const node of nodes) {
    if (typeof node === 'string') {
      output.push(node);
      continue;
    }
    const children = renderRichToJsx(node.children, params);
    const handler = params?.[node.tag];
    if (typeof handler === 'function') {
      output.push(handler(children));
    } else {
      output.push(children);
    }
  }
  return output;
};

export type TranslateFn = (key: VelvetI18nKey | (string & {}), params?: MessageParams) => string;

export type TranslateStaticFn = (key: VelvetI18nKey, params?: MessageParams) => string;

export type TagHandler = (children: JSX.Element) => JSX.Element;

export type RichMessageParams = Readonly<
  Record<string, string | number | boolean | Date | null | undefined | TagHandler>
>;

export type TranslateRichFn = (key: VelvetI18nKey, params?: RichMessageParams) => JSX.Element;

export interface I18nContextValue {
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ts: TranslateStaticFn;
  tx: TranslateRichFn;
  formatNumber: (value: number | bigint, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) => string;
}

const I18nContext = createContext<I18nContextValue>();

export interface I18nProviderProps extends ParentProps {
  dictionaries?: ComposedDictionaries;
  storageKey?: string;
  initialLocale?: Locale;
  fallbackLocale?: Locale;
}

const resolveTemplate = (
  active: FlatDictionary,
  fallback: FlatDictionary,
  locale: Locale,
  key: string,
  fallbackLocale: Locale,
): string => {
  const direct = active[key];
  if (direct !== undefined) return direct;
  const fallbackTemplate = fallback[key];
  if (fallbackTemplate !== undefined) {
    if (active !== fallback) warnMissing(locale, key, fallbackLocale);
    return fallbackTemplate;
  }
  warnMissing(locale, key, null);
  return key;
};

export const I18nProvider = (props: I18nProviderProps) => {
  const storageKey = (): string => props.storageKey ?? DEFAULT_STORAGE_KEY;
  const fallbackLocale = createMemo<Locale>(() =>
    props.fallbackLocale && isSupportedLocale(props.fallbackLocale) ? props.fallbackLocale : DEFAULT_FALLBACK_LOCALE,
  );

  const [locale, setLocaleSignal] = createSignal<Locale>(props.initialLocale ?? detectInitialLocale(storageKey()));

  const dictionaries = createMemo<ComposedDictionaries>(() => props.dictionaries ?? EMPTY_DICTIONARIES);

  const fallback = createMemo<FlatDictionary>(() => dictionaries()[fallbackLocale()]);
  const active = createMemo<FlatDictionary>(() => {
    const dictionary = dictionaries()[locale()] as FlatDictionary | undefined;
    return dictionary ?? fallback();
  });

  createEffect(
    on(
      () => props.initialLocale,
      (next) => {
        if (!next || !isSupportedLocale(next) || locale() === next) return;
        setLocaleSignal(next);
      },
      { defer: true },
    ),
  );

  const setLocale: I18nContextValue['setLocale'] = (next) => {
    if (!isSupportedLocale(next)) {
      warnDevOnce(`[velvet-i18n] Ignored unsupported locale "${next}".`);
      return;
    }
    setLocaleSignal(next);
  };

  createEffect(
    on(locale, (current) => {
      persistLocale(storageKey(), current);
    }),
  );

  const t: TranslateFn = (key, params) => {
    const template = resolveTemplate(active(), fallback(), locale(), key, fallbackLocale());
    return compileMessage(template)(params, locale());
  };

  const ts: TranslateStaticFn = (key, params) => t(key, params);

  const tx: TranslateRichFn = (key, params) => {
    const template = resolveTemplate(active(), fallback(), locale(), key, fallbackLocale());
    const nodes = compileRichMessage(template)(stringParams(params), locale());
    return renderRichToJsx(nodes, params);
  };

  const formatNumber: I18nContextValue['formatNumber'] = (value, options) =>
    getNumberFormat(locale(), options).format(value);

  const formatDate: I18nContextValue['formatDate'] = (value, options) =>
    getDateTimeFormat(locale(), options ?? { dateStyle: 'medium' }).format(coerceDate(value));

  const formatRelativeTime: I18nContextValue['formatRelativeTime'] = (value, unit, options) =>
    getRelativeTimeFormat(locale(), options).format(value, unit);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    ts,
    tx,
    formatNumber,
    formatDate,
    formatRelativeTime,
  };

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (context) return context;

  const fallbackLocale: Accessor<Locale> = () => DEFAULT_FALLBACK_LOCALE;
  const fallbackT: TranslateFn = (key, params) => compileMessage(key)(params, DEFAULT_FALLBACK_LOCALE);

  return {
    locale: fallbackLocale,
    setLocale: () => undefined,
    t: fallbackT,
    ts: (key, params) => fallbackT(key, params),
    tx: (key, params) => {
      const nodes = compileRichMessage(key)(stringParams(params), DEFAULT_FALLBACK_LOCALE);
      return renderRichToJsx(nodes, params);
    },
    formatNumber: (value, options) => getNumberFormat(DEFAULT_FALLBACK_LOCALE, options).format(value),
    formatDate: (value, options) =>
      getDateTimeFormat(DEFAULT_FALLBACK_LOCALE, options ?? { dateStyle: 'medium' }).format(coerceDate(value)),
    formatRelativeTime: (value, unit, options) =>
      getRelativeTimeFormat(DEFAULT_FALLBACK_LOCALE, options).format(value, unit),
  };
};
