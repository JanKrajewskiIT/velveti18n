import type { I18nDictionary } from './I18nDictionary';

export type DotPath<T> = {
  [Key in keyof T & string]: T[Key] extends string ? Key : T[Key] extends object ? `${Key}.${DotPath<T[Key]>}` : never;
}[keyof T & string];

export type TranslationOf<T> = {
  [Key in keyof T]: T[Key] extends string ? string : TranslationOf<T[Key]>;
};

export type I18nKey = keyof I18nDictionary extends never ? string : DotPath<I18nDictionary>;
