import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

const baseConfig = createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  browser: true,
});

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
    },
  },
];
