/**
 * Core i18n types for the Velvet i18n engine.
 *
 * The engine accepts dictionaries in two interchangeable shapes:
 *   - **Nested**: `{ common: { add: 'Add' } }` – preferred for new code.
 *   - **Flat (dotted)**: `{ 'common.add': 'Add' }` – legacy / large dictionaries.
 *
 * Both are normalized internally to a flat lookup. Type-safety is provided by
 * `DotPath<T>` which derives every dotted key from a nested literal-typed dict.
 *
 * Apps extend the global key space by augmenting `VelvetI18nDictionary`:
 *
 * ```ts
 * declare module '@jankrajewskiit/i18n' {
 *   interface VelvetI18nDictionary extends AppDictionary {}
 * }
 * ```
 */

export type Locale = 'en' | 'pl';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'pl'] as const;

/**
 * Recursive dictionary shape: leaves are message templates (strings).
 * Nested branches are themselves dictionaries.
 */
export interface DictionaryNode {
  readonly [key: string]: string | DictionaryNode;
}

/**
 * Internal flat representation: dotted-path → template.
 * The provider compiles every callsite against this map.
 */
export type FlatDictionary = Readonly<Record<string, string>>;

/**
 * Derive every dotted leaf path from a nested literal-typed dictionary.
 *
 * `DotPath<{ a: { b: '...' }, c: '...' }>` ⇒ `'a.b' | 'c'`.
 *
 * Both nested and flat literal types collapse to the same set of paths,
 * so consumer dictionaries may use either shape.
 */
export type DotPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${DotPath<T[K]>}`
          : never;
    }[keyof T & string];

/**
 * Augmentable global dictionary describing the union of every layer
 * (foundation + libraries + app).
 *
 * Empty by default — `@jankrajewskiit/i18n` is dictionary-free. Foundation
 * libraries (e.g. `@jankrajewskiit/ui`) seed their key set via module
 * augmentation, and apps add their own layers the same way:
 *
 * ```ts
 * declare module '@jankrajewskiit/i18n' {
 *   interface VelvetI18nDictionary extends MyAppDictionary {}
 * }
 * ```
 *
 * ## Namespace ownership rule (IMPORTANT)
 *
 * Each augmenting layer **must own a disjoint top-level namespace**.
 * TypeScript interface augmentation does NOT deep-merge nested object
 * types — when two layers both declare e.g. `table: { ... }`, only one
 * wins (the property collapses to a single layer's shape) and `DotPath`
 * silently loses keys from the other layer. This produces type errors
 * that look like missing-key errors but are actually namespace collisions.
 *
 * Library/app authors: pick a top-level key not used by any layer you
 * depend on.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VelvetI18nDictionary {}

/**
 * Convenience: the resolved global key set, narrowed to strings.
 * Falls back to `string` when no augmentation is applied (so generic
 * consumers compile against an open-ended key set; augmented paths are
 * still accepted because they exist in the merged runtime dictionary).
 */
export type VelvetI18nKey = [keyof VelvetI18nDictionary] extends [never] ? string : DotPath<VelvetI18nDictionary>;

/**
 * Parameters accepted by the message formatter.
 * `Date` values are accepted by `{x, date, ...}` / `{x, time, ...}` placeholders;
 * everything else coerces via the formatter's number/select rules.
 */
export type MessageParams = Readonly<Record<string, string | number | boolean | Date | null | undefined>>;

/**
 * Map a literal-typed dictionary shape to its "translation mirror" shape:
 * preserves the nested structure and key set, but widens every string leaf
 * to `string` so other locales can supply different translations against
 * the same shape contract.
 *
 * Used by foundation dictionaries (`pl: TranslationOf<typeof en>`) and by
 * library/app dictionaries that want to enforce shape parity across locales.
 */
export type TranslationOf<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends DictionaryNode ? TranslationOf<T[K]> : never;
};
