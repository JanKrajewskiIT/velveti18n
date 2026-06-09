import { warnOnce } from './internal/env';

const numberFormatPool = new Map<string, Intl.NumberFormat>();
const dateFormatPool = new Map<string, Intl.DateTimeFormat>();
const pluralRulesPool = new Map<string, Intl.PluralRules>();
const relativeTimeFormatPool = new Map<string, Intl.RelativeTimeFormat>();

const poolKey = (locale: string, options?: object): string =>
  options ? `${locale}|${JSON.stringify(options)}` : locale;

export const getNumberFormat = (locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = poolKey(locale, options);
  let instance = numberFormatPool.get(key);
  if (!instance) {
    instance = new Intl.NumberFormat(locale, options);
    numberFormatPool.set(key, instance);
  }
  return instance;
};

export const getDateTimeFormat = (locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = poolKey(locale, options);
  let instance = dateFormatPool.get(key);
  if (!instance) {
    instance = new Intl.DateTimeFormat(locale, options);
    dateFormatPool.set(key, instance);
  }
  return instance;
};

export const getPluralRules = (locale: string, options?: Intl.PluralRulesOptions): Intl.PluralRules => {
  const key = poolKey(locale, options);
  let instance = pluralRulesPool.get(key);
  if (!instance) {
    instance = new Intl.PluralRules(locale, options);
    pluralRulesPool.set(key, instance);
  }
  return instance;
};

export const getRelativeTimeFormat = (
  locale: string,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat => {
  const key = poolKey(locale, options);
  let instance = relativeTimeFormatPool.get(key);
  if (!instance) {
    instance = new Intl.RelativeTimeFormat(locale, options);
    relativeTimeFormatPool.set(key, instance);
  }
  return instance;
};

export const coerceDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') return new Date(value);
  warnOnce('coerce-date', '[i18n] Date formatting received a non-date value; using Unix epoch.');
  return new Date(0);
};

const DATE_STYLES = new Set(['short', 'medium', 'long', 'full']);

export const formatMessageNumber = (value: unknown, style: string | undefined, locale: string): string => {
  const numeric = typeof value === 'bigint' ? value : Number(value);
  let options: Intl.NumberFormatOptions | undefined;
  switch (style) {
    case 'percent':
      options = { style: 'percent' };
      break;
    case 'currency':
      warnOnce(
        'message-currency-style',
        '[i18n] The "currency" message style defaults to USD; use formatNumber with explicit currency options instead.',
      );
      options = { style: 'currency', currency: 'USD' };
      break;
    case 'integer':
      options = { maximumFractionDigits: 0 };
      break;
    default:
      options = undefined;
  }
  return getNumberFormat(locale, options).format(numeric);
};

export const formatMessageDate = (
  value: unknown,
  kind: 'date' | 'time',
  style: string | undefined,
  locale: string,
): string => {
  const resolved = style && DATE_STYLES.has(style) ? style : undefined;
  const options: Intl.DateTimeFormatOptions =
    kind === 'date'
      ? { dateStyle: (resolved ?? 'medium') as Intl.DateTimeFormatOptions['dateStyle'] }
      : { timeStyle: (resolved ?? 'short') as Intl.DateTimeFormatOptions['timeStyle'] };
  return getDateTimeFormat(locale, options).format(coerceDate(value));
};

export const formatPoundNumber = (value: number, locale: string): string => getNumberFormat(locale).format(value);
