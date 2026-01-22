/**
 * Global Test Setup
 * 
 * This file is automatically loaded before all tests.
 * It sets global timeouts and provides cleanup hooks.
 * 
 * Note: Individual test files should define their own mocks
 * using vi.mock() at the top level for proper control.
 * This setup file only provides minimal global configuration.
 */

import { vi, afterEach } from 'vitest';

// Set shorter default timeout for faster test failures
// Individual tests can override this if needed
vi.setConfig({ testTimeout: 10000 });

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
