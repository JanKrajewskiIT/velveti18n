# Spec 02 — Locale Detection and Persistence

## Step 1 — Detection sequence

When the provider mounts without an explicit `initialLocale` prop, the library MUST determine the initial active locale by evaluating the following sources in priority order, stopping at the first successful result:

| Priority | Source               | Resolution rule                                                                                                                                      |
| -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `localStorage`       | Read the value at the configured storage key. If the value is a non-empty string and a member of `SUPPORTED_LOCALES`, use it.                        |
| 2        | `navigator.language` | Read `navigator.language`. Extract the primary language subtag (the segment before the first `-`). If it is a member of `SUPPORTED_LOCALES`, use it. |
| 3        | Hard-coded fallback  | Use `"en"`.                                                                                                                                          |

The detection function MUST be callable safely in non-browser environments. Any access to `window`, `localStorage`, `navigator`, or `document` MUST be wrapped so that an absent or inaccessible global does not throw. When a step throws, the library MUST catch the error, skip that step, and continue to the next.

## Step 2 — Locale persistence

Whenever the active locale changes (both on initial mount and on subsequent `setLocale` calls), the library MUST attempt to persist the new locale value by writing it to `localStorage` at the configured storage key.

Persistence MUST be a best-effort operation:

- If `localStorage` is unavailable (non-browser environment, private-browsing restriction, storage quota exceeded), the write MUST be silently swallowed; no exception MUST propagate to the caller.
- The write MUST use the resolved storage key from [01-configuration](01-configuration.md), not a hard-coded string.

## Step 3 — Document language attribute

Whenever the active locale changes, the library MUST attempt to set `document.documentElement.lang` to the new locale string. This attribute enables screen readers and browser spell-check to select the correct language profile.

The assignment MUST be a best-effort operation: when `document` or `document.documentElement` is unavailable, the assignment MUST be silently skipped.

## Step 4 — External locale override

The `initialLocale` prop on the provider is reactive. When the consumer updates the value of `initialLocale` after mount, the active locale signal MUST be updated to the new value, provided it is a member of `SUPPORTED_LOCALES`. An invalid new value MUST be ignored with a development-only warning; the previously active locale MUST remain unchanged.

This mechanism allows a consumer to drive the active locale from an external signal (e.g., a user-profile preference loaded asynchronously) without unmounting and remounting the provider.

## Step 5 — Supported locales

The library MUST export:

- A type alias `Locale` equal to `'en' | 'pl'`.
- A readonly array constant `SUPPORTED_LOCALES` equal to `['en', 'pl']` in that stable order.

`SUPPORTED_LOCALES` is the single authoritative source used by the detection sequence (Step 1), `setLocale` validation ([01-configuration](01-configuration.md) Step 4), fallback locale validation ([01-configuration](01-configuration.md) Step 2), and the type system ([08-type-safety](08-type-safety.md)).

Adding a new supported locale constitutes a minor change. Removing a supported locale constitutes a breaking change.
