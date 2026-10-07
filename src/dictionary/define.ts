import { createLocaleRecord } from '../locale/locales';
import { flatten, mergeFlat } from './flatDictionary';
import type { ComposedDictionaries, DictionaryNode, LocaleDictionariesInput } from './types';

export const defineDictionary = <const T extends DictionaryNode>(dictionary: T): T => dictionary;

export const defineDictionaries = (input: LocaleDictionariesInput): ComposedDictionaries =>
  createLocaleRecord((locale) => mergeFlat(...input[locale].map((layer) => flatten(layer))));

export const createEmptyComposedDictionaries = (): ComposedDictionaries => createLocaleRecord(() => mergeFlat());
