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
      // Thresholds set to current coverage levels
      // These should be gradually increased as more tests are added
      thresholds: {
        statements: 0.4,
        branches: 24,
        functions: 10,
        lines: 0.4
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});

