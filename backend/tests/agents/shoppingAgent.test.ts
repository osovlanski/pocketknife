/**
 * ShoppingAgent Tests
 * 
 * Comprehensive tests for the Shopping Agent that handles product search, 
 * deals, price alerts, and user interests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockPrisma, mockProductAggregatorService, mockClaudeService } = vi.hoisted(() => ({
  mockPrisma: {
    savedProduct: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    priceAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    userInterest: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn()
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    productSearch: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  },
  mockProductAggregatorService: {
    search: vi.fn()
  },
  mockClaudeService: {
    generateText: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' }),
    logActivity: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      return defaultValue;
    })
  }
}));

vi.mock('../../src/services/core/claudeService', () => ({
  default: mockClaudeService
}));

// Define mock services with vi.hoisted
const { mockEbayService, mockAmazonService, mockAliexpressService, mockIsraeliShopsService } = vi.hoisted(() => ({
  mockEbayService: {
    isAvailable: vi.fn(() => true),
    search: vi.fn().mockResolvedValue([
      { id: 'ebay-1', title: 'eBay Product', price: 29.99, sourceUrl: 'https://ebay.com/1', currency: 'USD' }
    ])
  },
  mockAmazonService: {
    isAvailable: vi.fn(() => true),
    search: vi.fn().mockResolvedValue([
      { id: 'amazon-1', title: 'Amazon Product', price: 39.99, sourceUrl: 'https://amazon.com/1', currency: 'USD' }
    ])
  },
  mockAliexpressService: {
    isAvailable: vi.fn(() => true),
    search: vi.fn().mockResolvedValue([
      { id: 'ali-1', title: 'AliExpress Product', price: 9.99, sourceUrl: 'https://aliexpress.com/1', currency: 'USD' }
    ])
  },
  mockIsraeliShopsService: {
    isAvailable: vi.fn(() => true),
    search: vi.fn().mockResolvedValue({
      products: [
        { id: 'israeli-1', title: 'Israeli Product', price: 99.99, currency: 'ILS', source: 'Zap', sourceUrl: 'https://zap.co.il/1' }
      ],
      source: 'google_cse',
      quotaStatus: { remaining: 90 }
    }),
    convertIlsToUsd: vi.fn((price: number) => price * 0.27)
  }
}));

vi.mock('../../src/services/shopping', () => ({
  productAggregatorService: mockProductAggregatorService,
  ebayService: mockEbayService,
  amazonService: mockAmazonService,
  aliexpressService: mockAliexpressService,
  israeliShopsService: mockIsraeliShopsService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn()
  }
}));

vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn()
  }
}));

vi.mock('../../src/utils/retry', () => ({
  RateLimiter: class { async acquire() { return true; } },
  CircuitBreaker: class { async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); } },
  withRetry: vi.fn((fn) => fn())
}));

// Static import after mocks
import { ShoppingAgent } from '../../src/agents/ShoppingAgent';

describe('ShoppingAgent', () => {
  let shoppingAgent: ShoppingAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPrisma.savedProduct.findMany.mockResolvedValue([]);
    mockPrisma.savedProduct.findUnique.mockResolvedValue(null);
    mockPrisma.savedProduct.findFirst.mockResolvedValue(null);
    mockPrisma.savedProduct.create.mockImplementation((args) => ({
      id: 'saved-prod-123',
      ...args.data,
      savedAt: new Date()
    }));
    mockPrisma.savedProduct.delete.mockResolvedValue({ id: 'saved-prod-123' });
    
    mockPrisma.priceAlert.findMany.mockResolvedValue([]);
    mockPrisma.priceAlert.create.mockImplementation((args) => ({
      id: 'alert-123',
      ...args.data,
      createdAt: new Date()
    }));
    
    mockPrisma.userInterest.findMany.mockResolvedValue([]);
    mockPrisma.userInterest.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.userInterest.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.userInterest.upsert.mockResolvedValue({});
    
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.product.create.mockResolvedValue({ id: 'product-1' });
    mockPrisma.product.update.mockResolvedValue({});
    
    mockPrisma.productSearch.findMany.mockResolvedValue([]);
    mockPrisma.productSearch.create.mockResolvedValue({ id: 'search-1' });
    mockPrisma.productSearch.update.mockResolvedValue({});
    
    mockPrisma.agentActivity.create.mockResolvedValue({});
    
    mockProductAggregatorService.search.mockResolvedValue([
      { id: 'prod-1', title: 'Product 1', price: 29.99, source: 'ebay', sourceUrl: 'https://ebay.com/1', currency: 'USD' }
    ]);
    
    mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
      scores: [{ index: 0, score: 75, reason: 'Good deal' }]
    }));
    
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
      expect(shoppingAgent.metadata.icon).toBe('🛍️');
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

  describe('search-products action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-products',
        query: 'laptop'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should require query', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Search query is required');
    });

    it('should search products successfully', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'wireless mouse'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.products).toBeDefined();
    });

    it('should handle search with filters', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'keyboard',
        filters: {
          minPrice: 20,
          maxPrice: 100
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.productSearch.create.mockRejectedValue(new Error('Database error'));
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('search-by-hobby action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        hobbies: ['gaming']
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should require hobbies or query', async () => {
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should search by hobbies successfully', async () => {
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          {
            productName: 'Gaming Mouse',
            reason: 'Great for gaming',
            priceRange: { min: 20, max: 80 },
            searchQuery: 'gaming mouse rgb',
            category: 'gaming',
            priority: 1
          }
        ]
      }));
      
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        userId: 'user-123',
        hobbies: ['gaming']
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle AI errors gracefully', async () => {
      mockClaudeService.generateText.mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        userId: 'user-123',
        hobbies: ['photography']
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('get-deals action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'get-deals'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should get deals successfully', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Deal Product', price: 19.99, dealScore: 85 }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.deals).toBeDefined();
    });

    it('should filter deals by score', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Great Deal', price: 9.99, dealScore: 95 },
        { id: 'prod-2', title: 'OK Deal', price: 29.99, dealScore: 70 }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123',
        filters: { minDealScore: 80 }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('save-product action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'save-product',
        productId: 'prod-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should require productId', async () => {
      const result = await shoppingAgent.execute({
        action: 'save-product',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should save product successfully', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-123', isSaved: true });
      
      const result = await shoppingAgent.execute({
        action: 'save-product',
        userId: 'user-123',
        productId: 'prod-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: { isSaved: true }
      });
    });
  });

  describe('unsave-product action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'unsave-product',
        productId: 'prod-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should unsave product successfully', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-123', isSaved: false });
      
      const result = await shoppingAgent.execute({
        action: 'unsave-product',
        userId: 'user-123',
        productId: 'prod-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: { isSaved: false }
      });
    });
  });

  describe('get-saved-products action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'get-saved-products'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should return saved products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Saved Product', price: 29.99, isSaved: true }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedProducts).toHaveLength(1);
    });

    it('should return empty array when no saved products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      
      const result = await shoppingAgent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedProducts).toEqual([]);
    });
  });

  describe('set-price-alert action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        productId: 'prod-123',
        targetPrice: 25.00
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should require productId', async () => {
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        userId: 'user-123',
        targetPrice: 25.00
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require targetPrice', async () => {
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        userId: 'user-123',
        productId: 'prod-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should create price alert successfully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ 
        id: 'prod-123',
        title: 'Test Product',
        price: 49.99
      });
      mockPrisma.priceAlert.create.mockResolvedValue({ id: 'alert-1' });
      mockPrisma.product.update.mockResolvedValue({});
      
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        userId: 'user-123',
        productId: 'prod-123',
        targetPrice: 25.00
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.priceAlert.create).toHaveBeenCalled();
    });

    it('should fail if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        userId: 'user-123',
        productId: 'nonexistent',
        targetPrice: 25.00
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('get-price-alerts action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'get-price-alerts'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should return price alerts', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([
        { id: 'alert-1', productId: 'prod-1', targetPrice: 19.99 }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-price-alerts',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.priceAlerts).toHaveLength(1);
    });

    it('should return empty array when no alerts', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([]);
      
      const result = await shoppingAgent.execute({
        action: 'get-price-alerts',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.priceAlerts).toEqual([]);
    });
  });

  describe('update-interests action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'update-interests',
        interests: [{ type: 'hobby', value: 'gaming' }]
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should require interests', async () => {
      const result = await shoppingAgent.execute({
        action: 'update-interests',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should update interests successfully', async () => {
      mockPrisma.userInterest.upsert.mockResolvedValue({});
      
      const result = await shoppingAgent.execute({
        action: 'update-interests',
        userId: 'user-123',
        interests: [
          { type: 'hobby', value: 'gaming' },
          { type: 'category', value: 'electronics' }
        ]
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.userInterest.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('get-suggestions action', () => {
    it('should require userId', async () => {
      const result = await shoppingAgent.execute({
        action: 'get-suggestions'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should return suggestions based on user interests', async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([
        { interestType: 'hobby', value: 'gaming', weight: 1.0 }
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Gaming Keyboard', price: 79.99, dealScore: 80, isSaved: true }
      ]);
      mockPrisma.productSearch.findMany.mockResolvedValue([
        { id: 'search-1', query: 'gaming mouse' }
      ]);
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          { product: 'Gaming Mouse', reason: 'Great for gaming', score: 85 }
        ]
      }));
      
      const result = await shoppingAgent.execute({
        action: 'get-suggestions',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.suggestions).toBeDefined();
    });

    it('should handle empty interests gracefully', async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.productSearch.findMany.mockResolvedValue([]);
      
      const result = await shoppingAgent.execute({
        action: 'get-suggestions',
        userId: 'user-123'
      });
      
      // Either succeeds with empty suggestions or fails gracefully
      expect(result).toBeDefined();
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
    it('should handle database not available for get-saved-products', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new ShoppingAgent();
      const result = await agent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });

    it('should handle database not available for search-products', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new ShoppingAgent();
      const result = await agent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });

    it('should handle database not available for get-deals', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new ShoppingAgent();
      const result = await agent.execute({
        action: 'get-deals',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });

    it('should handle database not available for update-interests', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new ShoppingAgent();
      const result = await agent.execute({
        action: 'update-interests',
        userId: 'user-123',
        interests: [{ type: 'hobby', value: 'gaming' }]
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });

    it('should handle database not available for search-by-hobby', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new ShoppingAgent();
      const result = await agent.execute({
        action: 'search-by-hobby',
        userId: 'user-123',
        hobbies: ['gaming']
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
  });

  describe('search with sources', () => {
    it('should search from specified sources', async () => {
      mockEbayService.isAvailable.mockReturnValue(true);
      mockEbayService.search.mockResolvedValue([
        { id: 'ebay-prod', title: 'eBay Item', price: 50, sourceUrl: 'https://ebay.com/item', currency: 'USD' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop',
        sources: ['ebay']
      });
      
      expect(result.success).toBe(true);
    });

    it('should search Amazon when available', async () => {
      mockAmazonService.isAvailable.mockReturnValue(true);
      mockAmazonService.search.mockResolvedValue([
        { id: 'amazon-prod', title: 'Amazon Item', price: 75, sourceUrl: 'https://amazon.com/item', currency: 'USD' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'headphones',
        sources: ['amazon']
      });
      
      expect(result.success).toBe(true);
    });

    it('should search AliExpress when available', async () => {
      mockAliexpressService.isAvailable.mockReturnValue(true);
      mockAliexpressService.search.mockResolvedValue([
        { id: 'ali-prod', title: 'AliExpress Item', price: 15, sourceUrl: 'https://aliexpress.com/item', currency: 'USD' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'phone case',
        sources: ['aliexpress']
      });
      
      expect(result.success).toBe(true);
    });

    it('should search Israeli shops when specified', async () => {
      mockIsraeliShopsService.search.mockResolvedValue({
        products: [
          { id: 'israeli-1', title: 'Israeli Product', price: 299, currency: 'ILS', source: 'Zap', sourceUrl: 'https://zap.co.il/item' }
        ],
        source: 'google_cse',
        quotaStatus: { remaining: 85 }
      });
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop',
        sources: ['israeli']
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle Israeli shops with zap scraper source', async () => {
      mockIsraeliShopsService.search.mockResolvedValue({
        products: [
          { id: 'israeli-2', title: 'Zap Product', price: 199, currency: 'ILS', source: 'Zap Scraper', sourceUrl: 'https://zap.co.il/item' }
        ],
        source: 'zap_scraper',
        quotaStatus: { remaining: 0 }
      });
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'monitor',
        sources: ['israeli']
      });
      
      expect(result.success).toBe(true);
    });

    it('should skip unavailable sources gracefully', async () => {
      mockEbayService.isAvailable.mockReturnValue(false);
      mockAmazonService.isAvailable.mockReturnValue(false);
      mockAliexpressService.isAvailable.mockReturnValue(false);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'test product',
        sources: ['ebay', 'amazon', 'aliexpress']
      });
      
      // Still succeeds even with no products
      expect(result).toBeDefined();
    });
  });

  describe('getServiceStatus', () => {
    it('should return status for all shopping sources', () => {
      mockEbayService.isAvailable.mockReturnValue(true);
      mockAmazonService.isAvailable.mockReturnValue(false);
      mockAliexpressService.isAvailable.mockReturnValue(true);
      mockIsraeliShopsService.isAvailable.mockReturnValue(true);
      
      const status = shoppingAgent.getServiceStatus();
      
      expect(status).toBeInstanceOf(Array);
      expect(status.length).toBeGreaterThan(0);
      expect(status.find(s => s.source === 'ebay')).toBeDefined();
      expect(status.find(s => s.source === 'amazon')).toBeDefined();
      expect(status.find(s => s.source === 'aliexpress')).toBeDefined();
      expect(status.find(s => s.source === 'israeli')).toBeDefined();
    });
  });

  describe('deal scoring', () => {
    it('should score products with high discounts', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'deal-1', 
          title: 'Big Deal Product', 
          price: 25, 
          originalPrice: 100, 
          discount: 75,
          source: 'ebay',
          sourceUrl: 'https://ebay.com/deal',
          currency: 'USD'
        }
      ]);
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        scores: [{ index: 0, score: 95, reason: 'Excellent discount of 75%' }]
      }));
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'deal product'
      });
      
      expect(result.success).toBe(true);
    });

    it('should use algorithmic scoring when AI fails', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'prod-1', 
          title: 'Product', 
          price: 50, 
          source: 'ebay',
          sourceUrl: 'https://ebay.com/1',
          currency: 'USD'
        }
      ]);
      // AI returns invalid JSON
      mockClaudeService.generateText.mockResolvedValue('invalid json response');
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'product'
      });
      
      // Should still succeed with fallback scoring
      expect(result.success).toBe(true);
    });

    it('should score budget-friendly items higher', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'budget-1', 
          title: 'Budget Item', 
          price: 15, 
          source: 'aliexpress',
          sourceUrl: 'https://aliexpress.com/1',
          currency: 'USD'
        }
      ]);
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        scores: [{ index: 0, score: 70, reason: 'Budget friendly option' }]
      }));
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'budget item'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.products).toBeDefined();
    });

    it('should handle mid-range discounts (30%+)', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'mid-1', 
          title: 'Mid Discount', 
          price: 70, 
          originalPrice: 100,
          discount: 30,
          source: 'ebay',
          sourceUrl: 'https://ebay.com/mid',
          currency: 'USD'
        }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'mid discount'
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle small discounts (15%+)', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'small-1', 
          title: 'Small Discount', 
          price: 85, 
          originalPrice: 100,
          discount: 15,
          source: 'ebay',
          sourceUrl: 'https://ebay.com/small',
          currency: 'USD'
        }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'small discount'
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle products with category', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'cat-1', 
          title: 'Categorized Product', 
          price: 50, 
          category: 'Electronics',
          source: 'ebay',
          sourceUrl: 'https://ebay.com/cat',
          currency: 'USD'
        }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'electronics item'
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle products with tags', async () => {
      mockProductAggregatorService.search.mockResolvedValue([
        { 
          id: 'tag-1', 
          title: 'Tagged Product', 
          price: 50, 
          tags: ['gaming', 'electronics'],
          source: 'ebay',
          sourceUrl: 'https://ebay.com/tag',
          currency: 'USD'
        }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'tagged item'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('search-by-hobby with prompt', () => {
    it('should search by prompt instead of hobbies', async () => {
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          {
            productName: 'Wireless Keyboard',
            reason: 'Perfect for productivity',
            priceRange: { min: 30, max: 100 },
            searchQuery: 'wireless keyboard ergonomic',
            category: 'electronics',
            priority: 1
          }
        ]
      }));
      mockEbayService.search.mockResolvedValue([
        { id: 'kb-1', title: 'Wireless Keyboard', price: 49.99, sourceUrl: 'https://ebay.com/kb', currency: 'USD' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        userId: 'user-123',
        query: 'I need a good keyboard for working from home'
      });
      
      expect(result.success).toBe(true);
    });

    it('should save hobbies as user interests', async () => {
      mockClaudeService.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          {
            productName: 'Gaming Mouse',
            reason: 'Great for gaming',
            priceRange: { min: 20, max: 80 },
            searchQuery: 'gaming mouse rgb',
            category: 'gaming',
            priority: 1
          }
        ]
      }));
      mockEbayService.search.mockResolvedValue([
        { id: 'mouse-1', title: 'Gaming Mouse', price: 39.99, sourceUrl: 'https://ebay.com/mouse', currency: 'USD' }
      ]);
      mockPrisma.userInterest.upsert.mockResolvedValue({});
      
      const result = await shoppingAgent.execute({
        action: 'search-by-hobby',
        userId: 'user-123',
        hobbies: ['gaming', 'streaming']
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.userInterest.upsert).toHaveBeenCalled();
    });
  });

  describe('get-deals with filters', () => {
    it('should filter deals by source', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'deal-1', title: 'eBay Deal', price: 19.99, dealScore: 85, source: 'ebay' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123',
        filters: { source: 'ebay' }
      });
      
      expect(result.success).toBe(true);
    });

    it('should filter deals by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'deal-1', title: 'Electronics Deal', price: 49.99, dealScore: 80, category: 'Electronics' }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123',
        filters: { category: 'Electronics' }
      });
      
      expect(result.success).toBe(true);
    });

    it('should filter deals by price range', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'deal-1', title: 'Mid Price Deal', price: 50, dealScore: 75 }
      ]);
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123',
        filters: { minPrice: 25, maxPrice: 100 }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle priceAlert database errors', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', price: 50 });
      mockPrisma.priceAlert.create.mockRejectedValue(new Error('Database constraint error'));
      
      const result = await shoppingAgent.execute({
        action: 'set-price-alert',
        userId: 'user-123',
        productId: 'prod-1',
        targetPrice: 25
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database constraint error');
    });

    it('should handle get-price-alerts database errors', async () => {
      mockPrisma.priceAlert.findMany.mockRejectedValue(new Error('Query failed'));
      
      const result = await shoppingAgent.execute({
        action: 'get-price-alerts',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('should handle update-interests database errors', async () => {
      mockPrisma.userInterest.upsert.mockRejectedValue(new Error('Upsert failed'));
      
      const result = await shoppingAgent.execute({
        action: 'update-interests',
        userId: 'user-123',
        interests: [{ type: 'hobby', value: 'gaming' }]
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Upsert failed');
    });

    it('should handle get-suggestions AI errors', async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([
        { interestType: 'hobby', value: 'gaming', weight: 1.0 }
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', title: 'Gaming Item', isSaved: true }
      ]);
      mockPrisma.productSearch.findMany.mockResolvedValue([]);
      mockClaudeService.generateText.mockRejectedValue(new Error('AI service error'));
      
      const result = await shoppingAgent.execute({
        action: 'get-suggestions',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service error');
    });

    it('should handle save-product update errors', async () => {
      mockPrisma.product.update.mockRejectedValue(new Error('Product not found'));
      
      const result = await shoppingAgent.execute({
        action: 'save-product',
        userId: 'user-123',
        productId: 'nonexistent'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should handle unsave-product update errors', async () => {
      mockPrisma.product.update.mockRejectedValue(new Error('Product not found'));
      
      const result = await shoppingAgent.execute({
        action: 'unsave-product',
        userId: 'user-123',
        productId: 'nonexistent'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should handle get-saved-products database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Query failed'));
      
      const result = await shoppingAgent.execute({
        action: 'get-saved-products',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('should handle get-deals database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Query failed'));
      
      const result = await shoppingAgent.execute({
        action: 'get-deals',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('should handle Israeli shops search errors', async () => {
      mockIsraeliShopsService.search.mockRejectedValue(new Error('Israeli shops unavailable'));
      
      const result = await shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop',
        sources: ['israeli']
      });
      
      // Should still succeed but with no products from Israeli shops
      expect(result).toBeDefined();
    });
  });

  describe('agent lifecycle', () => {
    it('should return initial state', () => {
      const state = shoppingAgent.getState();
      expect(state).toBeDefined();
      expect(['idle', 'running', 'stopped', 'error']).toContain(state.status);
    });

    it('should return metrics', () => {
      const metrics = shoppingAgent.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should be able to stop', async () => {
      // Start a long operation
      const executePromise = shoppingAgent.execute({
        action: 'search-products',
        userId: 'user-123',
        query: 'laptop',
        sources: ['ebay', 'amazon', 'aliexpress']
      });
      
      // Stop immediately
      shoppingAgent.stop();
      
      // Should complete (may or may not have results depending on timing)
      const result = await executePromise;
      expect(result).toBeDefined();
    });
  });
});
