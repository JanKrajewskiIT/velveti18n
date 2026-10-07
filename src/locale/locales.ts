export const SUPPORTED_LOCALES = ['en', 'pl'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);

export const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && supportedLocaleSet.has(value);

export const createLocaleRecord = <T>(create: (locale: Locale) => T): Readonly<Record<Locale, T>> =>
  // Object.fromEntries widens keys to string; SUPPORTED_LOCALES guarantees every Locale is present.
  Object.freeze(
    Object.fromEntries(SUPPORTED_LOCALES.map((locale): [Locale, T] => [locale, create(locale)])),
  ) as Readonly<Record<Locale, T>>;
