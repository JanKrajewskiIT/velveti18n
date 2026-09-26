import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig } from 'vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(
    {},
    {
      fileName: 'index',
      formats: ['es'],
      externalizeFromPackageJson: true,
      preserveModules: false,
      dts: { rollupTypes: true },
    },
  ),
);
