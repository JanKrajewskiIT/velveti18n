import type { DictionaryNode, FlatDictionary } from './types';

type FlatEntry = readonly [path: string, template: string];

const isDictionaryNode = (value: unknown): value is DictionaryNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const collectEntries = (node: DictionaryNode, parentPath: string | undefined): FlatEntry[] =>
  Object.entries(node).flatMap<FlatEntry>(([key, value]: [string, unknown]) => {
    const path = parentPath === undefined ? key : `${parentPath}.${key}`;
    if (typeof value === 'string') {
      return [[path, value]];
    }
    if (isDictionaryNode(value)) {
      return collectEntries(value, path);
    }
    throw new TypeError(`Dictionary entry ${JSON.stringify(path)} must be a string or an object.`);
  });

export const flatten = (node: DictionaryNode): FlatDictionary =>
  Object.freeze(Object.fromEntries(collectEntries(node, undefined)));

export const mergeFlat = (...layers: readonly FlatDictionary[]): FlatDictionary =>
  Object.freeze(Object.fromEntries(layers.flatMap<FlatEntry>((layer) => Object.entries(layer))));

export const lookup = (dictionary: FlatDictionary, key: string): string | undefined =>
  Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
