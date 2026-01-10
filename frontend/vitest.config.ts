import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/main.tsx',
        'src/test/**',
        'node_modules/**'
      ],
      // Thresholds set to current coverage levels + buffer
      // These should be gradually increased as more tests are added
      // TODO: Increase thresholds incrementally as coverage improves
      thresholds: {
        statements: 0.5,
        branches: 25,
        functions: 10,
        lines: 0.5
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});

