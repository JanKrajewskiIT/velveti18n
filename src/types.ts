import type { Accessor, ParentProps } from 'solid-js';
import type { JSX } from 'solid-js';

import type { Locale } from './locales.js';

export type { Locale } from './locales.js';

export type DictionaryNode = {
  readonly [key: string]: string | DictionaryNode;
};

export type FlatDictionary = Readonly<Record<string, string>>;

export type LocaleDictionariesInput = Readonly<Record<Locale, readonly DictionaryNode[]>>;

export type ComposedDictionaries = Readonly<Record<Locale, FlatDictionary>>;

export type MessageParams = Readonly<Record<string, string | number | boolean | Date | null | undefined>>;

export type TagHandler = (children: JSX.Element) => JSX.Element;

export type RichMessageParams = Readonly<
  Record<string, string | number | boolean | Date | null | undefined | TagHandler>
>;

export interface I18nDictionary {}

type JoinPath<Key extends string, Path> = Path extends string ? `${Key}.${Path}` : never;

type DotPathRecursive<T, Seen> = T extends Seen
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends string
          ? K
          : T[K] extends object
            ? JoinPath<K, DotPathRecursive<T[K], Seen | T>>
            : never;
      }[keyof T & string]
    : never;

export type DotPath<T> = DotPathRecursive<T, never>;

export type TranslationOf<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends object ? TranslationOf<T[K]> : never;
};

export type I18nKey = keyof I18nDictionary extends never ? string : DotPath<I18nDictionary>;

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

export type I18nProviderProps = ParentProps<{
  readonly dictionaries?: ComposedDictionaries;
  readonly storageKey?: string;
  readonly initialLocale?: Locale;
  readonly fallbackLocale?: Locale;
}>;
