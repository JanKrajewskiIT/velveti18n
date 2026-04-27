/**
 * SolidJS i18n provider.
 *
 * Reactive Solid context exposing:
 *   - `locale()` / `setLocale(...)` signals
 *   - `t(key, params?)` – type-safe message translation
 *   - `ts(key, params?)` – strict-key variant of `t`
 *   - `tx(key, params?)` – rich-text translation returning JSX
 *   - `formatNumber(value, options?)` – locale-aware number
 *   - `formatDate(value, options?)` – locale-aware date/time
 *   - `formatRelativeTime(value, unit, options?)` – locale-aware relative time
 *
 * Dictionaries are passed in declaratively via the `dictionaries` prop
 * (typically the output of `defineDictionaries`); there is no global
 * registry and no side-effectful registration. The persistence storage
 * key is also explicit (`storageKey` prop, default `'velvet-locale'`),
 * keeping the package free of hidden global state.
 */

import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  type ParentProps,
  useContext,
} from 'solid-js';

import { type ComposedDictionaries } from './defineDictionary';
import { compileMessage, compileRichMessage, type RichNode } from './format/compiler';
import { getDateTimeFormat, getNumberFormat, getRelativeTimeFormat } from './format/intl';
import { type FlatDictionary, type Locale, type MessageParams, SUPPORTED_LOCALES, type VelvetI18nKey } from './types';

const DEFAULT_STORAGE_KEY = 'velvet-locale';

const EMPTY_DICTIONARIES: ComposedDictionaries = Object.freeze({
  en: Object.freeze({}) as FlatDictionary,
  pl: Object.freeze({}) as FlatDictionary,
});

interface ImportMetaEnvLike {
  DEV?: boolean;
  MODE?: string;
}

const isDev = (): boolean => {
  const env = (import.meta as { env?: ImportMetaEnvLike }).env;
  if (!env) return false;
  if (env.DEV !== undefined) return env.DEV;
  if (env.MODE !== undefined) return env.MODE !== 'production';
  return false;
};

const warnedKeys = new Set<string>();
const warnMissing = (locale: Locale, key: string, fallbackUsed: boolean): void => {
  if (!isDev()) return;
  const sigil = `${locale}:${key}:${fallbackUsed ? 'fb' : 'miss'}`;
  if (warnedKeys.has(sigil)) return;
  warnedKeys.add(sigil);
  // eslint-disable-next-line no-console
  console.warn(
    fallbackUsed
      ? `[velvet-i18n] Missing key "${key}" for locale "${locale}". Falling back to "en".`
      : `[velvet-i18n] Missing key "${key}" in every locale. Returning the key verbatim.`,
  );
};

const detectInitialLocale = (storageKey: string): Locale => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(storageKey);
  if (stored && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(stored)) {
    return stored as Locale;
  }
  const browser = window.navigator.language.split('-')[0];
  if (browser && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(browser)) {
    return browser as Locale;
  }
  return 'en';
};

/**
 * Strip {@link TagHandler} entries from a {@link RichMessageParams} map so the
 * remaining shape is compatible with the string-only {@link MessageParams}
 * the parser/compiler accepts. Tag handlers operate at JSX-render time, not
 * inside the AST, so they must not leak into placeholder substitution.
 */
const stringParams = (params: RichMessageParams | undefined): MessageParams | undefined => {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean | Date | null | undefined> = {};
  for (const key in params) {
    const v = params[key];
    if (typeof v === 'function') continue;
    out[key] = v;
  }
  return out;
};

/**
 * Walk a compiled {@link RichNode} tree and produce JSX. Tag children are
 * rendered first (recursively) and then handed to the caller-supplied
 * {@link TagHandler}. Tags without a matching handler render their children
 * unwrapped so the message remains visible (degraded gracefully).
 */
