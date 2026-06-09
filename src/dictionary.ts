import { SUPPORTED_LOCALES, type Locale } from './locales';
import type { ComposedDictionaries, DictionaryNode, FlatDictionary } from './types';

export const flatten = (node: DictionaryNode, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of Object.keys(node)) {
    const value = node[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flatten(value, path));
    }
  }
  return result;
};

export const mergeFlat = (...layers: readonly FlatDictionary[]): FlatDictionary => {
  const merged: Record<string, string> = {};
  for (const layer of layers) Object.assign(merged, layer);
  return Object.freeze(merged);
};

export const lookup = (dictionary: FlatDictionary, key: string): string | undefined => dictionary[key];

export const defineDictionary = <const T extends DictionaryNode>(dictionary: T): T => dictionary;

export type LocaleDictionariesInput = {
  readonly [L in Locale]: readonly DictionaryNode[];
};

export const createEmptyComposedDictionaries = (): ComposedDictionaries => {
  const result = {} as Record<Locale, FlatDictionary>;
  for (const locale of SUPPORTED_LOCALES) {
    result[locale] = Object.freeze({});
  }
  return Object.freeze(result);
};

export const defineDictionaries = (input: LocaleDictionariesInput): ComposedDictionaries => {
  const result = {} as Record<Locale, FlatDictionary>;
  for (const locale of SUPPORTED_LOCALES) {
    const layers = input[locale];
    const flatLayers = layers.map((layer) => flatten(layer));
    result[locale] = mergeFlat(...flatLayers);
  }
  return Object.freeze(result);
};
