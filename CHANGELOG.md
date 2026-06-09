# Changelog

All notable changes to this package are documented here. The format groups changes into Breaking, Added, Changed, and Fixed sections.

## 0.1.0

### Breaking

- None (initial release).

### Added

- `I18nProvider` with reactive locale signal, detection (localStorage → navigator → `"en"`), persistence, and `document.documentElement.lang` synchronization.
- `useI18n` hook returning the reactive context, with a non-crashing stub outside the provider tree.
- Translation functions `t`, `ts`, and `tx` over a strict ICU MessageFormat subset (placeholders, number/date/time, plural, select, quote escaping) plus XML-style rich-text tags with JSX handlers.
- Locale-aware `formatNumber`, `formatDate`, and `formatRelativeTime` backed by a shared module-level Intl formatter pool.
- Dictionary composition: `defineDictionary`, `defineDictionaries`, `flatten`, `mergeFlat`, `lookup`, and `createEmptyComposedDictionaries`.
- Type safety: augmentable `I18nDictionary`, conditional `I18nKey`, `DotPath<T>`, and `TranslationOf<T>`.

### Changed

- None (initial release).

### Fixed

- None (initial release).
