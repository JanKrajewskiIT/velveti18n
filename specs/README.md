# Spec index — i18n framework

Behavioral specification of a headless, type-safe i18n library for SolidJS applications. It defines consumer-visible behavior and package compatibility; private source layout and algorithms are not contracts unless explicitly required for observable behavior.

## Technical stack

| Layer            | Constraint                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime          | SolidJS (≥ 1.9). The library exposes a SolidJS provider component and reactive accessors.                                              |
| Language         | TypeScript. All public surface is typed.                                                                                               |
| Message format   | Strict ICU MessageFormat subset extended with XML-style tag pairs for rich-text translation.                                           |
| Bundling         | ESM-only, side-effect-free, types bundled with the published package.                                                                  |
| Host environment | Browser-first. Import and provider setup are safe without browser globals; browser-only detection and side effects degrade gracefully. |

The library MUST NOT introduce runtime dependencies beyond SolidJS.

## Rebuild handoff

The numbered specs are the implementation brief for a clean-room replacement. Use source files only as provenance while preparing or reviewing this brief; after this spec version is approved as the handoff, a rebuilding implementer MUST NOT inspect the old source, diffs, generated output, or implementation-specific documentation. The replacement may use different internal modules, data structures, parsing strategies, and caching, provided specified public behavior and package contracts are preserved.

The current source establishes evidence, not automatic requirements. The disagreements below are unresolved until an owner accepts a disposition; do not infer that a source behavior is intentional merely because it exists.

Use a spec filename plus its `Step` heading as the stable reference for requirements. The source-provenance table maps each spec to its implementation evidence. A behavior proposed to improve safety or correctness, rather than directly observed in source, is called out in the discrepancy table and remains subject to the stated disposition.

| Topic                            | Source evidence                                                                                                                                                                    | Required disposition before a clean-room rebuild                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial composed dictionary type | `src/types.ts` declares `ComposedDictionaries` as a `Partial<Record<Locale, FlatDictionary>>`, while `defineDictionaries` emits every supported locale.                            | Keep factory output complete; decide whether the public provider type must reject partial records.                                                                         |
| Prototype-named keys             | `src/dictionary.ts` reads flat entries with ordinary property access, so inherited names such as `toString` can be mistaken for translations when absent.                          | Dictionary lookup MUST distinguish own entries from inherited object properties; decide whether special property names are valid dictionary keys or explicitly disallowed. |
| Initial locale validation        | `src/I18nProvider.tsx` initializes directly from `initialLocale`; subsequent prop updates are validated. The declared prop type is `Locale`.                                       | Treat valid `Locale` as the public input contract; decide whether runtime validation is required for untyped callers.                                                      |
| Non-throwing guarantee           | Browser-global access is guarded, but invalid `Intl` options or invalid date values can still throw.                                                                               | Limit the guarantee to absent/inaccessible browser globals, or explicitly define normalization for invalid formatter inputs.                                               |
| Warning frequency                | `warnOnce` deduplicates by a module-global string key, not by call site.                                                                                                           | Warnings are diagnostic only; preserve only documented development/production visibility unless call-site frequency is explicitly contractual.                             |
| Package setup                    | `.gitmodules` contains only `.agents`; CI installs with `GHCR_TOKEN`; `eslint.config.mjs` adds a rule override; `package.json` is `2.0.1` while `CHANGELOG.md` only lists `0.1.0`. | Resolve these repository/tooling discrepancies before treating [10-release-and-tooling](10-release-and-tooling.md) as a clean-room package contract.                       |

## Source provenance

