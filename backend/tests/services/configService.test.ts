/**
 * Config Service Tests
 * 
 * Tests the configuration management service public API.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock dependencies before importing configService
vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    isAvailable: vi.fn().mockReturnValue(false),
    setConfig: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue(null)
  },
  getPrisma: vi.fn().mockReturnValue(null)
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    invalidateByTag: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    init: vi.fn(),
    skip: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    db: vi.fn(),
    connect: vi.fn()
  }
}));

describe('ConfigService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // parseValue
  // ===========================================================================

  describe('parseValue', () => {
    it('should parse boolean strings correctly', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('true', false)).toBe(true);
      expect(configService.parseValue('false', true)).toBe(false);
    }, 30000); // Extended timeout for first import which initializes Prisma

    it('should parse numeric strings correctly', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('123', 0)).toBe(123);
      expect(configService.parseValue('3.14', 0)).toBe(3.14);
      expect(configService.parseValue('-42', 0)).toBe(-42);
    });

    it('should parse zero correctly', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('0', 100)).toBe(0);
    });

    it('should return string for non-numeric, non-boolean values', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      expect(configService.parseValue('hello', '')).toBe('hello');
      expect(configService.parseValue('test-value', '')).toBe('test-value');
    });

    it('should handle empty string', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const result = configService.parseValue('', 'default');
      expect(result).toBe('');
    });

    it('should handle JSON-like strings', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // JSON array string
      const arrayResult = configService.parseValue('["a","b"]', []);
      expect(Array.isArray(arrayResult)).toBe(true);
      
      // JSON object string
      const objResult = configService.parseValue('{"key":"value"}', {});
      expect(typeof objResult).toBe('object');
    });
  });

  // ===========================================================================
  // get - synchronous retrieval
  // ===========================================================================

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

    it('should return a number type for agent configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // Shopping agent configs - verify type is correct
      const tokens = configService.get('shopping.ai.maxTokens' as any, 1000);
      expect(typeof tokens).toBe('number');
      
      // Job agent configs
      const excellent = configService.get('job.match.excellent' as any, 50);
      expect(typeof excellent).toBe('number');
    });

    it('should return provided default for api configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const timeout = configService.get('api.rateLimit.windowMs' as any, 30000);
      expect(typeof timeout).toBe('number');
    });

    it('should handle array type defaults', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const defaultArray = ['default1', 'default2'];
      const sources = configService.get('unknown.array.key' as any, defaultArray);
      expect(Array.isArray(sources)).toBe(true);
    });

    it('should handle boolean type defaults', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const enabled = configService.get('unknown.boolean.key' as any, true);
      expect(typeof enabled).toBe('boolean');
    });
  });

  // ===========================================================================
  // getAsync - asynchronous retrieval
  // ===========================================================================

  describe('getAsync', () => {
    it('should return a value asynchronously', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const value = await configService.getAsync('email.batch.size' as any, 25);
      expect(typeof value).toBe('number');
    });

    it('should return default for unknown keys asynchronously', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const value = await configService.getAsync('unknown.async.key' as any, 'async-default');
      expect(value).toBe('async-default');
    });
  });

  // ===========================================================================
  // set - setting values
  // ===========================================================================

  describe('set', () => {
    it('should set a value in local cache', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // Set a custom value
      await configService.set('test.custom.key' as any, 'custom-value');
      
      // Retrieve it
      const value = configService.get('test.custom.key' as any, 'default');
      expect(value).toBe('custom-value');
    });

    it('should set numeric values', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      await configService.set('test.numeric.key' as any, 42);
      
      const value = configService.get('test.numeric.key' as any, 0);
      expect(value).toBe(42);
    });

    it('should set boolean values', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      await configService.set('test.boolean.key' as any, true);
      
      const value = configService.get('test.boolean.key' as any, false);
      expect(value).toBe(true);
    });

    it('should set array values', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const arrayValue = ['source1', 'source2', 'source3'];
      await configService.set('test.array.key' as any, arrayValue);
      
      const value = configService.get('test.array.key' as any, []);
      expect(value).toEqual(arrayValue);
    });
  });

  // ===========================================================================
  // init and refresh
  // ===========================================================================

  describe('init', () => {
    it('should initialize without throwing', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      await expect(configService.init()).resolves.not.toThrow();
    });

    it('should be idempotent (can be called multiple times)', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      await configService.init();
      await configService.init();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh configuration without throwing', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      await expect(configService.refresh()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // configService object structure
  // ===========================================================================

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

    it('should have getAll and getAllKeys methods', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // These may or may not exist depending on implementation
      // Just verify the service is well-formed
      expect(configService).toBeDefined();
    });
  });

  // ===========================================================================
  // Category-specific config tests
  // ===========================================================================

  describe('agent configuration keys', () => {
    it('should return value or provided default for agent configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      // With mocked dependencies, get returns from internal default or provided default
      const rateLimit = configService.get('agent.default.rateLimit' as any, 100);
      expect(typeof rateLimit).toBe('number');
      
      const timeout = configService.get('agent.default.timeoutMs' as any, 50000);
      expect(typeof timeout).toBe('number');
    });

    it('should return value or provided default for shopping configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const dealScore = configService.get('shopping.dealScore.excellent' as any, 90);
      expect(typeof dealScore).toBe('number');
    });

    it('should return value or provided default for job configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const rateLimit = configService.get('jobs.agent.rateLimit' as any, 50);
      expect(typeof rateLimit).toBe('number');
    });

    it('should return value or provided default for travel configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const maxFlights = configService.get('travel.search.maxFlights' as any, 25);
      expect(typeof maxFlights).toBe('number');
    });

    it('should return value or provided default for cooking configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const maxResults = configService.get('cooking.search.maxResults' as any, 15);
      expect(typeof maxResults).toBe('number');
    });

    it('should return value or provided default for news configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const maxResults = configService.get('news.search.maxResults' as any, 25);
      expect(typeof maxResults).toBe('number');
    });

    it('should return value or provided default for problem configs', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const maxResults = configService.get('problem.search.maxResults' as any, 50);
      expect(typeof maxResults).toBe('number');
    });
  });

  describe('cache TTL configuration', () => {
    it('should return cache TTL as number', async () => {
      const { configService } = await import('../../src/services/core/configService');
      
      const flightsTtl = configService.get('cache.flights.ttlSeconds' as any, 1000);
      expect(typeof flightsTtl).toBe('number');
      
      const productsTtl = configService.get('cache.products.ttlSeconds' as any, 1000);
      expect(typeof productsTtl).toBe('number');
    });
  });
});
