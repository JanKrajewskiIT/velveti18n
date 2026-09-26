import type { Accessor, JSX } from 'solid-js';

import { lookup } from './dictionary';
import { warnOnce } from './internal/env';
import { coerceDate, getDateTimeFormat, getNumberFormat, getRelativeTimeFormat } from './intl';
import { DEFAULT_FALLBACK_LOCALE, type Locale } from './locales';
import type { RichNode } from './message/ast';
import { compileMessage, compileRichMessage } from './message/compile';
import type { MessageParams, RichMessageParams } from './params';
import type { FlatDictionary, I18nKey } from './types';

export type TranslateFn = (key: I18nKey | (string & {}), params?: MessageParams) => string;

export type TranslateStaticFn = (key: I18nKey, params?: MessageParams) => string;

export type TranslateRichFn = (key: I18nKey, params?: RichMessageParams) => JSX.Element;

export type FormatNumberFn = (value: number | bigint, options?: Intl.NumberFormatOptions) => string;

export type FormatDateFn = (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;

export type FormatRelativeTimeFn = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
) => string;

export interface I18nContextValue {
  readonly locale: Accessor<Locale>;
  readonly setLocale: (locale: Locale) => void;
  readonly t: TranslateFn;
  readonly ts: TranslateStaticFn;
  readonly tx: TranslateRichFn;
  readonly formatNumber: FormatNumberFn;
  readonly formatDate: FormatDateFn;
  readonly formatRelativeTime: FormatRelativeTimeFn;
}

interface I18nFunctionsConfig {
  readonly locale: Accessor<Locale>;
  readonly setLocale: (locale: Locale) => void;
  readonly activeDictionary: Accessor<FlatDictionary>;
  readonly fallbackDictionary: Accessor<FlatDictionary>;
  readonly hasDictionaries: boolean;
}

const renderRichNodes = (nodes: readonly RichNode[], params?: RichMessageParams): JSX.Element =>
  nodes.map((node) => {
    if (typeof node === 'string') return node;
    const children = renderRichNodes(node.children, params);
    const handler = params?.[node.tag];
    if (typeof handler === 'function') return handler(children);
    return children;
  });

export const createI18nFunctions = (config: I18nFunctionsConfig): I18nContextValue => {
  const resolveTemplate = (key: string): string => {
    if (!config.hasDictionaries) return key;
    const fromActive = lookup(config.activeDictionary(), key);
    if (fromActive !== undefined) return fromActive;
    const fromFallback = lookup(config.fallbackDictionary(), key);
    if (fromFallback !== undefined) {
      warnOnce(
        `missing-active:${key}`,
        `[i18n] Key "${key}" is missing in the active locale; resolved via fallback locale.`,
      );
      return fromFallback;
    }
    warnOnce(`missing-key:${key}`, `[i18n] Missing translation key: "${key}".`);
    return key;
  };

  const translate: TranslateFn = (key, params) => compileMessage(resolveTemplate(key))(params, config.locale());

  const translateRich: TranslateRichFn = (key, params) =>
    renderRichNodes(compileRichMessage(resolveTemplate(key))(params, config.locale()), params);

  const formatNumber: FormatNumberFn = (value, options) => getNumberFormat(config.locale(), options).format(value);

  const formatDate: FormatDateFn = (value, options) =>
    getDateTimeFormat(config.locale(), options ?? { dateStyle: 'medium' }).format(coerceDate(value));

  const formatRelativeTime: FormatRelativeTimeFn = (value, unit, options) =>
    getRelativeTimeFormat(config.locale(), options).format(value, unit);

  return {
    locale: config.locale,
    setLocale: config.setLocale,
    t: translate,
    ts: translate,
    tx: translateRich,
    formatNumber,
    formatDate,
    formatRelativeTime,
  };
};

const EMPTY_DICTIONARY: FlatDictionary = Object.freeze({});

export const STUB_I18N_CONTEXT: I18nContextValue = createI18nFunctions({
  locale: () => DEFAULT_FALLBACK_LOCALE,
  setLocale: () => {
    warnOnce('stub-set-locale', '[i18n] setLocale called outside an I18nProvider; the call is a no-op.');
  },
  activeDictionary: () => EMPTY_DICTIONARY,
  fallbackDictionary: () => EMPTY_DICTIONARY,
  hasDictionaries: false,
});
