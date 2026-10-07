import type { Accessor, JSX } from 'solid-js';

import { toDate } from './intl/dateValue';
import { getDateTimeFormat, getNumberFormat, getRelativeTimeFormat } from './intl/formatters';
import type { Locale } from './locale/locales';
import type { MessageParams, RichMessageParams } from './message/params';
import { formatMessage, formatRichMessage } from './message/render';
import type { I18nContextValue } from './types';

export interface I18nFunctionSources {
  readonly locale: Accessor<Locale>;
  readonly lookupTemplate: (key: string) => string | undefined;
}

const NO_PARAMS: MessageParams = Object.freeze({});

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

export const createI18nFunctions = ({
  locale,
  lookupTemplate,
}: I18nFunctionSources): Omit<I18nContextValue, 'locale' | 'setLocale'> => {
  const translate = (key: string, params: MessageParams = NO_PARAMS): string => {
    const template = lookupTemplate(key);
    return template === undefined ? key : formatMessage(template, locale(), params);
  };

  const translateRich = (key: string, params: RichMessageParams = NO_PARAMS): JSX.Element => {
    const template = lookupTemplate(key);
    return template === undefined ? key : formatRichMessage(template, locale(), params);
  };

  return {
    t: translate,
    ts: translate,
    tx: translateRich,
    formatNumber: (value, options) => getNumberFormat(locale(), options).format(value),
    formatDate: (value, options) => getDateTimeFormat(locale(), options ?? DEFAULT_DATE_OPTIONS).format(toDate(value)),
    formatRelativeTime: (value, unit, options) => getRelativeTimeFormat(locale(), options).format(value, unit),
  };
};
