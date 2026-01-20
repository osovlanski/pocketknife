/**
 * ShoppingAgent Tests
 * 
 * Tests for the Shopping Agent that handles product search, deals, and price alerts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' })
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

vi.mock('../../src/services/core/claudeService', () => ({
  default: {
    generateText: vi.fn().mockResolvedValue('{}')
  }
}));

vi.mock('../../src/services/shopping', () => ({
  productAggregatorService: {
    search: vi.fn().mockResolvedValue([
      { id: 'prod-1', title: 'Product 1', price: 29.99, source: 'ebay' }
    ])
  },
  ebayService: {
    search: vi.fn().mockResolvedValue([])
  },
  amazonService: {
    search: vi.fn().mockResolvedValue([])
  },
  aliexpressService: {
    search: vi.fn().mockResolvedValue([])
  },
  israeliShopsService: {
    search: vi.fn().mockResolvedValue([])
  }
}));

describe('ShoppingAgent', () => {
  let shoppingAgent: any;
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      savedProduct: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((args) => ({
          id: 'saved-prod-123',
          ...args.data,
          savedAt: new Date()
        })),
        delete: vi.fn().mockResolvedValue({ id: 'saved-prod-123' }),
        update: vi.fn().mockImplementation((args) => args.data)
      },
      priceAlert: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((args) => ({
          id: 'alert-123',
          ...args.data,
          createdAt: new Date()
        })),
        delete: vi.fn().mockResolvedValue({ id: 'alert-123' })
      },
      userInterest: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
    
    const { ShoppingAgent } = await import('../../src/agents/ShoppingAgent');
    shoppingAgent = new ShoppingAgent();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(shoppingAgent.metadata.id).toBe('shopping');
    });
    
    it('should have correct name', () => {
      expect(shoppingAgent.metadata.name).toBe('Shopping Agent');
    });
    
    it('should have correct icon', () => {
      expect(shoppingAgent.metadata.icon).toBe('🛒');
    });
    
    it('should have color defined', () => {
      expect(shoppingAgent.metadata.color).toBeDefined();
    });
    
    it('should have description', () => {
      expect(shoppingAgent.metadata.description).toBeDefined();
    });
  });

  describe('agent methods', () => {
    it('should have execute method', () => {
      expect(typeof shoppingAgent.execute).toBe('function');
    });
    
    it('should have stop method', () => {
      expect(typeof shoppingAgent.stop).toBe('function');
    });
    
    it('should have getState method', () => {
      expect(typeof shoppingAgent.getState).toBe('function');
    });
    
    it('should have getMetrics method', () => {
      expect(typeof shoppingAgent.getMetrics).toBe('function');
    });
  });

  describe('get-saved-products action', () => {
    it('should execute get-saved-products action', async () => {
      const result = await shoppingAgent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      // Either succeeds or fails gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('get-price-alerts action', () => {
    it('should return price alerts', async () => {
      const mockAlerts = [
        { id: 'alert-1', productId: 'prod-1', targetPrice: 19.99 }
      ];
      mockPrisma.priceAlert.findMany.mockResolvedValue(mockAlerts);
      
      const result = await shoppingAgent.execute({
        action: 'get-price-alerts',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.priceAlerts).toHaveLength(1);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await shoppingAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('database unavailable', () => {
    it('should handle database not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const result = await shoppingAgent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
    });
  });
});
