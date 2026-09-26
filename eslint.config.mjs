import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser'],
  extraConfigs: [
    {
      files: ['src/types.ts'],
      rules: { '@typescript-eslint/no-empty-object-type': 'off' },
    },
  ],
});
