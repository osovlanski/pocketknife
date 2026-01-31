/**
 * Cooking Controller - Rami Levy Endpoints Tests
 *
 * Tests for Rami Levy integration API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as cookingController from '../../src/controllers/cookingController';

// Mock dependencies
vi.mock('../../src/agents', () => ({
  cookingAgent: {
    execute: vi.fn()
  }
}));

vi.mock('../../src/utils/controllerHelpers', () => ({
  getUserIdFromRequest: vi.fn()
}));

describe('Cooking Controller - Rami Levy Endpoints', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockCookingAgent: any;
  let mockGetUserId: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    // Get mocked modules
    const agents = await import('../../src/agents');
    mockCookingAgent = agents.cookingAgent;

    const helpers = await import('../../src/utils/controllerHelpers');
    mockGetUserId = helpers.getUserIdFromRequest;
  });

  describe('ramiLevySetup', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 400 when apiKey is missing', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { cookie: 'some-cookie' };

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('API key')
        })
      );
    });

    it('should return 400 when apiKey is invalid JWT format', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = {
        apiKey: 'not-a-jwt',
        cookie: 'session=abc; token=xyz'
      };

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('JWT token')
        })
      );
    });

    it('should return 400 when cookie is missing', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = {
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      };

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Cookie')
        })
      );
    });

    it('should return 400 when cookie is invalid format', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = {
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
        cookie: 'invalid'
      };

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('cookie format')
        })
      );
    });

    it('should call agent with valid tokens', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = {
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
        cookie: 'session=abc123; token=xyz789',
        ecomToken: 'ecom-token-value'
      };

      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { ramiLevyStatus: { isValid: true } }
      });

      await cookingController.ramiLevySetup(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-setup',
        userId: 'user-123',
        ramiLevyTokens: {
          apiKey: mockReq.body.apiKey,
          ecomToken: 'ecom-token-value',
          cookie: mockReq.body.cookie
        },
        skipValidation: false
      });
      expect(mockRes.json).toHaveBeenCalledWith({ ramiLevyStatus: { isValid: true } });
    });
  });

  describe('ramiLevyStatus', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return status for authenticated user', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyStatus: { isValid: true, userId: 'user-123' },
          ramiLevyStores: [{ id: '331', name: 'Default' }]
        }
      });

      await cookingController.ramiLevyStatus(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-status',
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ramiLevyStatus: { isValid: true, userId: 'user-123' }
        })
      );
    });
  });

  describe('ramiLevySearch', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevySearch(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when query is missing', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.query = {};

      await cookingController.ramiLevySearch(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search query is required'
      });
    });

    it('should search products with query', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.query = { query: 'milk', storeId: '331' };
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyProducts: [{ id: 1, name: 'Milk' }],
          ramiLevySearchResult: { products: [], total: 1, query: 'milk' }
        }
      });

      await cookingController.ramiLevySearch(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-search',
        userId: 'user-123',
        searchQuery: 'milk',
        storeId: '331'
      });
    });
  });

  describe('ramiLevyAddToCart', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyAddToCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when productId is missing', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { quantity: 1 };

      await cookingController.ramiLevyAddToCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product ID is required'
      });
    });

    it('should return 400 when productId is not a positive integer', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { productId: -1, quantity: 1 };

      await cookingController.ramiLevyAddToCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product ID must be a positive integer'
      });
    });

    it('should return 400 when quantity is invalid', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { productId: 123, quantity: -1 };

      await cookingController.ramiLevyAddToCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Quantity must be a positive number'
      });
    });

    it('should add product to cart with valid data', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { productId: 123, quantity: 2, storeId: '331' };
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyCart: { items: [], totalPrice: 15.90, itemCount: 1 }
        }
      });

      await cookingController.ramiLevyAddToCart(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-add-to-cart',
        userId: 'user-123',
        productId: 123,
        quantity: 2,
        storeId: '331'
      });
    });
  });

  describe('ramiLevyRemoveFromCart', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyRemoveFromCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should remove products from cart', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { productIds: [123, 456] };
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { ramiLevyCart: { items: [], totalPrice: 0, itemCount: 0 } }
      });

      await cookingController.ramiLevyRemoveFromCart(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-remove-from-cart',
        userId: 'user-123',
        productIds: [123, 456],
        storeId: undefined
      });
    });
  });

  describe('ramiLevyUpdateQuantity', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyUpdateQuantity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should update product quantity', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = { productId: 123, quantity: 5 };
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { ramiLevyCart: { items: [], totalPrice: 39.50, itemCount: 1 } }
      });

      await cookingController.ramiLevyUpdateQuantity(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-update-quantity',
        userId: 'user-123',
        productId: 123,
        quantity: 5,
        storeId: undefined
      });
    });
  });

  describe('ramiLevyClearCart', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyClearCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should clear cart', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { ramiLevyCart: { items: [], totalPrice: 0, itemCount: 0 } }
      });

      await cookingController.ramiLevyClearCart(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-clear-cart',
        userId: 'user-123',
        storeId: undefined
      });
    });
  });

  describe('ramiLevyGetCart', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyGetCart(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should get current cart', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyCart: { items: [{ id: 1, name: 'Milk' }], totalPrice: 7.90, itemCount: 1 },
          ramiLevyCheckoutUrl: 'https://www.rami-levy.co.il/he/dashboard/checkout'
        }
      });

      await cookingController.ramiLevyGetCart(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-get-cart',
        userId: 'user-123'
      });
    });
  });

  describe('ramiLevyCheckout', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyCheckout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return checkout URL', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyCheckoutUrl: 'https://www.rami-levy.co.il/he/dashboard/checkout'
        }
      });

      await cookingController.ramiLevyCheckout(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-checkout',
        userId: 'user-123'
      });
    });
  });

  describe('ramiLevyOrderIngredients', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyOrderIngredients(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should order ingredients from recipe', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockReq.body = {
        ingredients: [
          { name: 'milk', quantity: 1 },
          { name: 'eggs', quantity: 6 }
        ],
        storeId: '331',
        autoSelectFirst: true
      };
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {
          ramiLevyOrder: {
            cart: { items: [], totalPrice: 25.00, itemCount: 2 },
            checkoutUrl: 'https://www.rami-levy.co.il/he/dashboard/checkout',
            matchedProducts: [],
            unmatchedIngredients: []
          }
        }
      });

      await cookingController.ramiLevyOrderIngredients(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-order-ingredients',
        userId: 'user-123',
        ingredients: [
          { name: 'milk', quantity: 1 },
          { name: 'eggs', quantity: 6 }
        ],
        storeId: '331',
        autoSelectFirst: true
      });
    });
  });

  describe('ramiLevyDeleteTokens', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      await cookingController.ramiLevyDeleteTokens(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should delete tokens', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { tokensDeleted: true }
      });

      await cookingController.ramiLevyDeleteTokens(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith({
        action: 'rami-levy-delete-tokens',
        userId: 'user-123'
      });
    });
  });
});
