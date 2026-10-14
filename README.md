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

Peer dependency: `solid-js` `>=1.9.0 <2`. Node 26 and npm 12.2.0 are required for repository tooling; the browser library does not impose that Node version on consumers.

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

The release workflow signs the verified archive and its dependency SBOM with Cosign. Download the `package-signatures` artifact and verify the bundle against the expected release workflow identity. npm registry signatures are a separate mechanism; where supported, inspect the dependency tree with:

```sh
npm audit signatures18n
```

Registry signature and provenance support must be confirmed during publication; the workflow configuration does not itself establish those guarantees.

## Release workflow

1. Confirm the default branch is green and `CHANGELOG.md` has a section for the new version.
2. `npm version patch|minor|major` and commit the changelog edit with the bump.
3. `git push --follow-tags`.

The `v<semver>` tag verifies and packs once, checks the archive against the release version, then publishes the verified archive. Provenance is requested by default; failures do not automatically fall back to an unsigned publication.

Recover from a broken release by publishing a superseding patch and running `npm deprecate @jankrajewskiit/i18n@<broken-version> "<reason>"`. Never unpublish a version consumers may have installed.

## Branch protection

Protect the default branch with:

- a required, passing `verify` status check that includes the `npm audit` step;
- at least one approving CODEOWNERS review;
- a branch that is up to date before merging;
- force pushes and non-administrative direct pushes disabled.

## Toolchain compatibility

Builds use TypeScript 7 (`@typescript/native`, providing `tsc`). TypeScript 6 stays under the `typescript` alias for tools importing its JavaScript API (`tsc6` is its separate binary). ESLint 10 is selected by a root `eslint: "$eslint"` override because the accessibility plugin still declares peers only through ESLint 9; Configs adapts legacy rule APIs. Install the Configs release required by this manifest before running the updated presets.

## Shared configuration

Use Node 26 and the exact npm version from `packageManager`. Open `frontend.code-workspace` for TypeScript 7 and the shared formatter/linter setup. `verify` checks editor drift and enforces zero lint warnings. `audit:deps` is a separate networked dependency audit used by CI.

Published declarations are checked with `NodeNext` and `skipLibCheck: false`; package checks no longer ignore internal resolution errors. Vite libraries publish `.mjs` and `.d.mts`, while Reactive retains its valid TypeScript `NodeNext` `.js`/`.d.ts` output. Public package import paths stay the same.

See the [Configs release migration](https://github.com/JanKrajewskiIT/velvetconfigs/blob/v3.5.0/README.md#release-migration) for publication order, artifact-based workflows, the audit exception deadline and registry secrets. Refresh lockfiles and run `npm run verify` against the refreshed installation before publication.

## Security pipeline

Source verification includes Gitleaks, Semgrep, actionlint, zizmor and Trivy configuration scanning. npm audit blocks high/critical advisories under the shared expiring-exception policy. Verification produces a CycloneDX dependency SBOM. Weekly/manual security workflows re-check dependency databases and source history without building the application.

Knip is available through `npm run deps:check` (JSON report) and `npm run deps:strict` (blocking unused-code check). CI records the report while the initial findings are reviewed; security scans remain blocking. Public library entry exports are preserved.

Configure `CONFIGS_READ_TOKEN` for private Configs source access alongside the existing npm read token. See [shared security controls](https://github.com/JanKrajewskiIT/velvetconfigs/blob/v3.5.0/security/README.md) for required GitHub settings, reports, image signing, staging variables, WAF activation and manual acceptance checks.

## Code quality

The shared Configs policy runs architecture, duplication and strict unused-code checks through `npm run quality:check` in `verify`. See [quality controls and rollout](https://github.com/JanKrajewskiIT/velvetconfigs/blob/main/quality/README.md) for commands, reports and CodeQL activation. No tests or coverage gate are added.
