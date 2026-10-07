import type { Accessor, JSX } from 'solid-js';

import type { ComposedDictionaries } from './dictionary/types';
import type { I18nKey } from './keys';
import type { Locale } from './locale/locales';
import type { MessageParams, RichMessageParams } from './message/params';

export type TranslateFn = (key: I18nKey | (string & Record<never, never>), params?: MessageParams) => string;

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

export interface I18nProviderProps {
  readonly dictionaries?: ComposedDictionaries;
  readonly storageKey?: string;
  readonly initialLocale?: Locale;
  readonly fallbackLocale?: Locale;
}
