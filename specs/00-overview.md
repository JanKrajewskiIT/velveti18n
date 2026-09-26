# Spec 00 — Overview & Goals

## Purpose

Deliver a single npm package that provides type-safe internationalization for SolidJS applications and libraries. The package centralizes locale management, dictionary composition, ICU MessageFormat translation, rich-text rendering with JSX tag handlers, and locale-aware Intl formatting so that every consumer can adopt full i18n support by installing one dependency, mounting one provider, and augmenting one TypeScript interface.

## Target consumers

- SolidJS single-page applications that need to serve users in multiple languages and require compile-time key safety, reactive locale switching, and Intl-based number/date/time formatting.
- SolidJS component libraries that ship their own translation strings and need to participate in the host application's i18n context without owning the locale signal or provider.

## Non-goals

- The library does NOT ship built-in translation dictionaries. All dictionary content is provided by consumers or dependent libraries.
- It does NOT perform network fetches to load translation files at runtime. Dictionaries are code-imported and composed before the provider mounts.
- It does NOT support server-side rendering of locale-detected content; the provider renders safely in SSR by falling back to the default locale.
- It does NOT provide a translation-management UI, extraction tooling, or integration with external translation services.
- It does NOT support runtime locale registration (adding a new locale after the build). Supported locales are a compile-time constant.
- It does NOT enforce any particular file structure for consumer dictionaries. Shape and import strategy are the consumer's responsibility.
- It does NOT support ICU MessageFormat v2 (the full standard). Only the subset documented in [04-message-format](04-message-format.md) is supported.

## Guiding principles

- **Single source of locale truth.** Every consumer component reads locale and translations from one reactive context rather than managing its own locale state.
- **Layered composition.** Foundation libraries, UI component libraries, and applications each contribute dictionary layers that are merged at construction time. No layer needs to know about the others' keys.
- **Strict namespace ownership.** Each dictionary author owns a disjoint top-level namespace. TypeScript module augmentation extends the global key set additively without deep-merge collisions.
- **Type-safe keys everywhere.** Once the global interface is augmented, every key passed to the static-translate function is validated at compile time. Typos, renamed keys, and missing translations surface as type errors.
- **Graceful degradation.** The translation hook outside the provider tree returns a non-crashing stub. The provider in SSR renders without throwing. Malformed templates fall back to passthrough rather than erroring.
- **Consistent repeated translation.** Repeated calls with the same template, locale, and parameters produce the same translation result. Implementations may cache parsing or formatting work.
- **ESM-only, zero extra runtime dependencies.** Only SolidJS is required at runtime.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Dictionary composition (build time / module load)          │
│                                                             │
│  Foundation layer       Library layer       App layer       │
│  { foundation: {...} }  { ui: {...} }       { app: {...} }  │
│         │                    │                   │          │
│         └────────────────────┴───────────────────┘          │
│                              │                              │
│                    defineDictionaries()                      │
│                              │                              │
│                  ComposedDictionaries (frozen)               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  I18nProvider (runtime)                                     │
│     ├─ locale signal (reactive)                             │
│     ├─ dictionary lookup (active + fallback locale)         │
│     └─ locale-sensitive Intl formatting                     │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     useI18n()       useI18n()      useI18n()
     t / ts / tx     formatNumber   locale / setLocale
     (component A)   (component B)  (locale switcher)
```

Library collaborators:

- **Dictionary factory** — accepts per-locale arrays of `DictionaryNode` layers, flattens each layer, merges layers left-to-right, and returns a frozen `ComposedDictionaries` record consumed by the provider.
- **Provider** — SolidJS component holding a reactive locale signal, the composed dictionaries, and all translation/formatting functions. Establishes the i18n context for its subtree.
- **Message processing** — parses supported message syntax and applies parameter substitution using the active locale.
- **Locale-sensitive formatting** — uses the platform `Intl` APIs for number, date/time, plural, and relative-time behavior.
- **Type utilities** — `DotPath<T>`, `TranslationOf<T>`, and `I18nDictionary` augmentation provide compile-time key safety and shape parity across locale variants.

## Framework-wide requirements

Import, provider setup, locale detection, persistence, and document-language synchronization MUST tolerate non-browser environments without throwing because browser globals are absent or inaccessible. This guarantee does not suppress errors caused by invalid caller-supplied Intl options or invalid date values; those cases are defined by the relevant formatting specs.

The library MUST NOT navigate the user, perform network requests, or write to any storage other than the single configurable localStorage key.

The library MUST expose exactly one reactive locale signal. Components MUST NOT need to manage locale state themselves.

Message rendering MUST be deterministic for the same template, locale, and parameters. Internal parse-result and formatter caching are optional optimizations.

The library MUST ship as ESM, side-effect-free, with TypeScript types included in the published artifact.

The public surface MUST remain stable within a major version. Breaking changes MUST be accompanied by spec changes.

The library MUST NOT log to the developer console in production. Development-only warnings MUST be suppressed when the build environment is not a development mode. Warning deduplication frequency is diagnostic behavior, not a consumer compatibility contract.

## Evidence and handoff

Implementation evidence and the clean-room boundary are recorded in [the spec index](README.md). The numbered specs define required observable behavior and published compatibility contracts. Internal module names, AST shapes, exact cache keys, and algorithms are not requirements unless explicitly stated as externally observable or necessary for package compatibility.

Before approving these specs as the sole brief for a replacement, resolve the open dispositions in the spec index. After approval, the rebuilding implementer MUST use only the approved specs and MUST NOT inspect the superseded implementation or its generated artifacts.

## How to read these specs

Specs are numbered in dependency order. Earlier specs define foundational contracts that later specs build on. Each spec is self-contained but cross-references neighbors when behavior overlaps. The configuration spec ([01-configuration](01-configuration.md)) and dictionary model ([03-dictionary-model](03-dictionary-model.md)) are referenced by almost every other spec; the type-safety spec ([08-type-safety](08-type-safety.md)) is referenced by all translation-function specs.
