# @jankrajewskiit/i18n

Type-safe, reactive internationalization for SolidJS. ICU MessageFormat subset, rich-text tags with JSX handlers, `Intl` formatting, layered dictionaries, and compile-time key safety. ESM-only, side-effect-free, no runtime dependencies beyond `solid-js`.

## Install

Route the package scope to GitHub Packages in the consumer's `.npmrc`; add an `_authToken` entry only through an environment variable, never as a literal:

```ini
@jankrajewskiit:registry=https://npm.pkg.github.com
```

```sh
npm install @jankrajewskiit/i18n
```

Peer dependency: `solid-js` `>=1.9.0 <2`. Node `>=26` is required by the package manifest.

## Integration overview

Each dictionary author owns one top-level namespace. Define the canonical locale with `defineDictionary` so key literals are inferred, then type the other locales as `TranslationOf` of it.

```ts
// src/dictionaries.ts
import { defineDictionaries, defineDictionary, type TranslationOf } from '@jankrajewskiit/i18n';

const appEn = defineDictionary({
  app: {
    greeting: 'Hello, {name}!',
    terms: 'Read the <link>terms</link>.',
    items: '{count, plural, one {# item} other {# items}}',
  },
});

const appPl: TranslationOf<typeof appEn> = {
  app: {
    greeting: 'Cześć, {name}!',
    terms: 'Przeczytaj <link>regulamin</link>.',
    items: '{count, plural, one {# element} few {# elementy} many {# elementów} other {# elementu}}',
  },
};

export type AppDictionary = typeof appEn;

export const dictionaries = defineDictionaries({ en: [appEn], pl: [appPl] });
```

Augment the key set in a declaration file that belongs to the TypeScript compilation:

```ts
// src/i18n.d.ts
import type { AppDictionary } from './dictionaries';

declare module '@jankrajewskiit/i18n' {
  interface I18nDictionary extends AppDictionary {}
}
```

Mount the provider once and call `useI18n` below it:

```tsx
import { I18nProvider, useI18n } from '@jankrajewskiit/i18n';

import { dictionaries } from './dictionaries';

const Greeting = () => {
  const { ts, tx, formatDate } = useI18n();

  return (
    <p>
      {ts('app.greeting', { name: 'Ada' })} {tx('app.terms', { link: (children) => <a href="/terms">{children}</a> })}{' '}
      {formatDate(new Date())}
    </p>
  );
};

export const App = () => (
  <I18nProvider dictionaries={dictionaries}>
    <Greeting />
  </I18nProvider>
);
```

Rules that keep the integration correct:

- Call `defineDictionaries` and `defineDictionary` at module scope and pass the retained result to the provider.
- Use `ts` and `tx` for literal keys and `t` only for keys computed at runtime.
- Do not share a top-level key between two augmenting modules; TypeScript intersects the declarations and incompatible leaves become `never`.
- Mount every locale-aware component below `I18nProvider`. Outside it, `useI18n` returns a stub that treats keys as templates and ignores `setLocale`.

### Behavior notes

- The active locale resolves from `initialLocale`, then `localStorage` at `storageKey`, then `navigator.language`, then `"en"`. Persistence and `document.documentElement.lang` updates are best-effort and silent when browser globals are unavailable.
- A key missing from the active locale falls back to `fallbackLocale`, then to the key itself.
- Malformed templates render as the raw template. Development warnings are emitted only when the consumer resolves Solid's development build.
- A single quote escapes `{`, `}`, `<`, `>` (and `#` inside plural branches) when it directly precedes one of them; `''` is a literal quote.
- A tag without a handler renders its children; an unbalanced tag renders as literal text.

## Formatting an already resolved template

Version 3.4.2 exports `formatMessage(template, locale, params)` and `formatRichMessage(template, locale, params)`. These functions use the same parser, plural rules, formatting caches and rich-text handlers as the provider, but accept a template directly without looking it up as a dictionary key. Pass `{}` when a message has no parameters. They do not need a Solid owner or change locale storage or document metadata.

