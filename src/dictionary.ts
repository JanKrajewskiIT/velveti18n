import type { Locale } from './locales.js';
import { SUPPORTED_LOCALES } from './locales.js';
import type { ComposedDictionaries, DictionaryNode, FlatDictionary, LocaleDictionariesInput } from './types.js';

const createFlatRecord = (): Record<string, string> => Object.create(null) as Record<string, string>;

const isDictionaryObject = (value: unknown): value is DictionaryNode => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const flattenInto = (dictionary: DictionaryNode, target: Record<string, string>, prefix: string): void => {
  for (const key of Object.keys(dictionary)) {
    const value = dictionary[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      target[path] = value;
    } else if (isDictionaryObject(value)) {
      flattenInto(value, target, path);
    }
  }
};

export const flatten = (dictionary: DictionaryNode): FlatDictionary => {
  const flattened = createFlatRecord();
  flattenInto(dictionary, flattened, '');
  return Object.freeze(flattened);
};

export const mergeFlat = (...layers: readonly FlatDictionary[]): FlatDictionary => {
  const merged = createFlatRecord();

  for (const layer of layers) {
    for (const key of Object.keys(layer)) {
      const value = layer[key];
      if (Object.hasOwn(layer, key) && value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return Object.freeze(merged);
};

export const lookup = (dictionary: FlatDictionary, key: string): string | undefined =>
  Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;

export const defineDictionary = <const T extends DictionaryNode>(dictionary: T): T => dictionary;

export const createEmptyComposedDictionaries = (): ComposedDictionaries => {
  const empty = Object.freeze(createFlatRecord());
  const result = Object.create(null) as Record<Locale, FlatDictionary>;

  for (const locale of SUPPORTED_LOCALES) {
    result[locale] = empty;
  }

  return Object.freeze(result);
};

export const defineDictionaries = (input: LocaleDictionariesInput): ComposedDictionaries => {
  const composed = Object.create(null) as Record<Locale, FlatDictionary>;

  for (const locale of SUPPORTED_LOCALES) {
    const layers = input[locale].map((layer) => flatten(layer));
    composed[locale] = mergeFlat(...layers);
  }

  return Object.freeze(composed);
};
