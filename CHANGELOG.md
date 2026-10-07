# Changelog

## 3.2.0

### Breaking

- A dictionary entry that is neither a string nor a plain object now throws a `TypeError` instead of being skipped.
- A plural or select argument with a duplicated branch selector is a template syntax error and renders as the raw template.
- `#` is quotable only inside plural branches.
- In `tx`, a function value never fills a placeholder, plural, select, number, or date argument; the argument renders as absent.

### Added

- Development warnings for missing keys, fallback hits, and unsupported locales.
- Bounded caches for compiled messages and `Intl` formatters.

### Changed

- Reimplemented the package from the behavioral specs in `specs/`.
- Dictionary lookup ignores properties inherited from `Object.prototype`; own entries named `toString` or `constructor` are valid translations.
- `ComposedDictionaries` is a complete per-locale record.
- The initial locale is resolved before the first render instead of after mount.
- Development warnings follow the consumer's Solid development build.
- Peer range of `solid-js` is bounded to `>=1.9.0 <2`.

### Fixed

- Unbalanced rich-text tags are recovered in linear time.
- `''` inside a quoted span renders a literal apostrophe.

## 0.1.0

### Breaking

- Initial public package contract.

### Added

- SolidJS provider, reactive locale context, translation functions, and `Intl` formatters.
- Layered dictionary composition and type-safe dictionary utilities.
- ICU MessageFormat subset parsing and rich-text tag handlers.
- ESM package build, CI verification, and provenance-enabled release workflow.

### Changed

- None.

### Fixed

- None.
