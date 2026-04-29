export type Locale = 'en' | 'pl';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'pl'] as const;

export interface DictionaryNode {
  readonly [key: string]: string | DictionaryNode;
}

export type FlatDictionary = Readonly<Record<string, string>>;

export type DotPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${DotPath<T[K]>}`
          : never;
    }[keyof T & string];

export type VelvetI18nDictionary = Record<never, never>;

export type VelvetI18nKey = [keyof VelvetI18nDictionary] extends [never] ? string : DotPath<VelvetI18nDictionary>;

export type MessageParams = Readonly<Record<string, string | number | boolean | Date | null | undefined>>;

export type TranslationOf<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends DictionaryNode ? TranslationOf<T[K]> : never;
};
