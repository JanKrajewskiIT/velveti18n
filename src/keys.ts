import type { I18nDictionary } from './I18nDictionary';

type DotPathOf<T, Seen> = T extends Seen
  ? never
  : T extends object
    ? {
        [Key in keyof T & string]: T[Key] extends string
          ? Key
          : T[Key] extends object
            ? `${Key}.${DotPathOf<T[Key], Seen | T>}`
            : never;
      }[keyof T & string]
    : never;

export type DotPath<T> = DotPathOf<T, never>;

export type TranslationOf<T> = {
  [Key in keyof T]: T[Key] extends string ? string : TranslationOf<T[Key]>;
};

export type I18nKey = keyof I18nDictionary extends never ? string : DotPath<I18nDictionary>;
