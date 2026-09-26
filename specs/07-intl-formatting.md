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
- The `value` parameter is coerced to a `Date` using the same rules as [04-message-format](04-message-format.md) Step 4 (Date instance used as-is; number or string passed to `new Date()`; other types emit a development-only warning and substitute `new Date(0)`).
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

## Step 4 — Formatter construction and reuse

Implementations MAY reuse formatter instances for performance. Cache keys, cache scope, eviction, and instance identity are not public contracts. Formatter construction MUST use the active locale and the caller's options as described above.

## Step 5 — Plural rules (internal)

The library uses `Intl.PluralRules` for plural branch selection (see [04-message-format](04-message-format.md) Step 5). Implementations MAY reuse `Intl.PluralRules` instances.

`Intl.PluralRules` instances are NOT exposed on the `I18nContextValue`. They are an implementation detail of the message compiler.
