import { warnDevOnce } from '../dev';
import type { Locale } from '../types';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const cacheKey = (locale: string, options?: object): string =>
  options ? `${locale}|${JSON.stringify(options)}` : locale;

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

export function coerceDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  warnDevOnce('[velvet-i18n] Invalid date value received. Falling back to Unix epoch.');
  return new Date(0);
}

export function resolveNumberStyle(style?: string): Intl.NumberFormatOptions | undefined {
  if (!style) return undefined;
  switch (style) {
    case 'percent':
      return { style: 'percent' };
    case 'currency':
      warnDevOnce(
        '[velvet-i18n] `{value, number, currency}` defaults to USD. Prefer pre-formatting or `formatNumber(value, { style: "currency", currency: "..." })`.',
      );
      return { style: 'currency', currency: 'USD' };
    case 'integer':
      return { maximumFractionDigits: 0 };
    default:
      return undefined;
  }
}

export function resolveDateTimeStyle(kind: 'date' | 'time', style?: string): Intl.DateTimeFormatOptions | undefined {
  if (!style) return kind === 'date' ? { dateStyle: 'medium' } : { timeStyle: 'short' };
  if (style === 'short' || style === 'medium' || style === 'long' || style === 'full') {
    return kind === 'date' ? { dateStyle: style } : { timeStyle: style };
  }
  return undefined;
}
