import { useContext } from 'solid-js';

import { degradedI18n } from './degradedI18n';
import { I18nContext } from './I18nContext';
import type { I18nContextValue } from './types';

export const useI18n = (): I18nContextValue => useContext(I18nContext) ?? degradedI18n;
