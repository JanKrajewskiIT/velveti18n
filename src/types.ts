import type { Locale } from './locales';

export type DictionaryNode = { readonly [key: string]: string | DictionaryNode };

export type FlatDictionary = Readonly<Record<string, string>>;

export type ComposedDictionaries = Readonly<Record<Locale, FlatDictionary>>;

export type DotPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPath<T[K]> & string}`;
    }[keyof T & string];

export type TranslationOf<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationOf<T[K]>;
};

export interface I18nDictionary {}

export type I18nKey = keyof I18nDictionary extends never ? string : DotPath<I18nDictionary>;
