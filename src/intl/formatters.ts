import { createBoundedCache } from '../internal/boundedCache';
import type { Locale } from '../locale/locales';

const FORMATTER_CACHE_LIMIT = 100;

const numberFormats = createBoundedCache<string, Intl.NumberFormat>(FORMATTER_CACHE_LIMIT);
const dateTimeFormats = createBoundedCache<string, Intl.DateTimeFormat>(FORMATTER_CACHE_LIMIT);
const relativeTimeFormats = createBoundedCache<string, Intl.RelativeTimeFormat>(FORMATTER_CACHE_LIMIT);
const pluralRules = createBoundedCache<string, Intl.PluralRules>(FORMATTER_CACHE_LIMIT);

const cacheKey = (locale: Locale, options: object | undefined): string =>
  options === undefined ? locale : `${locale}|${JSON.stringify(options)}`;

export const getNumberFormat = (locale: Locale, options?: Intl.NumberFormatOptions): Intl.NumberFormat =>
  numberFormats.getOrCreate(cacheKey(locale, options), () => new Intl.NumberFormat(locale, options));

export const getDateTimeFormat = (locale: Locale, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  dateTimeFormats.getOrCreate(cacheKey(locale, options), () => new Intl.DateTimeFormat(locale, options));

export const getRelativeTimeFormat = (
  locale: Locale,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat =>
  relativeTimeFormats.getOrCreate(cacheKey(locale, options), () => new Intl.RelativeTimeFormat(locale, options));

export const getPluralRules = (locale: Locale): Intl.PluralRules =>
  pluralRules.getOrCreate(locale, () => new Intl.PluralRules(locale));
