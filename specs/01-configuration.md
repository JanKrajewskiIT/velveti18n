# Spec 01 — Configuration

## Step 1 — Provider configuration record

The provider accepts a configuration record passed as props (suggested type name: `I18nProviderProps`). All fields are optional; the provider MUST function with an empty props object.

| Field                 | Required | Default                  | Purpose                                                                                                                                                          |
| --------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composed dictionaries | no       | empty per-locale records | The `ComposedDictionaries` value produced by `defineDictionaries()`. When absent, all key lookups return the key string itself.                                  |
| Storage key           | no       | `"velvet-locale"`        | The `localStorage` key under which the user's locale preference is persisted. See [02-locale-detection-and-persistence](02-locale-detection-and-persistence.md). |
| Initial locale        | no       | detected                 | Overrides the detection sequence and sets the active locale directly. Reactive: updating this prop updates the active locale signal.                             |
| Fallback locale       | no       | `"en"`                   | The locale consulted when a key is absent from the active locale's dictionary. MUST be a member of `SUPPORTED_LOCALES`.                                          |

The provider MUST accept children via the standard SolidJS `ParentProps` mechanism and render them inside the established context.

## Step 2 — Default resolution

When the composed dictionaries prop is absent or undefined, the provider MUST behave as if empty dictionaries were supplied for every supported locale. Key lookups against an empty dictionary MUST return the key string itself (passthrough behavior).

When the fallback locale prop is absent or undefined, the resolved fallback locale MUST equal `"en"`. When a supplied fallback locale value is not a member of `SUPPORTED_LOCALES`, the provider MUST warn once in development and treat the fallback as `"en"`.

When the storage key prop is absent or undefined, the resolved storage key MUST equal the documented default constant. The default constant MUST be exported from the public surface so consumers can reference it without re-implementing the defaulting logic.

## Step 3 — Provider mount behavior

On mount, the provider MUST:

1. Resolve the initial active locale using the detection sequence described in [02-locale-detection-and-persistence](02-locale-detection-and-persistence.md), unless a valid `initialLocale` is supplied, in which case that value is used directly without consulting storage or navigator.
2. Create a reactive locale signal initialized to the resolved locale.
3. Derive memoized accessors for the active locale's flat dictionary and the fallback locale's flat dictionary from the `composedDictionaries` prop.
4. Register a reactive effect that persists the locale to storage and updates `document.documentElement.lang` whenever the locale signal changes. See [02-locale-detection-and-persistence](02-locale-detection-and-persistence.md).
5. Register a reactive effect that watches the `initialLocale` prop. When the prop changes to a new valid locale value, the active locale signal MUST be updated to match.
6. Provide the `I18nContextValue` to all descendants via a SolidJS context.

The provider MUST NOT perform any network requests, dynamic imports, or asynchronous operations during or after mount.

## Step 4 — Context value shape

The provider supplies a context value (suggested type name: `I18nContextValue`) with the following fields:

| Field                | Type                       | Description                                                                                                                                   |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`             | `Accessor<Locale>`         | Reactive accessor for the currently active locale. Re-renders subscribers when the locale changes.                                            |
| `setLocale`          | `(locale: Locale) => void` | Updates the active locale signal. MUST validate the supplied value against `SUPPORTED_LOCALES`; warns and no-ops if invalid.                  |
| `t`                  | `TranslateFn`              | General-purpose translation. See [06-translation-functions](06-translation-functions.md).                                                     |
| `ts`                 | `TranslateStaticFn`        | Strict literal-key translation. See [06-translation-functions](06-translation-functions.md).                                                  |
| `tx`                 | `TranslateRichFn`          | Rich-text translation with JSX tag handlers. See [05-rich-text](05-rich-text.md) and [06-translation-functions](06-translation-functions.md). |
| `formatNumber`       | `FormatNumberFn`           | Locale-aware number formatting. See [07-intl-formatting](07-intl-formatting.md).                                                              |
| `formatDate`         | `FormatDateFn`             | Locale-aware date/time formatting. See [07-intl-formatting](07-intl-formatting.md).                                                           |
| `formatRelativeTime` | `FormatRelativeTimeFn`     | Locale-aware relative time formatting. See [07-intl-formatting](07-intl-formatting.md).                                                       |

All translation and formatting functions on the context MUST be reactive: they MUST re-execute (and trigger any SolidJS subscriber tracking them) when the active locale changes. Implementations that close over the reactive locale signal satisfy this requirement automatically.
