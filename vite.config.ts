import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig } from 'vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(
    {},
    {
      fileName: 'i18n',
      externalizeFromPackageJson: true,
      preserveModules: false,
    },
  ),
);
