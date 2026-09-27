# VelvetI18n

Type-safe, reactive internationalization for SolidJS applications and libraries. VelvetI18n provides one locale context, layered dictionaries, ICU MessageFormat subset rendering, rich-text tag handlers, and locale-aware `Intl` formatters.

## Install

```sh
npm install @jankrajewskiit/i18n
```

SolidJS `>=1.9.0` is a peer dependency. Configure the GitHub Packages registry for the `@jankrajewskiit` scope in `.npmrc`:

```ini
@jankrajewskiit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GHCR_TOKEN}
```

Set `GHCR_TOKEN` to a token authorized to read packages from the organization. Do not commit the token.

## Integration

Define each locale dictionary at module scope, then compose the layers once:

```tsx
import { defineDictionaries, defineDictionary, I18nProvider, useI18n } from '@jankrajewskiit/i18n';
import type { TranslationOf } from '@jankrajewskiit/i18n';

const en = defineDictionary({
  app: {
    greeting: 'Hello, {name}!',
    itemCount: '{count, plural, one {# item} other {# items}}',
    linkedText: 'Read the <link>guide</link>',
    updatedAt: 'Updated {date, date, medium}',
  },
});

const pl: TranslationOf<typeof en> = {
  app: {
    greeting: 'Cześć, {name}!',
    itemCount: '{count, plural, one {# element} few {# elementy} many {# elementów} other {# elementu}}',
    linkedText: 'Przeczytaj <link>przewodnik</link>',
    updatedAt: 'Zaktualizowano {date, date, medium}',
  },
};

const dictionaries = defineDictionaries({
  en: [en],
  pl: [pl],
});

declare module '@jankrajewskiit/i18n' {
  interface I18nDictionary extends Pick<typeof en, keyof typeof en> {}
}

const App = () => {
  const { ts, tx, formatDate } = useI18n();

  return (
    <>
      <p>{ts('app.greeting', { name: 'Ada' })}</p>
      <p>{ts('app.updatedAt', { date: new Date() })}</p>
      <p>{formatDate(new Date())}</p>
      {tx('app.linkedText', {
        link: (children) => <a href="/guide">{children}</a>,
      })}
    </>
  );
};

export const Root = () => (
  <I18nProvider dictionaries={dictionaries}>
    <App />
  </I18nProvider>
);
```

Keep dictionary definitions and `defineDictionaries()` at module scope. Each library or application must own a distinct top-level namespace when augmenting `I18nDictionary`.

## Public API

| Export                                                                                          | Purpose                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `I18nProvider`                                                                                  | Root provider for locale, dictionaries, translation, and formatting.                       |
| `I18nContext`, `useI18n`                                                                        | Context and reactive accessor; outside a provider, `useI18n` returns a safe `en` fallback. |
| `SUPPORTED_LOCALES`, `DEFAULT_FALLBACK_LOCALE`, `DEFAULT_STORAGE_KEY`, `isSupportedLocale`      | Supported locales and locale configuration constants.                                      |
| `defineDictionary`, `defineDictionaries`, `createEmptyComposedDictionaries`                     | Literal dictionary typing and locale-layer composition.                                    |
| `flatten`, `mergeFlat`, `lookup`                                                                | Dictionary transformation and own-entry lookup helpers.                                    |
| `Locale`, `LocaleDictionariesInput`, `DictionaryNode`, `FlatDictionary`, `ComposedDictionaries` | Locale and dictionary contracts.                                                           |
| `I18nDictionary`, `I18nKey`, `DotPath`, `TranslationOf`                                         | Module augmentation and dictionary type utilities.                                         |
| `I18nProviderProps`, `I18nContextValue`                                                         | Provider and context contracts.                                                            |
| `MessageParams`, `RichMessageParams`, `TagHandler`                                              | Translation parameter contracts.                                                           |
| `TranslateFn`, `TranslateStaticFn`, `TranslateRichFn`                                           | `t`, `ts`, and `tx` function contracts.                                                    |
| `FormatNumberFn`, `FormatDateFn`, `FormatRelativeTimeFn`                                        | Locale-aware formatter contracts.                                                          |

## Upgrading

See [CHANGELOG.md](CHANGELOG.md) for version history and compatibility notes. Breaking changes are released as major versions.

## Provenance verification

```sh
npm audit signatures @jankrajewskiit/i18n
```

A passing audit verifies the registry signature and provenance attestation for the installed package.

## Release workflow

Update the version and changelog, commit the change, create a matching `v<semver>` tag, then push the tag. CI verifies the package and version before publishing with provenance. For a broken release, publish a superseding patch and deprecate the affected version with `npm deprecate @jankrajewskiit/i18n@<version>`; do not unpublish it.

## Branch protection

For the default branch, require the passing verify status (including the high-severity audit), at least one approving CODEOWNERS review, and an up-to-date branch. Disable force pushes and non-administrative direct pushes.
