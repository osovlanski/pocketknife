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
      // Thresholds set to current coverage levels + buffer
      // These should be gradually increased as more tests are added
      thresholds: {
        statements: 1,
        branches: 15,
        functions: 5,
        lines: 1
      }
    },
    // Reduced timeouts for faster feedback on unmocked calls
    testTimeout: 10000,
    hookTimeout: 5000
  }
});

