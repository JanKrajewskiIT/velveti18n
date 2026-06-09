export const SUPPORTED_LOCALES = ['en', 'pl'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_FALLBACK_LOCALE: Locale = 'en';

export const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
