/**
 * Cooking Controller Tests
 * 
 * Tests for the Cooking controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted for mocks
const { mockCookingAgent, mockGetUserIdFromRequest } = vi.hoisted(() => ({
  mockCookingAgent: {
    execute: vi.fn()
  },
  mockGetUserIdFromRequest: vi.fn()
}));

// Mock dependencies
vi.mock('../../src/agents', () => ({
  cookingAgent: mockCookingAgent
}));

vi.mock('../../src/utils/controllerHelpers', () => ({
  getUserIdFromRequest: mockGetUserIdFromRequest
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    api: vi.fn()
  }
}));

// Static import after mocks
import { addItem, updateItem, deleteItem, getItems, getLists, findRecipes, getSummary } from '../../src/controllers/cookingController';

describe('Cooking Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
      headers: { 'x-user-email': 'test@test.com' }
    };

    // Reset mock values to defaults
    mockGetUserIdFromRequest.mockResolvedValue('user-123');
    mockCookingAgent.execute.mockResolvedValue({
      success: true,
      data: {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addItem', () => {
    it('should add item successfully', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { item: { id: 'item-1', name: 'Milk' } }
      });

      mockReq.body = { name: 'Milk', quantity: 1 };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      mockReq.body = { name: 'Milk' };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 400 when agent fails', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: false,
        error: 'Name is required'
      });

      mockReq.body = { quantity: 1 };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { item: { id: 'item-1', name: 'Milk', quantity: 2 } }
      });

      mockReq.params = { id: 'item-1' };
      mockReq.body = { quantity: 2 };

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      mockReq.params = { id: 'item-1' };
      mockReq.body = { quantity: 2 };

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: {}
      });

      mockReq.params = { id: 'item-1' };

      await deleteItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      mockReq.params = { id: 'item-1' };

      await deleteItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getItems', () => {
    it('should return items successfully', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { items: [{ id: 'item-1', name: 'Milk' }] }
      });

      await getItems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      await getItems(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should filter by category', async () => {
      mockReq.query = { category: 'dairy' };

      await getItems(mockReq as Request, mockRes as Response);

      expect(mockCookingAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'get-items'
        })
      );
    });
  });

  describe('getLists', () => {
    it('should return shopping lists', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { lists: [{ id: 'list-1', name: 'Weekly' }] }
      });

      await getLists(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      await getLists(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('findRecipes', () => {
    it('should find recipes successfully', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { recipes: [{ id: 'recipe-1', title: 'Pasta' }] }
      });

      mockReq.query = { q: 'pasta' };

      await findRecipes(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      mockReq.query = { q: 'pasta' };

      await findRecipes(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getSummary', () => {
    it('should return summary', async () => {
      mockCookingAgent.execute.mockResolvedValue({
        success: true,
        data: { 
          totalItems: 10,
          expiringItems: 2,
          lowStockItems: 3,
          categories: { dairy: 5, produce: 5 }
        }
      });

      await getSummary(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null);

      await getSummary(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });
});
