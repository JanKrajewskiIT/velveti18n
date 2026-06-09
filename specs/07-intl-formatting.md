# Spec 07 — Intl Formatting

## Step 1 — Number formatting

The `formatNumber` function formats a numeric value using the active locale:

```typescript
type FormatNumberFn = (value: number | bigint, options?: Intl.NumberFormatOptions) => string;
```

- The function MUST use `Intl.NumberFormat(activeLocale, options)` internally.
- When `options` is absent or undefined, locale-default grouping and decimal separators MUST be applied.
- `options` is passed verbatim to `Intl.NumberFormat` without modification. The caller is responsible for supplying valid options.
- The function is reactive: it re-evaluates (and notifies SolidJS subscribers) when the active locale changes.

## Step 2 — Date/time formatting

The `formatDate` function formats a date or time value using the active locale:

```typescript
type FormatDateFn = (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
```

- The function MUST use `Intl.DateTimeFormat(activeLocale, options)` internally.
- The `value` parameter is coerced to a `Date` using the same rules as [04-message-format](04-message-format.md) Step 4 (Date instance used as-is; number or string passed to `new Date()`; invalid types emit a development-only warning and substitute `new Date(0)`).
- When `options` is absent or undefined, the library MUST apply `{ dateStyle: "medium" }` as the default, producing a medium-length date string.
- The function is reactive.

## Step 3 — Relative time formatting

The `formatRelativeTime` function formats a numeric value and a time unit as a relative time string using the active locale:

```typescript
type FormatRelativeTimeFn = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
) => string;
```

- The function MUST use `Intl.RelativeTimeFormat(activeLocale, options)` internally.
- Positive values represent future times ("in 3 days"); negative values represent past times ("3 days ago").
- `unit` is any valid `Intl.RelativeTimeFormatUnit` string (e.g., `"day"`, `"hour"`, `"month"`).
- When `options` is absent, `Intl.RelativeTimeFormat` is constructed with no extra options, yielding locale-default long-form output.
- The function is reactive.

## Step 4 — Formatter instance pooling

`Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.PluralRules`, and `Intl.RelativeTimeFormat` instances are expensive to construct. The library MUST maintain module-level caches for each formatter type:

**Cache key:**

The cache key for a formatter instance is derived from the locale string and the serialized options object:

```
key = options ? `${locale}|${JSON.stringify(options)}` : locale
```

The key MUST be computed deterministically. Two calls with structurally equal options objects MUST produce the same key and reuse the same instance.

**Cache behavior:**

- Each cache is a module-level `Map<string, FormatterInstance>` singleton.
- On first access for a given `(locale, options)` pair, the formatter is constructed and stored.
- On subsequent accesses, the stored instance is returned directly.
- Caches are never explicitly evicted. The pool grows monotonically with the number of distinct `(locale, options)` combinations used across the application's lifetime.

**Scope:**

The formatter pool MUST be shared across all provider instances. Constructing a new `I18nProvider` MUST NOT clear or reset the pool.

## Step 5 — Plural rules (internal)

The library uses `Intl.PluralRules` internally for plural branch selection during message compilation (see [04-message-format](04-message-format.md) Step 5). `Intl.PluralRules` instances MUST be cached using the same pool described in Step 4.

`Intl.PluralRules` instances are NOT exposed on the `I18nContextValue`. They are an implementation detail of the message compiler.
