import { createContext, useContext } from 'solid-js';

import { type I18nContextValue, STUB_I18N_CONTEXT } from './i18n-functions';

export const I18nContext = createContext<I18nContextValue>();

const useI18n = (): I18nContextValue => useContext(I18nContext) ?? STUB_I18N_CONTEXT;

export default useI18n;
