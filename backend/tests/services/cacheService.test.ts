/**
 * Cache Service Tests
 * 
 * Tests the caching functionality including memory cache operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CacheService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cacheKeys', () => {
    it('should generate correct job search cache keys', async () => {
      const { cacheKeys } = await import('../../src/services/core/cacheService');
      
      const key = cacheKeys.jobSearch('developer', 'tel-aviv');
      expect(key).toBe('job:search:developer:tel-aviv');
    });

    it('should generate correct job search cache keys without location', async () => {
      const { cacheKeys } = await import('../../src/services/core/cacheService');
      
      const key = cacheKeys.jobSearch('developer');
      expect(key).toBe('job:search:developer:any');
    });

    it('should generate correct job details cache keys', async () => {
      const { cacheKeys } = await import('../../src/services/core/cacheService');
      
      const key = cacheKeys.jobDetails('job123', 'linkedin');
      expect(key).toBe('job:details:linkedin:job123');
    });

    it('should generate correct company info cache keys', async () => {
      const { cacheKeys } = await import('../../src/services/core/cacheService');
      
      const key = cacheKeys.companyInfo('Google Inc');
      expect(key).toBe('company:google-inc');
    });

    it('should generate correct cv analysis cache keys', async () => {
      const { cacheKeys } = await import('../../src/services/core/cacheService');
      
      const key = cacheKeys.cvAnalysis('abc123hash');
      expect(key).toBe('cv:analysis:abc123hash');
    });
  });

  describe('cacheService operations', () => {
    it('should have required methods', async () => {
      const { cacheService } = await import('../../src/services/core/cacheService');
      
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.getStats).toBe('function');
      expect(typeof cacheService.getOrSet).toBe('function');
    });

    it('should set and get values from memory cache', async () => {
      const { cacheService } = await import('../../src/services/core/cacheService');
      
      const testKey = 'test:key:' + Date.now();
      const testValue = { data: 'test value', timestamp: Date.now() };
      
      await cacheService.set(testKey, testValue, 60);
      const retrieved = await cacheService.get(testKey);
      
      expect(retrieved).toEqual(testValue);
    });

    it('should return null for non-existent keys', async () => {
      const { cacheService } = await import('../../src/services/core/cacheService');
      
      const result = await cacheService.get('non:existent:key:' + Date.now());
      expect(result).toBeNull();
    });

    it('should use getOrSet factory function', async () => {
      const { cacheService } = await import('../../src/services/core/cacheService');
      
      const testKey = 'test:getorset:' + Date.now();
      let factoryCallCount = 0;
      
      const factory = async () => {
        factoryCallCount++;
        return { value: 'generated' };
      };
      
      // First call should invoke factory
      const result1 = await cacheService.getOrSet(testKey, factory);
      expect(result1).toEqual({ value: 'generated' });
      expect(factoryCallCount).toBe(1);
      
      // Second call should use cached value
      const result2 = await cacheService.getOrSet(testKey, factory);
      expect(result2).toEqual({ value: 'generated' });
      expect(factoryCallCount).toBe(1); // Factory not called again
    });

    it('should return stats', async () => {
      const { cacheService } = await import('../../src/services/core/cacheService');
      
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('memory');
      expect(stats.memory).toHaveProperty('keys');
      expect(stats.memory).toHaveProperty('hits');
      expect(stats.memory).toHaveProperty('misses');
    });
  });
});
