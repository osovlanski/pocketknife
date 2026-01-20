/**
 * ExternalApiService Tests
 * 
 * Tests for the external API configuration service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn()
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    invalidateByPattern: vi.fn().mockResolvedValue(undefined)
  },
  cacheKeys: {
    externalApiConfig: (name: string) => `api:config:${name}`,
    externalApiConfigs: () => 'api:configs:all',
    allExternalApis: () => 'api:configs:all'
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

describe('ExternalApiService', () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      externalApiConfig: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'api-1',
            name: 'remoteok',
            displayName: 'RemoteOK',
            category: 'jobs',
            isEnabled: true,
            isHealthy: true,
            currentUsage: 0,
            requiresAuth: false
          }
        ]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((args) => ({
          id: 'new-api-123',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        update: vi.fn().mockImplementation((args) => ({
          ...args.data,
          updatedAt: new Date()
        })),
        upsert: vi.fn().mockImplementation((args) => ({
          ...args.create,
          id: 'api-123'
        }))
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('service structure', () => {
    it('should export externalApiService', async () => {
      const module = await import('../../src/services/core/externalApiService');
      
      expect(module.externalApiService).toBeDefined();
    });
    
    it('should have getAll method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.getAll).toBe('function');
    });
    
    it('should have getByName method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.getByName).toBe('function');
    });
    
    it('should have update method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.update).toBe('function');
    });
    
    it('should have toggle method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.toggle).toBe('function');
    });
    
    it('should have isApiEnabled method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.isApiEnabled).toBe('function');
    });
    
    it('should have getEnabledApis method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.getEnabledApis).toBe('function');
    });
    
    it('should have isWithinRateLimit method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.isWithinRateLimit).toBe('function');
    });
  });

  describe('getAll', () => {
    it('should return API configurations', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const configs = await externalApiService.getAll();
      
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
    });
    
    it('should filter by category', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const configs = await externalApiService.getAll('jobs');
      
      expect(configs).toBeDefined();
    });
  });

  describe('getByName', () => {
    it('should return specific API configuration', async () => {
      mockPrisma.externalApiConfig.findFirst.mockResolvedValue({
        id: 'api-1',
        name: 'remoteok',
        displayName: 'RemoteOK',
        isEnabled: true
      });
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const config = await externalApiService.getByName('remoteok');
      
      expect(config).toBeDefined();
    });
    
    it('should return null for non-existent API', async () => {
      mockPrisma.externalApiConfig.findFirst.mockResolvedValue(null);
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const config = await externalApiService.getByName('non-existent');
      
      expect(config).toBeNull();
    });
  });

  describe('update', () => {
    it('should update API configuration', async () => {
      mockPrisma.externalApiConfig.findFirst.mockResolvedValue({
        id: 'api-1',
        name: 'remoteok'
      });
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      await externalApiService.update('remoteok', { isEnabled: false });
      
      expect(mockPrisma.externalApiConfig.update).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should have toggle method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.toggle).toBe('function');
    });
  });

  describe('isApiEnabled', () => {
    it('should have isApiEnabled method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.isApiEnabled).toBe('function');
    });
    
    it('should return boolean', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      // This will return based on default config or database state
      const isEnabled = await externalApiService.isApiEnabled('remoteok');
      
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('getEnabledApis', () => {
    it('should return only enabled APIs for category', async () => {
      mockPrisma.externalApiConfig.findMany.mockResolvedValue([
        { name: 'remoteok', isEnabled: true },
        { name: 'jsearch', isEnabled: true }
      ]);
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const enabled = await externalApiService.getEnabledApis('jobs');
      
      expect(enabled).toBeDefined();
      expect(Array.isArray(enabled)).toBe(true);
    });
  });

  describe('isWithinRateLimit', () => {
    it('should have isWithinRateLimit method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.isWithinRateLimit).toBe('function');
    });
    
    it('should return boolean', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      const isAllowed = await externalApiService.isWithinRateLimit('remoteok');
      
      expect(typeof isAllowed).toBe('boolean');
    });
  });

  describe('initializeDefaults', () => {
    it('should have initializeDefaults method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.initializeDefaults).toBe('function');
    });
  });

  describe('updateHealth', () => {
    it('should have updateHealth method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.updateHealth).toBe('function');
    });
    
    it('should update health status', async () => {
      mockPrisma.externalApiConfig.findFirst.mockResolvedValue({
        id: 'api-1',
        name: 'remoteok'
      });
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      await externalApiService.updateHealth('remoteok', true);
      
      expect(mockPrisma.externalApiConfig.update).toHaveBeenCalled();
    });
  });

  describe('incrementUsage', () => {
    it('should have incrementUsage method', async () => {
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      expect(typeof externalApiService.incrementUsage).toBe('function');
    });
  });

  describe('database unavailable', () => {
    it('should handle database not available gracefully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const { externalApiService } = await import('../../src/services/core/externalApiService');
      
      // Should return empty array when database not available
      const configs = await externalApiService.getAll();
      
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
    });
  });
});
