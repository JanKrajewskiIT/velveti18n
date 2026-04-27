/**
 * Cached `Intl.*` factory functions.
 *
 * Every formatter is memoized by `(locale, optionsKey)`. Constructing
 * `Intl.NumberFormat` / `Intl.DateTimeFormat` is non-trivial; messages
 * compiled from large dictionaries call the formatters per-render so the
 * cache eliminates the overhead.
 */

import type { Locale } from '../types';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const cacheKey = (locale: string, opts?: object): string => (opts ? `${locale}|${JSON.stringify(opts)}` : locale);

export function getNumberFormat(locale: Locale, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = cacheKey(locale, options);
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

export function getDateTimeFormat(locale: Locale, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = cacheKey(locale, options);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function getPluralRules(locale: Locale, options?: Intl.PluralRulesOptions): Intl.PluralRules {
  const key = cacheKey(locale, options);
  let rules = pluralRules.get(key);
  if (!rules) {
    rules = new Intl.PluralRules(locale, options);
    pluralRules.set(key, rules);
  }
  return rules;
}

export function getRelativeTimeFormat(
  locale: Locale,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  const key = cacheKey(locale, options);
  let formatter = relativeTimeFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, options);
    relativeTimeFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Map MessageFormat number style tokens to `Intl.NumberFormatOptions`.
 *
 * Currency style intentionally falls back to USD when the message does
 * not provide a `currency` argument; consumers may always pre-format the
 * value or pass options through `formatNumber` directly.
 */
export function resolveNumberStyle(style?: string): Intl.NumberFormatOptions | undefined {
  if (!style) return undefined;
  switch (style) {
    case 'percent':
      return { style: 'percent' };
    case 'currency':
      return { style: 'currency', currency: 'USD' };
    case 'integer':
      return { maximumFractionDigits: 0 };
    default:
      return undefined;
  }
}

/**
 * Map MessageFormat date/time style tokens to `Intl.DateTimeFormatOptions`.
 * `short`/`medium`/`long`/`full` correspond to the standard ICU presets.
 */
export function resolveDateTimeStyle(kind: 'date' | 'time', style?: string): Intl.DateTimeFormatOptions | undefined {
  if (!style) return kind === 'date' ? { dateStyle: 'medium' } : { timeStyle: 'short' };
  if (style === 'short' || style === 'medium' || style === 'long' || style === 'full') {
    return kind === 'date' ? { dateStyle: style } : { timeStyle: style };
  }
  return undefined;
}
