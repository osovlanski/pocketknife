/**
 * Cooking Agent Tests
 * 
 * Tests for the CookingAgent class that handles all cooking-related actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the cooking service
vi.mock('../../src/services/cooking', () => ({
  cookingService: {
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    getItems: vi.fn(),
    updateItemStatus: vi.fn(),
    getExpiringItems: vi.fn(),
    getLowStockItems: vi.fn(),
    createList: vi.fn(),
    getLists: vi.fn(),
    addListItem: vi.fn(),
    toggleListItem: vi.fn(),
    completeList: vi.fn(),
    findRecipes: vi.fn(),
    saveRecipe: vi.fn(),
    getSavedRecipes: vi.fn(),
    addToWishlist: vi.fn(),
    getWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    getInventorySummary: vi.fn(),
    getSuggestions: vi.fn()
  },
  COOKING_CATEGORIES: ['produce', 'dairy', 'meat', 'pantry']
}));

describe('CookingAgent', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct agent metadata', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      expect(cookingAgent.metadata).toBeDefined();
      expect(cookingAgent.metadata.id).toBe('cooking');
      expect(cookingAgent.metadata.name).toBe('Cooking Agent');
      expect(cookingAgent.metadata.icon).toBe('🍳');
      expect(cookingAgent.metadata.color).toBe('#22C55E');
    }, 30000);
  });

  describe('execute - add-item action', () => {
    it('should require userId', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'add-item',
        itemData: { name: 'Milk' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require itemData', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item data is required');
    });

    it('should require item name', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { category: 'dairy' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item name is required');
    });

    it('should add item successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockItem = { id: 'item-123', name: 'Milk' };
      (cookingService.addItem as any).mockResolvedValue(mockItem);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { name: 'Milk', category: 'dairy' }
      });

      expect(result.success).toBe(true);
      expect(result.data?.item).toEqual(mockItem);
    });
  });

  describe('execute - get-items action', () => {
    it('should require userId', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'get-items'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should get items successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockItems = [{ id: 'item-1', name: 'Milk' }];
      (cookingService.getItems as any).mockResolvedValue(mockItems);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'get-items',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual(mockItems);
    });
  });

  describe('execute - delete-item action', () => {
    it('should require userId', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'delete-item',
        itemId: 'item-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require itemId', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'delete-item',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item ID is required');
    });
  });

  describe('execute - create-list action', () => {
    it('should require userId', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'create-list',
        listName: 'Shopping'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require list name', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'create-list',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('List name is required');
    });

    it('should create list successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockList = { id: 'list-123', name: 'Weekly Shopping' };
      (cookingService.createList as any).mockResolvedValue(mockList);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'create-list',
        userId: 'user-123',
        listName: 'Weekly Shopping'
      });

      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual(mockList);
    });
  });

  describe('execute - wishlist actions', () => {
    it('should add to wishlist successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockRecipe = { id: 'recipe-123', title: 'Pasta Carbonara', imageUrl: 'https://example.com/pasta.jpg' };
      (cookingService.addToWishlist as any).mockResolvedValue(mockRecipe);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'add-to-wishlist',
        userId: 'user-123',
        recipe: mockRecipe
      });

      expect(result.success).toBe(true);
      expect(result.data?.recipe).toEqual(mockRecipe);
    });

    it('should get wishlist successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockWishlist = [{ id: 'recipe-123', title: 'Pasta' }];
      (cookingService.getWishlist as any).mockResolvedValue(mockWishlist);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'get-wishlist',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.wishlist).toEqual(mockWishlist);
    });
  });

  describe('execute - get-summary action', () => {
    it('should get summary successfully', async () => {
      const { cookingService } = await import('../../src/services/cooking');
      const mockSummary = { totalItems: 10, lowStock: 2 };
      (cookingService.getInventorySummary as any).mockResolvedValue(mockSummary);
      
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'get-summary',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.summary).toEqual(mockSummary);
    });
  });

  describe('execute - unknown action', () => {
    it('should return error for unknown action', async () => {
      const { cookingAgent } = await import('../../src/agents/CookingAgent');
      
      const result = await cookingAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
