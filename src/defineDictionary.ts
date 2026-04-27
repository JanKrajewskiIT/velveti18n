/**
 * Public API for composing layered dictionaries.
 *
 * Apps assemble their final dictionary by passing every layer's nested or
 * flat dictionary to `defineDictionaries`. The runtime flattens each layer
 * once and merges left-to-right; later layers override earlier ones.
 *
 * @example
 *   import { defineDictionaries } from '@jankrajewskiit/i18n';
 *   import { en as uiEn, pl as uiPl } from '@jankrajewskiit/ui';
 *   import { en as appEn, pl as appPl } from '~/i18n';
 *
 *   const dictionaries = defineDictionaries({
 *     en: [uiEn, appEn],
 *     pl: [uiPl, appPl],
 *   });
 *
 *   <I18nProvider dictionaries={dictionaries}>...</I18nProvider>
 */

import type { DictionaryNode, FlatDictionary, Locale } from './types';
import { flatten, mergeFlat } from './utils';

export type DictionaryInput = DictionaryNode;

export type LocaleDictionariesInput = Readonly<Record<Locale, ReadonlyArray<DictionaryInput>>>;

export type ComposedDictionaries = Readonly<Record<Locale, FlatDictionary>>;

/**
 * Flatten and merge every layer for every locale into a single ready-to-consume
 * dictionary map. The result is referentially stable for a given input and
 * safe to memoize.
 */
export function defineDictionaries(input: LocaleDictionariesInput): ComposedDictionaries {
  const result = {} as Record<Locale, FlatDictionary>;
  for (const locale of Object.keys(input) as Locale[]) {
    const layers = input[locale];
    const flat = layers.map((layer) => flatten(layer));
    result[locale] = mergeFlat(...flat);
  }
  return Object.freeze(result);
}

/**
 * Type-level helper: define a dictionary as `const` while preserving
 * literal types. Apps and libraries call this to obtain a compile-time
 * key set usable in `DotPath<T>`.
 *
 * Runtime is identity – the value is returned untouched.
 */
export function defineDictionary<const T extends DictionaryNode>(dict: T): T {
  return dict;
}
