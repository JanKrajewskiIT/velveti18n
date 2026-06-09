# @jankrajewskiit/i18n

Headless, type-safe internationalization for SolidJS: locale management, multi-layer dictionary composition, ICU MessageFormat translation, rich-text rendering with JSX tag handlers, and locale-aware Intl formatting. ESM-only, side-effect-free, zero runtime dependencies beyond SolidJS.

## Install

```sh
npm install @jankrajewskiit/i18n
```

Add the scope-to-registry mapping to your `.npmrc`:

```
@jankrajewskiit:registry=https://npm.pkg.github.com
```

Peer dependencies:

| Peer       | Minimum version |
| ---------- | --------------- |
| `solid-js` | `>=1.9`         |

## Integration overview

```tsx
import { render } from 'solid-js/web';
import { I18nProvider, defineDictionary, defineDictionaries, useI18n, type TranslationOf } from '@jankrajewskiit/i18n';

const en = defineDictionary({
  app: {
    greeting: 'Hello, {name}!',
    items: '{count, plural, one {# item} other {# items}}',
    terms: 'Read the <link>terms</link>.',
    updated: 'Updated {date, date, long}',
  },
});

const pl: TranslationOf<typeof en> = {
  app: {
    greeting: 'Cześć, {name}!',
    items: '{count, plural, one {# rzecz} few {# rzeczy} many {# rzeczy} other {# rzeczy}}',
    terms: 'Przeczytaj <link>regulamin</link>.',
    updated: 'Zaktualizowano {date, date, long}',
  },
};

const dictionaries = defineDictionaries({
  en: [en],
  pl: [pl],
});

const Demo = () => {
  const { ts, tx, formatDate, setLocale } = useI18n();
  return (
    <section>
      <p>{ts('app.greeting', { name: 'Ada' })}</p>
      <p>{ts('app.items', { count: 3 })}</p>
      <p>{tx('app.terms', { link: (children) => <a href="/terms">{children}</a> })}</p>
      <p>{ts('app.updated', { date: new Date() })}</p>
      <button onClick={() => setLocale('pl')}>Polski</button>
    </section>
  );
};

render(
  () => (
    <I18nProvider dictionaries={dictionaries} fallbackLocale="en">
      <Demo />
    </I18nProvider>
  ),
  document.getElementById('root')!,
);
```

Register your dictionary for compile-time key safety (e.g. `src/i18n.d.ts`, included in `tsconfig.json`):

```ts
import type en from './dictionaries/en';

declare module '@jankrajewskiit/i18n' {
  interface I18nDictionary extends Pick<typeof en, 'app'> {}
}
```

Each dictionary author MUST own a disjoint top-level namespace (e.g. `app`, `ui`). Overlapping top-level keys across augmentations collapse leaf types to `never`.

## Public surface

| Export                                                       | Kind      | Description                                                                      |
| ------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------- |
| `I18nProvider`                                               | Component | Root provider establishing the reactive i18n context for its subtree.            |
| `I18nProviderProps`                                          | Type      | Provider props: `dictionaries`, `storageKey`, `initialLocale`, `fallbackLocale`. |
| `useI18n`                                                    | Hook      | Returns the reactive `I18nContextValue`; a non-crashing stub outside a provider. |
| `I18nContextValue`                                           | Type      | Shape of the value returned by `useI18n`.                                        |
| `defineDictionary`                                           | Function  | Identity helper preserving literal types for `DotPath`/`TranslationOf`.          |
| `defineDictionaries`                                         | Function  | Flattens and merges per-locale layers into a frozen `ComposedDictionaries`.      |
| `createEmptyComposedDictionaries`                            | Function  | Frozen empty per-locale dictionary record.                                       |
| `flatten` / `mergeFlat` / `lookup`                           | Functions | Dictionary primitives.                                                           |
| `SUPPORTED_LOCALES`                                          | Constant  | Readonly ordered list of supported locales.                                      |
| `DEFAULT_FALLBACK_LOCALE`                                    | Constant  | The hard-coded fallback locale (`"en"`).                                         |
| `DEFAULT_STORAGE_KEY`                                        | Constant  | Default `localStorage` key (`"velvet-locale"`).                                  |
| `isSupportedLocale`                                          | Function  | Runtime type guard for `Locale`.                                                 |
| `Locale`                                                     | Type      | Union of supported locale strings.                                               |
| `I18nDictionary`                                             | Interface | Augmentable global key-set interface.                                            |
| `I18nKey`                                                    | Type      | Conditional key type (`string` or `DotPath<I18nDictionary>`).                    |
| `DotPath<T>`                                                 | Type util | Derives dotted leaf paths from a literal-typed object type.                      |
| `TranslationOf<T>`                                           | Type util | Maps a literal-typed dictionary to its translation mirror.                       |
| `DictionaryNode` / `FlatDictionary` / `ComposedDictionaries` | Types     | Dictionary shapes.                                                               |
| `MessageParams` / `RichMessageParams` / `TagHandler`         | Types     | Translation parameter shapes.                                                    |
| `TranslateFn` / `TranslateStaticFn` / `TranslateRichFn`      | Types     | `t` / `ts` / `tx` signatures.                                                    |
| `FormatNumberFn` / `FormatDateFn` / `FormatRelativeTimeFn`   | Types     | Formatter signatures.                                                            |

`ts` is the strict counterpart of `t` (literal keys only); `tx` returns a `JSX.Element` and accepts `TagHandler` values keyed by tag name.

## Upgrading

See [CHANGELOG.md](./CHANGELOG.md). Behavioral changes to any documented requirement are breaking and bump the major version.

## Provenance verification

This package is published with an npm provenance attestation. Verify a downloaded version with:

```sh
npm audit signatures @jankrajewskiit/i18n
```

A passing audit attests that the published artifact was built and signed by the project's CI release pipeline against the tagged source commit.

## Release workflow

1. Bump `version` in `package.json` and add a `CHANGELOG.md` section.
2. Commit, then tag: `git tag v<semver>`.
3. Push the tag: `git push origin v<semver>`.

Pushing a `v<semver>` tag is the only trigger that publishes. For a broken release, publish a superseding patch and run `npm deprecate @jankrajewskiit/i18n@<version> "<reason>"`. Never `npm unpublish`.

## Branch protection

Default-branch protection MUST require:

- passing `verify` status check,
- passing audit status check,
- at least one approving CODEOWNERS review,
- an up-to-date branch,
- force pushes and non-administrative direct pushes disabled.
