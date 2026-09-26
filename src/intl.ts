import { warnOnce } from './env.js';

export const coerceDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value);
  }

  warnOnce('invalid-date-value', 'A non-date value was formatted as the Unix epoch.');
  return new Date(0);
};

export const formatNumberForLocale = (
  locale: string,
  value: number | bigint,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(locale, options).format(value);

export const formatDateForLocale = (locale: string, value: unknown, options?: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium' }).format(coerceDate(value));

export const formatRelativeTimeForLocale = (
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
): string => new Intl.RelativeTimeFormat(locale, options).format(value, unit);
