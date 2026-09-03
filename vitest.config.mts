import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'core/src'),
      '@adapters': resolve(__dirname, 'adapters/src'),
      '@app': resolve(__dirname, 'app/src'),
      '@contracts': resolve(__dirname, 'contracts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration tests share one Postgres cell; run them in one process.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
