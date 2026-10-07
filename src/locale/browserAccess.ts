const attempt = <T>(operation: () => T): T | undefined => {
  try {
    return operation();
  } catch {
    return undefined;
  }
};

export const readStoredLocaleValue = (storageKey: string): string | undefined =>
  attempt(() => window.localStorage.getItem(storageKey) ?? undefined);

export const readNavigatorLanguage = (): string | undefined => attempt(() => window.navigator.language);

export const writeStoredLocaleValue = (storageKey: string, value: string): void => {
  attempt(() => {
    window.localStorage.setItem(storageKey, value);
  });
};

export const setDocumentLanguage = (language: string): void => {
  attempt(() => {
    window.document.documentElement.lang = language;
  });
};