const renderRichToJsx = (nodes: ReadonlyArray<RichNode>, params: RichMessageParams | undefined): JSX.Element => {
  const out: JSX.Element[] = [];
  for (const node of nodes) {
    if (typeof node === 'string') {
      out.push(node);
      continue;
    }
    const children = renderRichToJsx(node.children, params);
    const handler = params?.[node.tag];
    if (typeof handler === 'function') {
      out.push(handler(children));
    } else {
      out.push(children);
    }
  }
  return out;
};

/**
 * Type-safe translation function.
 *
 * The key parameter accepts:
 *   - any path proven to exist in the augmented `VelvetI18nDictionary`
 *     (autocomplete, rename and find-references all work), and
 *   - any string literal (with `(string & {})`), so dynamic keys still type-check
 *     and the developer is responsible for runtime correctness.
 */
export type TranslateFn = (key: VelvetI18nKey | (string & {}), params?: MessageParams) => string;

/**
 * Strict translation function for **literal** i18n keys.
 *
 * Identical runtime behavior to {@link TranslateFn}, but the key parameter
 * is narrowed to the augmented `VelvetI18nDictionary` only — no
 * `(string & {})` widening — so passing an unknown literal is a type error.
 *
 * Convention (typically enforced by ESLint `no-restricted-syntax`):
 *   - `ts('common.save')` for compile-time keys.
 *   - `t(dynamicKey)` only when the key is computed at runtime.
 */
export type TranslateStaticFn = (key: VelvetI18nKey, params?: MessageParams) => string;

/**
 * A handler that wraps the children of a `<tag>...</tag>` pair into JSX.
 * Receives the resolved children (already translated, with nested tags applied)
 * and returns a JSX element that becomes that tag's rendering.
 *
 * @example
 *   tx('demo.intro', { pkg: (chunks) => <CodeText>{chunks}</CodeText> })
 *   // for message: "Built on top of <pkg>{name}</pkg> primitives."
 */
export type TagHandler = (children: JSX.Element) => JSX.Element;

/**
 * Parameters accepted by {@link TranslateRichFn}.
 *
 * Values are either:
 *   - `string | number | boolean | Date | null | undefined` — substituted into
 *     `{token}` placeholders just like {@link TranslateFn};
 *   - {@link TagHandler} — invoked for each `<token>...</token>` pair to wrap
 *     its rendered children in JSX.
 *
 * A handler key may also appear as a plain `{token}`; in that case the handler
 * is called with no children (an empty fragment) — useful for self-closing
 * style insertion (rare; prefer `<tag></tag>`).
 */
export type RichMessageParams = Readonly<
  Record<string, string | number | boolean | Date | null | undefined | TagHandler>
>;

/**
 * Rich-text translation function.
 *
 * Resolves a key whose template may contain XML-style tag pairs
 * (`<x>...</x>`) and returns a JSX element with the tags realised via the
 * caller-supplied {@link TagHandler}s. Plain `{token}` placeholders are
 * still supported and substituted as strings.
 *
 * Like {@link TranslateStaticFn}, the key parameter is narrowed to the
 * augmented `VelvetI18nDictionary` for compile-time safety.
 *
 * @example
 *   // dictionary: 'demo.intro': 'Try <link>this</link> for a {count, number} % boost.'
 *   tx('demo.intro', {
 *     count: 12,
 *     link: (chunks) => <a href="/x">{chunks}</a>,
 *   });
 */
export type TranslateRichFn = (key: VelvetI18nKey, params?: RichMessageParams) => JSX.Element;

export interface I18nContextValue {
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ts: TranslateStaticFn;
  tx: TranslateRichFn;
  formatNumber: (value: number | bigint, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) => string;
}

const I18nContext = createContext<I18nContextValue>();

export interface I18nProviderProps extends ParentProps {
  /** Composed dictionaries (output of `defineDictionaries`). Defaults to empty. */
  dictionaries?: ComposedDictionaries;
  /** localStorage key used to persist user preference. Defaults to `'velvet-locale'`. */
  storageKey?: string;
  /** Initial locale, overrides stored/browser detection. */
  initialLocale?: Locale;
}

