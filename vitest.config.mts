import { defineConfig } from 'vitest/config';

/**
 * NO PATH ALIASES, DELIBERATELY.
 *
 * Story 1.0 originally used `@core/*`, `@app/*`, `@adapters/*` tsconfig paths.
 * Those are COMPILE-TIME ONLY - `tsc` does not rewrite them - so `node dist/...`
 * failed with MODULE_NOT_FOUND while every test passed, because vitest resolved
 * the aliases itself. The built artifact had never been executed.
 *
 * Found by running the API container. Fixed by using relative imports everywhere,
 * so tests resolve modules exactly the way Node will at runtime. Layer boundaries
 * are enforced by dependency-cruiser, not by import style, so nothing was lost.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
