const metaEnvironment = import.meta as unknown as {
  readonly env?: { readonly DEV?: boolean };
};
const browserGlobals = globalThis as unknown as {
  readonly localStorage?: Pick<Storage, 'getItem' | 'setItem'>;
  readonly navigator?: Pick<Navigator, 'language'>;
  readonly document?: {
    readonly documentElement?: { lang: string } | null;
  } | null;
};
const development = metaEnvironment.env?.DEV ?? false;
const warnedKeys = new Set<string>();

export const warnOnce = (key: string, message: string): void => {
  if (!development || warnedKeys.has(key)) {
    return;
  }

  warnedKeys.add(key);
  console.warn(message);
};

export const detectLocale = (storageKey: string): 'en' | 'pl' => {
  try {
    const storedLocale = browserGlobals.localStorage?.getItem(storageKey);
    if (storedLocale === 'en' || storedLocale === 'pl') {
      return storedLocale;
    }
  } catch {
    // Storage can be unavailable or throw in restricted browser contexts.
  }

  try {
    const language = browserGlobals.navigator?.language.split('-', 1)[0];
    if (language === 'en' || language === 'pl') {
      return language;
    }
  } catch {
    // Navigator access can be unavailable in non-browser environments.
  }

  return 'en';
};

export const persistLocale = (storageKey: string, locale: string): void => {
  try {
    browserGlobals.localStorage?.setItem(storageKey, locale);
  } catch {
    return;
  }
};

export const setDocumentLanguage = (locale: string): void => {
  try {
    const documentElement = browserGlobals.document?.documentElement;
    if (documentElement) {
      documentElement.lang = locale;
    }
  } catch {
    return;
  }
};
