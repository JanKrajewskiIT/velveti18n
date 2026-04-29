import type { Locale } from '../types';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const warnedMessages = new Set<string>();

const cacheKey = (locale: string, opts?: object): string => (opts ? `${locale}|${JSON.stringify(opts)}` : locale);

const isDev = (): boolean => {
  const env = (import.meta as { env?: { DEV?: boolean; MODE?: string } }).env;
  if (!env) return false;
  if (env.DEV !== undefined) return env.DEV;
  if (env.MODE !== undefined) return env.MODE !== 'production';
  return false;
};

const warnOnce = (message: string): void => {
  if (!isDev()) return;
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

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

export function resolveNumberStyle(style?: string): Intl.NumberFormatOptions | undefined {
  if (!style) return undefined;
  switch (style) {
    case 'percent':
      return { style: 'percent' };
    case 'currency':
      warnOnce(
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
