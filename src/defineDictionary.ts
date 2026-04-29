import type { DictionaryNode, FlatDictionary, Locale } from './types';
import { flatten, mergeFlat } from './utils';

export type DictionaryInput = DictionaryNode;

export type LocaleDictionariesInput = Readonly<Record<Locale, ReadonlyArray<DictionaryInput>>>;

export type ComposedDictionaries = Readonly<Record<Locale, FlatDictionary>>;

export function defineDictionaries(input: LocaleDictionariesInput): ComposedDictionaries {
  const result = {} as Record<Locale, FlatDictionary>;
  for (const locale of Object.keys(input) as Locale[]) {
    const layers = input[locale];
    const flat = layers.map((layer) => flatten(layer));
    result[locale] = mergeFlat(...flat);
  }
  return Object.freeze(result);
}

export function defineDictionary<const T extends DictionaryNode>(dict: T): T {
  return dict;
}
