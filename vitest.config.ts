import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests sit next to the code they cover. Playwright owns tests/**, and
// its *.spec.ts files would fail under vitest with a confusing import error,
// so the include list is explicit rather than the default glob.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**', '.next/**', '.cache/**'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
