import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig } from 'vite';

export default defineConfig(async () =>
  createSolidLibViteConfig({
    externalizeFromPackageJson: true,
    preserveModules: false,
  }),
);
