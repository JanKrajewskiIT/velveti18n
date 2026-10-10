import { buildAllowEmptyInterfaceConfig, createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser'],
  extraConfigs: [buildAllowEmptyInterfaceConfig(['src/I18nDictionary.ts'])],
});
