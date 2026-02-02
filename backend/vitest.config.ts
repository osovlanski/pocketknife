import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    // Setup file for global mocks
    setupFiles: ['./tests/setup.ts'],
    // Use threads pool for faster parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },
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
      // Thresholds raised per tech lead review - target 30% minimum coverage
      // NOTE: Tests may need to be written to meet these thresholds
      thresholds: {
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30
      }
    },
    // Reduced timeouts for faster feedback on unmocked calls
    testTimeout: 10000,
    hookTimeout: 5000
  }
});