```ts
import { formatMessage, formatRichMessage } from '@jankrajewskiit/i18n';

const rows = formatMessage('{count, plural, one {# row} other {# rows}}', 'en', { count: 2 });
const selection = formatRichMessage('<strong>{count}</strong> selected', 'en', {
  count: 2,
  strong: (children) => children,
});
```

`formatMessage` returns a string; `formatRichMessage` returns a Solid `JSX.Element`. Rich templates are rendered through explicit tag handlers rather than HTML insertion. Libraries can use these functions for fallback templates while keeping the existing provider's active locale and dictionary overrides.

## Public surface

| Export                                                                                | Kind  | Description                                                                           |
| ------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| `I18nProvider`                                                                        | value | Root provider; props `dictionaries`, `storageKey`, `initialLocale`, `fallbackLocale`. |
| `I18nContext`                                                                         | value | Solid context holding the `I18nContextValue`.                                         |
| `useI18n`                                                                             | value | Returns the context value, or a degraded stub outside the provider.                   |
| `SUPPORTED_LOCALES`, `isSupportedLocale`                                              | value | Supported locale list and its type guard.                                             |
| `resolveInitialLocale`                                                                | value | Resolves a requested locale, persisted locale, browser language, and fallback.        |
| `DEFAULT_FALLBACK_LOCALE`, `DEFAULT_STORAGE_KEY`                                      | value | Provider defaults (`"en"`, `"velvet-locale"`).                                        |
| `defineDictionary`                                                                    | value | Identity helper that preserves literal dictionary types.                              |
| `defineDictionaries`                                                                  | value | Flattens and merges per-locale layers into frozen dictionaries.                       |
| `createEmptyComposedDictionaries`                                                     | value | Frozen empty dictionary for every supported locale.                                   |
| `flatten`, `mergeFlat`, `lookup`                                                      | value | Dictionary utilities; `lookup` ignores inherited properties.                          |
| `Locale`                                                                              | type  | Union of supported locales.                                                           |
| `DictionaryNode`, `FlatDictionary`, `LocaleDictionariesInput`, `ComposedDictionaries` | type  | Dictionary input, flat, and composed shapes.                                          |
| `I18nDictionary`, `I18nKey`                                                           | type  | Augmentable key set and the derived key type.                                         |
| `DotPath<T>`, `TranslationOf<T>`                                                      | type  | Dotted leaf paths and the translation mirror of a dictionary.                         |
| `MessageParams`, `RichMessageParams`, `TagHandler`                                    | type  | Substitution values and rich-text tag handlers.                                       |
| `TranslateFn`, `TranslateStaticFn`, `TranslateRichFn`                                 | type  | Signatures of `t`, `ts`, and `tx`.                                                    |
| `FormatNumberFn`, `FormatDateFn`, `FormatRelativeTimeFn`                              | type  | Signatures of the locale-aware formatters.                                            |
| `I18nContextValue`, `I18nProviderProps`                                               | type  | Context value and provider props.                                                     |

## Upgrading

Changes for every published version are recorded in [CHANGELOG.md](CHANGELOG.md).

## Provenance verification

Releases are published with npm provenance. Verify an installed version with:

```sh
npm audit signatures @jankrajewskiit/i18n
```

A passing audit attests that the registry signature and the sigstore provenance attestation match the tarball, which ties it to the source commit and the publish workflow run.

## Release workflow

1. Confirm the default branch is green and `CHANGELOG.md` has a section for the new version.
2. `npm version patch|minor|major` and commit the changelog edit with the bump.
3. `git push --follow-tags`.

The `v<semver>` tag starts `publish.yml`: verify, version check, then `npm publish --provenance --access public`. A failed provenance step fails the run; re-run it against the same tag once sigstore is reachable.

Recover from a broken release by publishing a superseding patch and running `npm deprecate @jankrajewskiit/i18n@<broken-version> "<reason>"`. Never unpublish a version consumers may have installed.

## Branch protection

Protect the default branch with:

- a required, passing `verify` status check that includes the `npm audit` step;
- at least one approving CODEOWNERS review;
- a branch that is up to date before merging;
- force pushes and non-administrative direct pushes disabled.
