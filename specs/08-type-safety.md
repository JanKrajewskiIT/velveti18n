# Spec 08 — Type Safety

## Step 1 — I18nDictionary augmentation interface

The library MUST export an augmentable global interface (suggested name: `I18nDictionary`) using TypeScript declaration merging:

```typescript
// In the library's type declarations:
export interface I18nDictionary {}
```

Consumers extend this interface via module augmentation to register their dictionary type:

```typescript
// In a consumer application's type declaration file:
declare module "@scope/i18n" {
  interface I18nDictionary extends typeof myDictionary {}
}
```

When no augmentation is present, `I18nDictionary` is an empty interface equivalent to `Record<never, never>`.

## Step 2 — VelvetI18nKey conditional type

The library MUST export a conditional key type (suggested name: `I18nKey`):

```typescript
type I18nKey = keyof I18nDictionary extends never ? string : DotPath<I18nDictionary>;
```

- When `I18nDictionary` has not been augmented (its key set is empty), `I18nKey` resolves to `string`. All key arguments accept any string; no key validation occurs at compile time.
- When `I18nDictionary` has been augmented, `I18nKey` resolves to `DotPath<I18nDictionary>`, the exhaustive union of all valid dotted leaf paths. Unknown keys passed to `ts` or `tx` become TypeScript compile errors.

This design ensures the library is usable without augmentation (no type errors on unlocked keys) while providing full key safety once a consumer registers their dictionary.

## Step 3 — DotPath type utility

The library MUST export a `DotPath<T>` type utility that derives the union of all valid dotted leaf paths from a literal-typed nested object type:

```typescript
// Conceptual definition:
type DotPath<T> = ... // Recursive derivation of all "a.b.c" paths to string leaves
```

**Behavior:**

- For a type `{ a: { b: "hello"; c: "world" }; d: "!" }`, `DotPath<T>` MUST equal `"a.b" | "a.c" | "d"`.
- Only string leaf values are included. Object branches are NOT included as paths.
- The derivation MUST handle arbitrary nesting depth.
- When `T` contains only object branches (no string leaves), `DotPath<T>` MUST be `never`.

`DotPath<T>` is a compile-time-only utility. It generates no runtime code.

## Step 4 — TranslationOf type utility

The library MUST export a `TranslationOf<T>` type utility that maps a literal-typed dictionary type to its "translation mirror":

```typescript
// Conceptual definition:
type TranslationOf<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationOf<T[K]>;
};
```

**Purpose:**

`TranslationOf<T>` preserves the nested structure and key set of `T` but widens every string leaf from a literal type to `string`. This is used by library authors who define a canonical locale's dictionary as a `const` object (inferring literal types) and then type the other locales' dictionaries as `TranslationOf<typeof canonicalDict>`.

This ensures:

- The alternative locale dictionaries have the same shape (TypeScript enforces all keys and nesting).
- String leaf values are not constrained to match the canonical locale's exact strings.

## Step 5 — Namespace ownership rules

TypeScript's interface augmentation does NOT deep-merge nested objects. Two augmentations that extend `I18nDictionary` with overlapping top-level keys produce a TypeScript intersection of the two leaf types, which is almost always `never` for string leaves and causes type errors.

To avoid this, each dictionary author MUST own a disjoint top-level namespace:

- A UI component library MUST place all its keys under a dedicated top-level key (e.g., `{ ui: { button: { label: "..." }, ... } }`).
- The application MUST place all its keys under a separate top-level key (e.g., `{ app: { dashboard: { title: "..." }, ... } }`).
- Foundation layers MAY define their own namespace.
- No two augmenting modules MUST share the same top-level key.

This constraint MUST be documented prominently for consumers. The library MUST NOT enforce it at runtime; enforcement is a compile-time convention.

## Step 6 — defineDictionary and literal type inference

Dictionaries intended for use with `DotPath<T>` or `TranslationOf<T>` MUST be defined with `defineDictionary` (or an equivalent `as const` assertion):

```typescript
const enDict = defineDictionary({ button: { label: 'Save' } });
// typeof enDict → { readonly button: { readonly label: "Save" } }
// DotPath<typeof enDict> → "button.label"
```

Without `defineDictionary` or `as const`, TypeScript widens string values to `string`, and `DotPath` produces `string` instead of a precise union.

## Step 7 — Type surface exports

The library MUST export the following types from its public entry point:

| Export                 | Kind         | Description                                                               |
| ---------------------- | ------------ | ------------------------------------------------------------------------- |
| `Locale`               | Type alias   | Union of supported locale strings.                                        |
| `I18nDictionary`       | Interface    | Augmentable global key-set interface.                                     |
| `I18nKey`              | Type alias   | Conditional key type (`string` or `DotPath<I18nDictionary>`).             |
| `DotPath<T>`           | Type utility | Derives dotted leaf paths from a literal-typed object type.               |
| `TranslationOf<T>`     | Type utility | Maps a literal-typed dictionary type to its translation mirror.           |
| `DictionaryNode`       | Type alias   | Nested dictionary input shape.                                            |
| `FlatDictionary`       | Type alias   | Flat dotted-path dictionary.                                              |
| `ComposedDictionaries` | Type alias   | Frozen per-locale flat dictionary record, output of `defineDictionaries`. |
| `MessageParams`        | Type alias   | Plain substitution parameter map.                                         |
| `RichMessageParams`    | Type alias   | Substitution parameter map extended with `TagHandler` values.             |
| `TagHandler`           | Type alias   | JSX-returning tag wrapping function.                                      |
| `I18nContextValue`     | Interface    | Shape of the value returned by `useI18n`.                                 |
| `I18nProviderProps`    | Interface    | Shape of the provider's props.                                            |
