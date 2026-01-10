import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/scripts/**',
        'node_modules/**'
      ],
      // Thresholds set to current coverage levels + buffer
      // These should be gradually increased as more tests are added
      // TODO: Increase thresholds incrementally as coverage improves
      thresholds: {
        statements: 1,
        branches: 15,
        functions: 5,
        lines: 1
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});

