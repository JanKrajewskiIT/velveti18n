# Spec 04 — Message Format

## Step 1 — Template language overview

The library supports a strict subset of ICU MessageFormat as the template language for translation strings. Templates are plain strings stored as dictionary leaf values. The supported syntax elements are:

| Element                    | Syntax example                                          | Description                               |
| -------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| Plain text                 | `Hello, world!`                                         | Emitted verbatim.                         |
| Simple placeholder         | `Hello, {name}!`                                        | Replaced with a parameter value.          |
| Number format              | `{count, number}` / `{value, number, percent}`          | Formats a number via `Intl.NumberFormat`. |
| Date format                | `{date, date}` / `{date, date, short}`                  | Formats a date via `Intl.DateTimeFormat`. |
| Time format                | `{time, time}` / `{time, time, long}`                   | Formats a time via `Intl.DateTimeFormat`. |
| Plural selection           | `{count, plural, one {# item} other {# items}}`         | Selects a branch by plural category.      |
| String selection           | `{gender, select, male {He} female {She} other {They}}` | Selects a branch by string value.         |
| Quote escape               | `It''s {count} items` / `Don't use '{name}'`            | Escapes special characters.               |
| XML-style tags (rich only) | `<link>Click here</link>`                               | See [05-rich-text](05-rich-text.md).      |

The library MUST NOT support ICU MessageFormat elements outside this table (e.g., `choiceFormat`, `spellout`, ordinal formatting). Unsupported elements MUST be treated as parse errors.

## Step 2 — Simple placeholders

A simple placeholder `{name}` is replaced with the value of the parameter named `name` from `MessageParams`.

- If the parameter is present and non-null, it MUST be coerced to a string via standard JavaScript string coercion.
- If the parameter is absent, `null`, or `undefined`, the placeholder MUST be rendered as the literal string `{name}` (the braces and identifier).

For number and date/time format arguments, a missing parameter is not treated as a literal placeholder: it follows the coercion rules below. A `number` argument coerces non-bigint values with JavaScript `Number`; absent or non-numeric values are formatted according to `Intl.NumberFormat` handling of `NaN`.

## Step 3 — Number formatting

`{name, number}` formats the parameter named `name` as a locale-aware number using `Intl.NumberFormat`.

Optional style modifiers (the third token after a second `,`):

| Style modifier | Effective `Intl.NumberFormatOptions`              | Notes                                                                                                                 |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| _(absent)_     | default `Intl.NumberFormat` with no extra options | Locale default grouping and decimal separators.                                                                       |
| `percent`      | `{ style: "percent" }`                            | Value is multiplied by 100 and formatted with the locale's percent symbol.                                            |
| `currency`     | `{ style: "currency", currency: "USD" }`          | Development-only warning MUST be emitted; consumers SHOULD use `formatNumber` with explicit currency options instead. |
| `integer`      | `{ maximumFractionDigits: 0 }`                    | Uses `Intl.NumberFormat` rounding with zero fractional digits.                                                        |

## Step 4 — Date formatting

`{name, date}` formats the parameter named `name` as a locale-aware date using `Intl.DateTimeFormat`.

`{name, time}` formats it as a locale-aware time.

Optional style modifiers (matched case-sensitively):

| Style modifier | Effective `dateStyle` or `timeStyle` option | Default when absent                                                       |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| `short`        | `"short"`                                   | —                                                                         |
| `medium`       | `"medium"`                                  | date default                                                              |
| `long`         | `"long"`                                    | —                                                                         |
| `full`         | `"full"`                                    | —                                                                         |
| _(absent)_     | —                                           | `{ dateStyle: "medium" }` for `date`; `{ timeStyle: "short" }` for `time` |

The parameter value MUST be coerced to a `Date` object before formatting:

- A `Date` instance is used as-is.
- A `number` or `string` is passed to `new Date(value)`.
- Any other type, including `null`, MUST emit a development-only warning and substitute `new Date(0)` (Unix epoch).
- A `string` or `number` that produces an invalid `Date` is passed to `Intl.DateTimeFormat`; the resulting formatter error is not converted to a parse fallback.

## Step 5 — Plural selection

`{name, plural, ...branches}` selects and renders one branch based on the numeric value of the parameter named `name`.

**Branch matching order:**

1. Coerce the parameter using JavaScript `Number`.
2. Exact-match branches, written as `=N` (e.g., `=0`, `=1`). The branch wins when its selector suffix equals the coerced number's JavaScript string representation.
3. Category branches (`zero`, `one`, `two`, `few`, `many`, `other`). For a finite number, the category is determined by `Intl.PluralRules(locale).select(value)`.
4. `other` acts as the fallback, including when the value is non-finite. Every plural template MUST include an `other` branch.

**Pound placeholder (`#`):**

Inside a plural branch, the special token `#` is replaced with the formatted numeric value of the parameter (formatted as a plain number for the active locale, with no extra style options).
Outside a plural branch, `#` is ordinary literal text.

Plural branches MAY contain any supported template syntax recursively, including nested placeholders, date/time formatting, and selections. The `#` token formats the coerced plural value as a locale-default number; a non-finite value is rendered according to `Intl.NumberFormat`.

## Step 6 — String selection

`{name, select, ...branches}` selects and renders one branch based on the string value of the parameter named `name`.

**Branch matching:**

1. The parameter value is coerced with JavaScript `String`, including absent values (`"undefined"`) and `null` (`"null"`).
2. If a branch key exactly matches the string value, that branch is used.
3. Otherwise, the `other` branch is used. Every select template MUST include an `other` branch.

Select branches MAY contain any supported template syntax recursively.

## Step 7 — Quote-based escaping

The single-quote character `'` controls escaping of special characters (`{`, `}`, `<`, `>`, `#`):

| Pattern                        | Result                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `''`                           | A single literal `'` character.                                                                                  |
| `'` followed by a special char | Starts an escape span. Characters until the closing `'` are emitted verbatim, including `{`, `}`, `<`, `>`, `#`. |
| `'` followed by a non-special  | Emitted as a literal `'` without starting an escape span.                                                        |

An escape span that is never closed by a matching `'` MUST be treated as a parse error (see Step 8).

## Step 8 — Parser error handling

When a template string contains a syntax error, the library MUST:

1. Emit a development-only warning once per unique template string (not per render call).
2. Return the raw template string as-is (passthrough) rather than throwing or rendering a broken output.

Parse errors MUST NOT propagate to the calling component. The component continues to render; it receives the raw template string as its translation output.

## Step 9 — Template compilation and caching

The library MUST parse templates lazily when a translation call requires them. Implementations MAY cache parsed or compiled results, but cache scope, eviction, and compiled-function identity are not public contracts.

- Templates containing no special syntax MAY be returned directly without parsing.
