import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    // Use forks pool with single fork for sequential execution
    // This prevents timeouts from resource contention during parallel tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
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
      // TODO: Increase thresholds incrementally as coverage improves
      thresholds: {
        statements: 1,
        branches: 15,
        functions: 5,
        lines: 1
      }
    },
    // Increased timeouts for parallel execution
    testTimeout: 30000,
    hookTimeout: 15000
  }
});

