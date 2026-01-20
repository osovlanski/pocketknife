/**
 * Shopping Controller Tests
 * 
 * Tests for the Shopping controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents/ShoppingAgent', () => ({
  shoppingAgent: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    }),
    stop: vi.fn()
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@test.com' })
  }
}));

describe('Shopping Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { products: [{ id: 'prod-1', name: 'Product 1' }] }
      });

      const { searchProducts } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { 
        userId: 'user-123',
        query: 'laptop',
        sources: ['amazon']
      };

      await searchProducts(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when user not found', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      (databaseService.getDefaultUser as any).mockResolvedValue(null);

      const { searchProducts } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { query: 'laptop' };

      await searchProducts(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when agent fails', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Search failed'
      });

      const { searchProducts } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { query: 'laptop' };

      await searchProducts(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('searchByHobby', () => {
    it('should search by hobby successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { products: [] }
      });

      const { searchByHobby } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { 
        hobbies: ['gaming', 'photography'],
        query: 'accessories'
      };

      await searchByHobby(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when user not found', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      (databaseService.getDefaultUser as any).mockResolvedValue(null);

      const { searchByHobby } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { hobbies: ['gaming'] };

      await searchByHobby(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getDeals', () => {
    it('should return deals', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { deals: [{ id: 'deal-1' }] }
      });

      const { getDeals } = await import('../../src/controllers/shoppingController');

      await getDeals(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle filters', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');

      const { getDeals } = await import('../../src/controllers/shoppingController');
      
      mockReq.query = {
        source: 'amazon',
        category: 'electronics',
        minPrice: '100',
        maxPrice: '500',
        minDealScore: '80'
      };

      await getDeals(mockReq as Request, mockRes as Response);

      expect(shoppingAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'get-deals',
          filters: expect.objectContaining({
            source: 'amazon',
            category: 'electronics'
          })
        })
      );
    });
  });

  describe('saveProduct', () => {
    it('should save product successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true
      });

      const { saveProduct } = await import('../../src/controllers/shoppingController');
      
      mockReq.params = { id: 'prod-1' };
      mockReq.body = {};

      await saveProduct(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 when user not found', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      (databaseService.getDefaultUser as any).mockResolvedValue(null);

      const { saveProduct } = await import('../../src/controllers/shoppingController');
      
      mockReq.params = { id: 'prod-1' };
      mockReq.body = {};

      await saveProduct(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('unsaveProduct', () => {
    it('should unsave product successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true
      });

      const { unsaveProduct } = await import('../../src/controllers/shoppingController');
      
      mockReq.params = { id: 'prod-1' };
      mockReq.body = {};

      await unsaveProduct(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getSavedProducts', () => {
    it('should return saved products', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { products: [{ id: 'prod-1' }] }
      });

      const { getSavedProducts } = await import('../../src/controllers/shoppingController');

      await getSavedProducts(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('setPriceAlert', () => {
    it('should set price alert successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true
      });

      const { setPriceAlert } = await import('../../src/controllers/shoppingController');
      
      mockReq.params = { id: 'prod-1' };
      mockReq.body = { targetPrice: 500 };

      await setPriceAlert(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getPriceAlerts', () => {
    it('should return price alerts', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { alerts: [] }
      });

      const { getPriceAlerts } = await import('../../src/controllers/shoppingController');

      await getPriceAlerts(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('updateInterests', () => {
    it('should update interests successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true
      });

      const { updateInterests } = await import('../../src/controllers/shoppingController');
      
      mockReq.body = { interests: ['electronics', 'gaming'] };

      await updateInterests(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getSuggestions', () => {
    it('should return AI suggestions', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');
      (shoppingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { suggestions: [] }
      });

      const { getSuggestions } = await import('../../src/controllers/shoppingController');

      await getSuggestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('stopSearch', () => {
    it('should stop search successfully', async () => {
      const { shoppingAgent } = await import('../../src/agents/ShoppingAgent');

      const { stopSearch } = await import('../../src/controllers/shoppingController');

      await stopSearch(mockReq as Request, mockRes as Response);

      expect(shoppingAgent.stop).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ success: true, message: 'Search stopped' });
    });
  });
});

