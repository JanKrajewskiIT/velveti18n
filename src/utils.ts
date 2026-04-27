/**
 * Pure utilities for dictionary normalization and merging.
 *
 * The engine internally operates on a flat `Record<string, string>` keyed by
 * dotted paths. These helpers convert nested dictionaries to that shape and
 * compose multiple layers into a single dictionary.
 */

import type { DictionaryNode, FlatDictionary } from './types';

const isPlainObject = (value: unknown): value is DictionaryNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Recursively flatten a nested dictionary into dotted-path → template.
 *
 * Pre-flattened (already dotted) keys pass through unchanged, so a layer
 * may freely mix nested branches and flat leaves with dots in their keys.
 *
 * @example
 *   flatten({ a: { b: 'B' }, 'c.d': 'D' }) // => { 'a.b': 'B', 'c.d': 'D' }
 */
export function flatten(node: DictionaryNode, prefix = '', target: Record<string, string> = {}): FlatDictionary {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      target[path] = value;
    } else if (isPlainObject(value)) {
      flatten(value, path, target);
    }
  }
  return target;
}

/**
 * Merge multiple already-flat dictionaries left-to-right; later layers win.
 * Returns a frozen object so downstream consumers can rely on stability.
 */
export function mergeFlat(...layers: ReadonlyArray<FlatDictionary>): FlatDictionary {
  const out: Record<string, string> = {};
  for (const layer of layers) {
    for (const key in layer) {
      const value = layer[key];
      if (value !== undefined) out[key] = value;
    }
  }
  return Object.freeze(out);
}

/**
 * Resolve a dotted path against a nested dictionary. Returns `undefined`
 * when any segment is missing. Used by the runtime when a dictionary was
 * provided in nested form and we want to support either lookup style.
 */
export function getByPath(node: DictionaryNode, path: string): string | undefined {
  let cursor: string | DictionaryNode | undefined = node;
  for (const segment of path.split('.')) {
    if (cursor === undefined || typeof cursor === 'string') return undefined;
    cursor = cursor[segment];
  }
  return typeof cursor === 'string' ? cursor : undefined;
}
