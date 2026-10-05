import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node22',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: { external: ['node:path'] },
  },
});
