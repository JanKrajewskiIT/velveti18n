import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig } from 'vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(
    {},
    {
      fileName: 'velvet-i18n',
      externalPackages: ['solid-js'],
      dts: { tsconfigPath: './tsconfig.app.json' },
    },
  ),
);
