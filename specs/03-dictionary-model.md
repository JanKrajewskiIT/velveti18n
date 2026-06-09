# Spec 03 — Dictionary Model

## Step 1 — DictionaryNode shape

A `DictionaryNode` is a plain JavaScript object whose values are either strings (leaf translation entries) or nested `DictionaryNode` objects (branches). There is no depth limit. Keys MUST be plain strings without dots; dotted-path notation is reserved for the flat representation (Step 2).

```
DictionaryNode = { [key: string]: string | DictionaryNode }
```

Example:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "form": {
    "validation": {
      "required": "This field is required"
    }
  }
}
```

## Step 2 — FlatDictionary shape

A `FlatDictionary` is a read-only map from dotted-path strings to template strings. It is the internal representation used for O(1) key lookup.

```
FlatDictionary = Readonly<Record<string, string>>
```

The dotted path for a leaf is formed by joining all ancestor keys and the leaf key with `.` as the separator. For the example in Step 1:

```
"common.save"              → "Save"
"common.cancel"            → "Cancel"
"form.validation.required" → "This field is required"
```

## Step 3 — Flattening algorithm

The library MUST provide a `flatten` utility (may be internal) that converts a `DictionaryNode` into a `FlatDictionary`:

1. Iterate every key of the input object.
2. If the value is a string, emit `{ [prefix ? prefix + "." + key : key]: value }`.
3. If the value is a plain object, recurse with the updated prefix.
4. Return the accumulated flat map.

Keys that are already in dotted-path form at the top level of a `DictionaryNode` MUST pass through unchanged; the algorithm MUST NOT double-flatten them.

The flattening operation MUST be pure and deterministic: the same `DictionaryNode` input MUST always produce the same `FlatDictionary` output.

## Step 4 — Layer merging

Multiple `FlatDictionary` values are merged left-to-right with later layers overriding earlier ones on key collision:

```
mergeFlat(layer1, layer2, layer3) → FlatDictionary
```

The result MUST be a new frozen object. Mutation of source layers MUST NOT affect the merged output.

## Step 5 — defineDictionary helper

The library MUST export a `defineDictionary` helper function:

```
defineDictionary<const T extends DictionaryNode>(dict: T): T
```

At runtime, the function is an identity: it returns the value it receives without modification.

Its purpose is purely at the type level: by accepting the argument as `const T`, TypeScript infers the dictionary's literal type rather than widening all string values to `string`. The resulting type is then usable as the type argument to `DotPath<T>` and `TranslationOf<T>` (see [08-type-safety](08-type-safety.md)).

## Step 6 — defineDictionaries factory

The library MUST export a `defineDictionaries` factory function:

```
defineDictionaries(input: LocaleDictionariesInput): ComposedDictionaries
```

**Input shape** (`LocaleDictionariesInput`):

A record keyed by every member of `Locale`, where each value is a readonly array of `DictionaryNode` layers:

```
{ en: [layer1, layer2, ...], pl: [layer1, layer2, ...] }
```

Every supported locale MUST appear as a key. Absent locales MUST cause a TypeScript compile error, not a runtime error.

**Processing**:

For each locale:

1. Flatten each `DictionaryNode` layer independently using the algorithm in Step 3.
2. Merge the resulting flat layers left-to-right using the algorithm in Step 4.
3. Store the merged `FlatDictionary` under the locale key.

**Output shape** (`ComposedDictionaries`):

A frozen record keyed by `Locale`, where each value is the merged `FlatDictionary`:

```
Readonly<Record<Locale, FlatDictionary>>
```

The output object and each per-locale dictionary MUST be frozen (`Object.freeze`). Consumers MUST NOT mutate `ComposedDictionaries` after construction; mutation attempts in strict mode MUST throw a `TypeError`.

The output is referentially stable: passing the same layers in the same order MUST produce a value suitable for memoization by the provider.

## Step 7 — Lookup

The library MUST provide an internal lookup function that resolves a dotted-path key against a `FlatDictionary`:

```
lookup(dict: FlatDictionary, key: string): string | undefined
```

The function MUST return `undefined` when the key is absent. The caller is responsible for applying the fallback strategy described in [06-translation-functions](06-translation-functions.md).

## Step 8 — Invariants

- A `ComposedDictionaries` value MUST be constructed exclusively by `defineDictionaries`. The provider MUST NOT accept ad-hoc plain objects in place of the factory output.
- `FlatDictionary` values MUST be frozen before they leave the factory. No translation function MAY modify them.
- The empty dictionary state (no `composedDictionaries` prop on the provider) MUST be represented by frozen empty objects for each locale, not by `null` or `undefined`.
