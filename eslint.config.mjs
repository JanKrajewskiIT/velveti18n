import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser'],
  extraConfigs: [
    {
      name: 'i18n/augmentable-dictionary',
      files: ['src/I18nDictionary.ts'],
      rules: { '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }] },
    },
  ],
});
