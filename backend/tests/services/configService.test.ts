/**
 * Config Service Tests
 * 
 * Tests the configuration management service public API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ConfigService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseValue', () => {
    it('should parse boolean strings correctly', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('true', false)).toBe(true);
      expect(configService.parseValue('false', true)).toBe(false);
    });

    it('should parse numeric strings correctly', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('123', 0)).toBe(123);
      expect(configService.parseValue('3.14', 0)).toBe(3.14);
      expect(configService.parseValue('-42', 0)).toBe(-42);
    });

    it('should return string for non-numeric, non-boolean values', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('hello', '')).toBe('hello');
      expect(configService.parseValue('test-value', '')).toBe('test-value');
    });
  });

  describe('get', () => {
    it('should return a value for known config keys', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // Test that get returns a value (either from env, db cache, or default)
      const value = configService.get('email.batch.size' as any, 25);
      expect(typeof value).toBe('number');
    });

    it('should return default for unknown keys', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const value = configService.get('completely.unknown.key' as any, 'my-default');
      expect(value).toBe('my-default');
    });
  });

  describe('configService object', () => {
    it('should have required methods', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(typeof configService.get).toBe('function');
      expect(typeof configService.parseValue).toBe('function');
      expect(typeof configService.init).toBe('function');
      expect(typeof configService.refresh).toBe('function');
    });

    it('should have set and getAsync methods', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(typeof configService.set).toBe('function');
      expect(typeof configService.getAsync).toBe('function');
    });
  });
});
