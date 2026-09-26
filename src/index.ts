export {
  createEmptyComposedDictionaries,
  defineDictionaries,
  defineDictionary,
  flatten,
  lookup,
  mergeFlat,
} from './dictionary.js';
export { I18nContext, useI18n } from './I18nContext.js';
export { I18nProvider } from './I18nProvider.js';
export { DEFAULT_FALLBACK_LOCALE, DEFAULT_STORAGE_KEY, isSupportedLocale, SUPPORTED_LOCALES } from './locales.js';
export type {
  ComposedDictionaries,
  DictionaryNode,
  DotPath,
  FlatDictionary,
  FormatDateFn,
  FormatNumberFn,
  FormatRelativeTimeFn,
  I18nContextValue,
  I18nDictionary,
  I18nKey,
  I18nProviderProps,
  Locale,
  LocaleDictionariesInput,
  MessageParams,
  RichMessageParams,
  TagHandler,
  TranslateFn,
  TranslateRichFn,
  TranslateStaticFn,
  TranslationOf,
} from './types.js';
