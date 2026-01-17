/**
 * Logger Utility Tests
 * 
 * Tests the logging utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger object', () => {
    it('should have standard logging methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.info).toBe('function');
      expect(typeof logger.default.error).toBe('function');
      expect(typeof logger.default.warn).toBe('function');
      expect(typeof logger.default.debug).toBe('function');
    });

    it('should not throw when logging', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.info('Test info message');
        logger.default.warn('Test warning message');
        logger.default.error('Test error message');
        logger.default.debug('Test debug message');
      }).not.toThrow();
    });
  });
});