| Spec  | Authoritative implementation evidence                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01-02 | `src/I18nProvider.tsx`, `src/detection.ts`, `src/locales.ts`, `src/internal/env.ts`                                                                                |
| 03    | `src/dictionary.ts`, `src/types.ts`                                                                                                                                |
| 04-05 | `src/message/ast.ts`, `src/message/parser.ts`, `src/message/render.ts`, `src/message/compile.ts`, `src/intl.ts`                                                    |
| 06-07 | `src/i18n-functions.ts`, `src/params.ts`, `src/intl.ts`, `src/I18nContext.ts`                                                                                      |
| 08-09 | `src/types.ts`, `src/index.ts`, `src/I18nProvider.tsx`, `README.md`                                                                                                |
| 10    | `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `lint-staged.config.mjs`, `.github/workflows/`, `.gitmodules`, `README.md`, `CHANGELOG.md` |

## Naming reference

Specs use functional names consistently so cross-references work. These names are suggestions for the public API surface; an implementation MAY choose different identifiers as long as the externally observable behavior is preserved.

| Functional concept                              | Suggested name         |
| ----------------------------------------------- | ---------------------- |
| Root SolidJS provider component                 | `I18nProvider`         |
| Provider props shape                            | `I18nProviderProps`    |
| Hook returning the reactive i18n context        | `useI18n`              |
| i18n context shape                              | `I18nContextValue`     |
| Reactive locale accessor                        | `locale`               |
| Locale setter                                   | `setLocale`            |
| General-purpose translate function              | `t`                    |
| Strict literal-key translate function           | `ts`                   |
| Rich-text translate function                    | `tx`                   |
| Locale-aware number format function             | `formatNumber`         |
| Locale-aware date/time format function          | `formatDate`           |
| Locale-aware relative time format function      | `formatRelativeTime`   |
| Dictionary definition helper                    | `defineDictionary`     |
| Multi-locale dictionary composition factory     | `defineDictionaries`   |
| Composed dictionary pair (output type)          | `ComposedDictionaries` |
| Nested dictionary input shape                   | `DictionaryNode`       |
| Flat dotted-path dictionary                     | `FlatDictionary`       |
| Augmentable global key-set interface            | `I18nDictionary`       |
| Dotted-path key inference type utility          | `DotPath<T>`           |
| Translation-mirror type utility                 | `TranslationOf<T>`     |
| Supported locale union type                     | `Locale`               |
| Supported locales constant                      | `SUPPORTED_LOCALES`    |
| Plain translation parameter map                 | `MessageParams`        |
| Rich-text parameter map (includes tag handlers) | `RichMessageParams`    |
| JSX tag wrapping function                       | `TagHandler`           |

## Index

| #   | Spec                                                                       | Topic                                                             |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 00  | [overview](00-overview.md)                                                 | Goals, non-goals, architecture, guiding principles.               |
| 01  | [configuration](01-configuration.md)                                       | Provider props, defaults, provider mount behavior.                |
| 02  | [locale-detection-and-persistence](02-locale-detection-and-persistence.md) | Detection order, storage, document lang attribute.                |
| 03  | [dictionary-model](03-dictionary-model.md)                                 | DictionaryNode, FlatDictionary, flattening, layered composition.  |
| 04  | [message-format](04-message-format.md)                                     | ICU MessageFormat subset: syntax, placeholders, plural, select.   |
| 05  | [rich-text](05-rich-text.md)                                               | XML-style tags, TagHandler, rich-text rendering.                  |
| 06  | [translation-functions](06-translation-functions.md)                       | t, ts, tx — key resolution, fallback, missing-key behavior.       |
| 07  | [intl-formatting](07-intl-formatting.md)                                   | formatNumber, formatDate, formatRelativeTime, formatter behavior. |
| 08  | [type-safety](08-type-safety.md)                                           | I18nDictionary augmentation, DotPath, TranslationOf, namespaces.  |
| 09  | [consumer-integration](09-consumer-integration.md)                         | Integration requirements, ordering, layered composition pattern.  |
| 10  | [release-and-tooling](10-release-and-tooling.md)                           | Packaging shape, verification gates, CI and release pipelines.    |

## Glossary

| Term                     | Meaning                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Locale**               | A language/region identifier. The library supports a fixed, compile-time union of locale strings.                                              |
| **Dictionary**           | A nested or flat map of translation keys to ICU MessageFormat template strings.                                                                |
| **DictionaryNode**       | The recursive nested-object input shape for a dictionary (string leaves, object branches).                                                     |
| **FlatDictionary**       | A fully flattened, read-only map of dotted-path keys to template strings. Used internally for O(1) lookup.                                     |
| **ComposedDictionaries** | A frozen per-locale record of `FlatDictionary` values, produced by the dictionary factory and passed to the provider.                          |
| **Template**             | An ICU MessageFormat string (with optional XML-style tag extensions) stored as a dictionary leaf.                                              |
| **Layer**                | One `DictionaryNode` contributing to a locale's flat dictionary. Multiple layers are merged left-to-right; later layers override earlier ones. |
| **Namespace**            | A top-level key in a dictionary owned exclusively by one layer author (e.g., a library or an application).                                     |
| **Active locale**        | The locale currently in use, stored in a reactive SolidJS signal.                                                                              |
| **Fallback locale**      | The locale consulted when a key is absent from the active locale's dictionary.                                                                 |
| **Provider**             | The SolidJS component that establishes the i18n context for the subtree it wraps.                                                              |
| **Consumer**             | A SolidJS application or library that mounts the provider and uses the translation functions.                                                  |
| **TagHandler**           | A JSX-returning function supplied by the caller of `tx` that wraps the children of a named XML-style tag.                                      |
| **RichNode**             | Illustrative rich-text model for text segments and nested tags; not a required internal or exported type.                                      |
| **Module augmentation**  | TypeScript's `declare module` mechanism used to extend the global `I18nDictionary` interface with application-specific dictionary types.       |
| **DotPath**              | A TypeScript type utility that derives every valid dotted leaf path from a literal-typed nested object type.                                   |

## How to update

Specs are numbered in dependency order. Earlier specs define foundational contracts; later specs build on them. Each spec is self-contained but cross-references neighbors when behavior overlaps. The configuration spec ([01-configuration](01-configuration.md)) and the dictionary model ([03-dictionary-model](03-dictionary-model.md)) are referenced by almost every other spec. The type-safety spec ([08-type-safety](08-type-safety.md)) is referenced by all translation-function specs.

When changing behavior, update the affected spec first. Cross-spec impacts MUST update every affected spec. Behavioral changes to any MUST requirement constitute a breaking change (major version bump).
