# Spec 06 — Translation Functions

## Step 1 — Function type signatures

The i18n context exposes three translation functions. Their type signatures are:

```typescript
// General-purpose translation. Accepts any string key.
type TranslateFn = (key: I18nKey | (string & {}), params?: MessageParams) => string;

// Strict literal-key translation. Key must be a statically known member of I18nKey.
type TranslateStaticFn = (key: I18nKey, params?: MessageParams) => string;

// Rich-text translation. Returns JSX.Element.
type TranslateRichFn = (key: I18nKey, params?: RichMessageParams) => JSX.Element;
```

`I18nKey` is the conditional key type described in [08-type-safety](08-type-safety.md). The `(string & {})` intersection on `TranslateFn` widens the type to accept dynamic string values while still showing known keys as completions in editors. `TranslateStaticFn` accepts only statically known keys; a computed string value assigned to the key parameter MUST produce a TypeScript type error unless explicitly cast.

## Step 2 — Key resolution algorithm

All three translation functions use the same key resolution algorithm at runtime:

1. Look up the key in the active locale's `FlatDictionary`.
2. If found, compile the template (see [04-message-format](04-message-format.md) Step 9) and apply the supplied params and active locale. Return the result.
3. If not found in the active locale, look up the key in the fallback locale's `FlatDictionary`.
4. If found in the fallback locale, compile and apply. A development-only warning MAY identify that the active locale is missing the key.
5. If not found in either dictionary, a development-only warning MAY identify the missing key. Return the key string itself as the translation output (passthrough).

Step 5 (passthrough on missing key) MUST NOT throw. Components MUST continue to render even when translation keys are missing.

## Step 3 — General-purpose translate: `t`

`t(key, params?)` is the general-purpose translation function intended for dynamic keys (keys computed at runtime, loaded from data, or derived from external sources).

The `key` parameter accepts both the statically known `I18nKey` union and any `string`. Type safety for dynamically computed keys is the caller's responsibility.

`t` returns a `string`. It MUST NOT return a `JSX.Element`. Rich-text tag syntax in a template passed through `t` MUST render as literal markup strings in the output.

## Step 4 — Strict literal-key translate: `ts`

`ts(key, params?)` is the strict counterpart intended for known, statically typed translation keys.

The `key` parameter accepts only `I18nKey`. Passing a variable of type `string` to `ts` MUST be a TypeScript compile error unless the value has been narrowed to `I18nKey`.

At runtime, `ts` is identical to `t`. The distinction is purely at the type level to enforce that call sites using `ts` cannot accidentally pass an unvalidated string.

**Convention:** Consumer code SHOULD use `ts` everywhere a key is written as a string literal, and `t` only when the key is computed dynamically. `@jankrajewskiit/configs/eslint` provides the `buildLiteralI18nKeyRule` builder to enforce this convention for consumer code.

## Step 5 — Rich-text translate: `tx`

`tx(key, params?)` translates a template that contains XML-style tag pairs into a `JSX.Element`.

- The `key` parameter accepts only `I18nKey` (same as `ts`).
- The `params` parameter is a `RichMessageParams` record containing both plain substitution values and `TagHandler` functions keyed by tag name.
- The return value is a `JSX.Element` suitable for direct use as JSX children.

`tx` applies the tag-rendering behavior described in [05-rich-text](05-rich-text.md) Step 4 after resolving the template via the key resolution algorithm in Step 2.

When a key resolved via the fallback locale contains rich-text tags, the fallback rendering MUST also use the `tx` rendering path (not the plain-string path).

## Step 6 — Reactivity

All three translation functions are reactive in the SolidJS sense. They read the active locale signal and the active/fallback dictionary signals during execution. When the locale changes:

- Any SolidJS computation (component render, `createMemo`, `createEffect`) that called a translation function during its last execution MUST be re-run.
- The re-run MUST use the new active locale's dictionary for lookup.

Implementations that close over reactive SolidJS accessors (signals or memos) satisfy this requirement automatically, because SolidJS tracks reads during computation execution.

## Step 7 — Parameter types

`MessageParams` is a readonly record of named substitution values:

```typescript
type MessageParams = Readonly<Record<string, string | number | boolean | Date | null | undefined>>;
```

`RichMessageParams` extends this with `TagHandler` values:

```typescript
type RichMessageParams = Readonly<Record<string, string | number | boolean | Date | null | undefined | TagHandler>>;
```

The library MUST distinguish `TagHandler` values (functions) from plain values at runtime by checking `typeof value === "function"`. Functions in a `t` or `ts` call's params MUST be treated as plain values and coerced to their string representation.
