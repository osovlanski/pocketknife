/**
 * Cooking Controller Tests
 * 
 * Tests for the Cooking controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents', () => ({
  cookingAgent: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    })
  }
}));

vi.mock('../../src/utils/controllerHelpers', () => ({
  getUserIdFromRequest: vi.fn().mockResolvedValue('user-123')
}));

describe('Cooking Controller', () => {
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
      headers: { 'x-user-email': 'test@test.com' }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addItem', () => {
    it('should add item successfully', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { item: { id: 'item-1', name: 'Milk' } }
      });

      const { addItem } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { name: 'Milk', quantity: 1 };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { addItem } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { name: 'Milk' };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 400 when agent returns error', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Invalid item data'
      });

      const { addItem } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { name: '' };

      await addItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { item: { id: 'item-1', name: 'Milk', quantity: 2 } }
      });

      const { updateItem } = await import('../../src/controllers/cookingController');
      
      mockReq.params = { id: 'item-1' };
      mockReq.body = { quantity: 2 };

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { updateItem } = await import('../../src/controllers/cookingController');
      
      mockReq.params = { id: 'item-1' };
      mockReq.body = { quantity: 2 };

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true
      });

      const { deleteItem } = await import('../../src/controllers/cookingController');
      
      mockReq.params = { id: 'item-1' };

      await deleteItem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getItems', () => {
    it('should return items', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { items: [{ id: 'item-1', name: 'Milk' }] }
      });

      const { getItems } = await import('../../src/controllers/cookingController');

      await getItems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle filter parameters', async () => {
      const { cookingAgent } = await import('../../src/agents');

      const { getItems } = await import('../../src/controllers/cookingController');
      
      mockReq.query = {
        status: 'available',
        category: 'dairy',
        expiringWithinDays: '7',
        lowStock: 'true'
      };

      await getItems(mockReq as Request, mockRes as Response);

      expect(cookingAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'get-items',
          filters: expect.objectContaining({
            status: 'available',
            category: 'dairy',
            expiringWithinDays: 7,
            lowStock: true
          })
        })
      );
    });
  });

  describe('getExpiringItems', () => {
    it('should return expiring items', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { items: [{ id: 'item-1', name: 'Milk', expiresAt: new Date() }] }
      });

      const { getExpiringItems } = await import('../../src/controllers/cookingController');

      await getExpiringItems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { items: [{ id: 'item-1', name: 'Eggs', quantity: 2 }] }
      });

      const { getLowStockItems } = await import('../../src/controllers/cookingController');

      await getLowStockItems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('createList', () => {
    it('should create shopping list', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { list: { id: 'list-1', name: 'Weekly Shopping' } }
      });

      const { createList } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { name: 'Weekly Shopping', description: 'For the week' };

      await createList(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getLists', () => {
    it('should return shopping lists', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { lists: [{ id: 'list-1', name: 'Weekly Shopping' }] }
      });

      const { getLists } = await import('../../src/controllers/cookingController');

      await getLists(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('findRecipes', () => {
    it('should find recipes based on ingredients', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { recipes: [{ id: 'recipe-1', name: 'Pasta' }] }
      });

      const { findRecipes } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { ingredients: ['pasta', 'tomato'], mealType: 'dinner' };

      await findRecipes(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('saveRecipe', () => {
    it('should save recipe successfully', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { savedRecipe: { id: 'saved-1' } }
      });

      const { saveRecipe } = await import('../../src/controllers/cookingController');
      
      mockReq.body = { recipe: { name: 'Pasta' }, notes: 'Family favorite' };

      await saveRecipe(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSavedRecipes', () => {
    it('should return saved recipes', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { recipes: [{ id: 'saved-1', name: 'Pasta' }] }
      });

      const { getSavedRecipes } = await import('../../src/controllers/cookingController');

      await getSavedRecipes(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('should return inventory summary', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          totalItems: 50,
          expiringItems: 5,
          lowStockItems: 10
        }
      });

      const { getSummary } = await import('../../src/controllers/cookingController');

      await getSummary(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSuggestions', () => {
    it('should return shopping suggestions', async () => {
      const { cookingAgent } = await import('../../src/agents');
      (cookingAgent.execute as any).mockResolvedValue({
        success: true,
        data: { suggestions: ['Milk', 'Eggs', 'Bread'] }
      });

      const { getSuggestions } = await import('../../src/controllers/cookingController');

      await getSuggestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });
});

