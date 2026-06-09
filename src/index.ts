export {
  createEmptyComposedDictionaries,
  defineDictionaries,
  defineDictionary,
  flatten,
  lookup,
  mergeFlat,
} from './dictionary';
export type { LocaleDictionariesInput } from './dictionary';

export { DEFAULT_STORAGE_KEY } from './detection';

export { default as I18nProvider } from './I18nProvider';
export type { I18nProviderProps } from './I18nProvider';

export { default as useI18n } from './I18nContext';
export { I18nContext } from './I18nContext';

export type {
  FormatDateFn,
  FormatNumberFn,
  FormatRelativeTimeFn,
  I18nContextValue,
  TranslateFn,
  TranslateRichFn,
  TranslateStaticFn,
} from './i18n-functions';

export { DEFAULT_FALLBACK_LOCALE, SUPPORTED_LOCALES, isSupportedLocale } from './locales';
export type { Locale } from './locales';

export type { MessageParams, RichMessageParams, TagHandler } from './params';

export type {
  ComposedDictionaries,
  DictionaryNode,
  DotPath,
  FlatDictionary,
  I18nDictionary,
  I18nKey,
  TranslationOf,
} from './types';
