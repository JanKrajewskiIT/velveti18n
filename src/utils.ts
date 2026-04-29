import type { DictionaryNode, FlatDictionary } from './types';

const isPlainObject = (value: unknown): value is DictionaryNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

export function getByPath(node: DictionaryNode, path: string): string | undefined {
  let cursor: string | DictionaryNode | undefined = node;
  for (const segment of path.split('.')) {
    if (cursor === undefined || typeof cursor === 'string') return undefined;
    cursor = cursor[segment];
  }
  return typeof cursor === 'string' ? cursor : undefined;
}
