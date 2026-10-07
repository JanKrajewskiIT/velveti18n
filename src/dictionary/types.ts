import type { Locale } from '../locale/locales';

export interface DictionaryNode {
  readonly [key: string]: string | DictionaryNode;
}

export type FlatDictionary = Readonly<Record<string, string>>;

export type LocaleDictionariesInput = Readonly<Record<Locale, readonly DictionaryNode[]>>;

export type ComposedDictionaries = Readonly<Record<Locale, FlatDictionary>>;
