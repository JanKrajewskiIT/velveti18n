# @jankrajewskiit/i18n

Headless, type-safe i18n primitives for SolidJS — extracted from
`@jankrajewskiit/ui`.

A small but capable runtime around a strict ICU MessageFormat subset
(extended with XML-style tag pairs for rich-text translation), wired into
SolidJS via a context provider.

## Features

- `defineDictionary` / `defineDictionaries` — compose layered dictionaries
  (foundation + library + app) with literal-typed key inference.
- `I18nProvider` — Solid context exposing reactive `locale()` / `setLocale()`,
  `t()`, `ts()` (strict-key variant), `tx()` (rich/JSX), `formatNumber()`,
  `formatDate()`, `formatRelativeTime()`.
- `useI18n()` — degraded fallback when used outside a provider (returns
  keys verbatim) so primitive components remain rendered in tests.
- `compileMessage` / `compileRichMessage` — standalone parser/compiler API
  for advanced consumers.
- `VelvetI18nDictionary` — module-augmentation hook for compile-time key
  validation across foundation/library/app layers.

## Peer dependencies

- `solid-js`

## Storage key

`I18nProvider` accepts an explicit `storageKey` prop (defaults to
`velvet-locale`) to persist the user's locale to `localStorage`. There is
no implicit global config — callers are in full control.

## Notes

The VelvetUi foundation dictionary (and any other UI-bound dictionaries)
remain in `@jankrajewskiit/ui`; this package is generic and dictionary-free.
