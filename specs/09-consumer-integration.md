# Spec 09 — Consumer Integration Contract

## Step 1 — Required capabilities

The library MUST support each of the following integration capabilities. The "How" column describes the consumer-observable shape.

| #   | Capability                              | How it MUST be available                                                                                                                                          |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Single root provider mount              | A SolidJS component the consumer mounts once near the root of its tree, parameterized by composed dictionaries, storage key, initial locale, and fallback locale. |
| 2   | Reactive i18n context access            | A SolidJS hook readable inside the provider's subtree that returns the `I18nContextValue`.                                                                        |
| 3   | General-purpose translation             | `t(key, params?)` returning `string`, accepting any string key (including computed keys).                                                                         |
| 4   | Strict literal-key translation          | `ts(key, params?)` returning `string`, accepting only compile-time-known `I18nKey` values.                                                                        |
| 5   | Rich-text translation with JSX handlers | `tx(key, params?)` returning `JSX.Element`, with `TagHandler` values in params.                                                                                   |
| 6   | Reactive locale accessor and setter     | `locale()` (reactive accessor) and `setLocale(locale)` on the context value.                                                                                      |
| 7   | Locale-aware number formatting          | `formatNumber(value, options?)` on the context value.                                                                                                             |
| 8   | Locale-aware date/time formatting       | `formatDate(value, options?)` on the context value.                                                                                                               |
| 9   | Locale-aware relative time formatting   | `formatRelativeTime(value, unit, options?)` on the context value.                                                                                                 |
| 10  | Dictionary composition factory          | `defineDictionaries(input)` callable outside any component, accepting per-locale layer arrays.                                                                    |
| 11  | Literal-type dictionary helper          | `defineDictionary(dict)` callable at module scope to define literal-typed dictionaries.                                                                           |
| 12  | Degraded fallback outside provider      | `useI18n()` outside the provider tree MUST return a non-crashing stub rather than throwing.                                                                       |
| 13  | Global key-set augmentation             | An exportable `I18nDictionary` interface the consumer extends via `declare module` augmentation.                                                                  |
| 14  | Type utilities                          | `DotPath<T>` and `TranslationOf<T>` exported for use in library and application dictionary definitions.                                                           |

## Step 2 — Degraded fallback behavior

When `useI18n()` is called outside a mounted provider (e.g., in unit tests, in SSR context, or from a component mounted before the provider), the library MUST return a stub `I18nContextValue` with the following behavior:

| Field                | Stub behavior                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `locale()`           | Returns the default fallback locale (`"en"`).                                                                     |
| `setLocale`          | No-op. MUST emit a development-only warning once per call site.                                                   |
| `t(key, params?)`    | Returns the compiled template for `key` with params applied, treating `key` itself as the template (passthrough). |
| `ts(key, params?)`   | Same as `t`.                                                                                                      |
| `tx(key, params?)`   | Returns the compiled rich-text output for `key` with params applied, treating `key` itself as the template.       |
| `formatNumber`       | Formats using the default fallback locale.                                                                        |
| `formatDate`         | Formats using the default fallback locale.                                                                        |
| `formatRelativeTime` | Formats using the default fallback locale.                                                                        |

The stub MUST NOT throw under any circumstance. Its purpose is to keep primitive library components and isolated unit tests functional without a provider tree.

## Step 3 — Required integration ordering

| Rule                                                                                                                 | Rationale                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `defineDictionaries` MUST be called before the provider mounts and its output stored in a stable reference.          | The provider derives memos from the dictionaries prop; a new reference on each render recreates the memos.                     |
| `defineDictionary` calls MUST reside at module scope, not inside component functions.                                | `defineDictionary` is a type-level helper; calling it inside a component is harmless but wastes renders.                       |
| The provider MUST wrap any consumer component that calls `useI18n` and expects a real dictionary.                    | Hook called outside provider returns the stub — usable but key lookups are passthrough.                                        |
| Module augmentation of `I18nDictionary` MUST be performed in a file that is part of the TypeScript compilation unit. | Augmentations in non-imported files are silently ignored by TypeScript.                                                        |
| Each dictionary layer author MUST own a disjoint top-level namespace in their contribution.                          | Overlapping top-level keys in augmented interfaces produce `never` leaf types. See [08-type-safety](08-type-safety.md) Step 5. |

## Step 4 — Layered dictionary composition pattern

Consumers that compose dictionaries from multiple sources (e.g., a foundation layer, a UI library layer, and an application layer) MUST follow this pattern:

1. Each layer author defines their dictionary using `defineDictionary` at module scope.
2. Each layer author exports their dictionary for both locales.
3. The application calls `defineDictionaries` once, passing all layers per locale in the desired merge order:

```typescript
const dictionaries = defineDictionaries({
  en: [foundationEnDict, uiLibEnDict, appEnDict],
  pl: [foundationPlDict, uiLibPlDict, appPlDict],
});
```

4. The output of `defineDictionaries` is stored at module scope (not inside a component) and passed to the provider's `dictionaries` prop.

Merge order determines precedence: entries in later layers override entries in earlier layers on key collision.

## Step 5 — Module augmentation pattern

Consumers who want compile-time key safety MUST augment `I18nDictionary` in a TypeScript declaration file that is included in their `tsconfig.json` compilation:

```typescript
// e.g., src/i18n.d.ts
import type { AppEnDictionary } from './dictionaries/en';

declare module '@scope/i18n' {
  interface I18nDictionary extends AppEnDictionary {}
}
```

Library authors who ship their own translation layer MUST also augment `I18nDictionary` in their library's type declarations so that applications installing the library gain key completions for the library's keys automatically.

Each augmenting module MUST only augment with its own namespace. Augmenting with a type that introduces keys outside the author's designated namespace MUST be avoided to prevent conflicts with other augmentations.

## Step 6 — Anti-patterns the library MUST make difficult

| Anti-pattern                                                                  | Why wrong                                                                              | How the library helps                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Calling `defineDictionaries` inside a component function                      | Creates a new `ComposedDictionaries` reference on every render, defeating memo caching | Document the module-scope requirement; the provider's memo is invalidated on reference change.                 |
| Augmenting `I18nDictionary` with overlapping top-level keys                   | Produces `never` leaf types, causing `I18nKey` to become `never`                       | Document namespace ownership; TypeScript surfaces the resulting type errors.                                   |
| Passing a raw plain object as `dictionaries` instead of the factory output    | No type guarantee of frozen per-locale structure                                       | `I18nProviderProps` types `dictionaries` as `ComposedDictionaries`, which is only assignable from the factory. |
| Using `t` for all calls including literal keys                                | Loses compile-time key validation; typos go undetected until runtime                   | Expose `ts` with narrowed key type; enforce the `ts`-for-literals convention via ESLint.                       |
| Mounting the locale switcher outside the provider                             | `setLocale` on the stub is a no-op; locale change has no effect                        | Document that the provider must wrap all locale-aware UI.                                                      |
| Two augmenting modules extending `I18nDictionary` with the same top-level key | TypeScript intersects leaf types to `never`                                            | Enforce namespace uniqueness in documentation; the type error surfaces immediately.                            |
