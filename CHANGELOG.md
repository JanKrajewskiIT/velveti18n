# Changelog

## Unreleased

### Breaking

### Added

### Changed

- Reimplemented the package from the behavioral specs in `specs/`.
- Dictionary lookup now ignores properties inherited from `Object.prototype`; own entries named `toString` or `constructor` are valid translations.
- `ComposedDictionaries` is a complete per-locale record.
- Peer range of `solid-js` is bounded to `>=1.9.0 <2`.

### Fixed