const resolveTemplate = (active: FlatDictionary, fallback: FlatDictionary, locale: Locale, key: string): string => {
  const direct = active[key];
  if (direct !== undefined) return direct;
  const fallbackTpl = fallback[key];
  if (fallbackTpl !== undefined) {
    if (active !== fallback) warnMissing(locale, key, true);
    return fallbackTpl;
  }
  warnMissing(locale, key, false);
  return key;
};

export const I18nProvider = (props: I18nProviderProps) => {
  const storageKey = (): string => props.storageKey ?? DEFAULT_STORAGE_KEY;

  const [locale, setLocaleSignal] = createSignal<Locale>(props.initialLocale ?? detectInitialLocale(storageKey()));

  const dictionaries = createMemo<ComposedDictionaries>(() => props.dictionaries ?? EMPTY_DICTIONARIES);

  const fallback = createMemo<FlatDictionary>(() => dictionaries().en);
  const active = createMemo<FlatDictionary>(() => {
    const dict = dictionaries()[locale()] as FlatDictionary | undefined;
    return dict ?? fallback();
  });

  createEffect(
    on(
      () => props.initialLocale,
      (next) => {
        if (!next) return;
        if (!(SUPPORTED_LOCALES as ReadonlyArray<string>).includes(next)) return;
        if (locale() !== next) setLocaleSignal(next);
      },
      { defer: true },
    ),
  );

  createEffect(
    on(locale, (current) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey(), current);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', current);
      }
    }),
  );

  const t: TranslateFn = (key, params) => {
    const template = resolveTemplate(active(), fallback(), locale(), key);
    return compileMessage(template)(params, locale());
  };

  const ts: TranslateStaticFn = (key, params) => t(key, params);

  const tx: TranslateRichFn = (key, params) => {
    const template = resolveTemplate(active(), fallback(), locale(), key);
    const nodes = compileRichMessage(template)(stringParams(params), locale());
    return renderRichToJsx(nodes, params);
  };

  const formatNumber: I18nContextValue['formatNumber'] = (value, options) =>
    getNumberFormat(locale(), options).format(value);

  const formatDate: I18nContextValue['formatDate'] = (value, options) =>
    getDateTimeFormat(locale(), options ?? { dateStyle: 'medium' }).format(
      value instanceof Date ? value : new Date(value),
    );

  const formatRelativeTime: I18nContextValue['formatRelativeTime'] = (value, unit, options) =>
    getRelativeTimeFormat(locale(), options).format(value, unit);

  const value: I18nContextValue = {
    locale,
    setLocale: setLocaleSignal,
    t,
    ts,
    tx,
    formatNumber,
    formatDate,
    formatRelativeTime,
  };

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};

/**
 * Access the active i18n context.
 *
 * Outside of an `<I18nProvider>` returns a degraded implementation that
 * compiles the requested key verbatim (no dictionary lookup), so primitive
 * components remain renderable in tests and isolated scenarios.
 */
export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (context) return context;

  const fallbackLocale: Accessor<Locale> = () => 'en';

  const fallbackT: TranslateFn = (key, params) => compileMessage(key)(params, 'en');

  return {
    locale: fallbackLocale,
    setLocale: () => undefined,
    t: fallbackT,
    ts: (key, params) => fallbackT(key, params),
    tx: (key, params) => {
      const nodes = compileRichMessage(key)(stringParams(params), 'en');
      return renderRichToJsx(nodes, params);
    },
    formatNumber: (value, options) => getNumberFormat('en', options).format(value),
    formatDate: (value, options) =>
      getDateTimeFormat('en', options ?? { dateStyle: 'medium' }).format(
        value instanceof Date ? value : new Date(value),
      ),
    formatRelativeTime: (value, unit, options) => getRelativeTimeFormat('en', options).format(value, unit),
  };
};
