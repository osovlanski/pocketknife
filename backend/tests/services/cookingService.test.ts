/**
 * Cooking Service Tests
 * 
 * Tests for kitchen inventory management, shopping lists, and recipes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database service
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn(() => true),
    getOrCreateUser: vi.fn()
  }
}));

// Mock the cache service
vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve())
  },
  cacheKeys: {
    cookingItems: (userId: string) => `cooking:${userId}:items`
  }
}));

// Mock the config service
vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

// Mock Claude service
vi.mock('../../src/services/core/claudeService', () => ({
  default: {
    generateText: vi.fn(() => Promise.resolve('{"recipes": []}'))
  }
}));

describe('CookingService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('COOKING_CATEGORIES', () => {
    it('should export valid cooking categories', async () => {
      const { COOKING_CATEGORIES } = await import('../../src/services/cooking/cookingService');
      
      expect(COOKING_CATEGORIES).toBeInstanceOf(Array);
      expect(COOKING_CATEGORIES.length).toBeGreaterThan(0);
      expect(COOKING_CATEGORIES).toContain('produce');
      expect(COOKING_CATEGORIES).toContain('dairy');
      expect(COOKING_CATEGORIES).toContain('meat');
      expect(COOKING_CATEGORIES).toContain('pantry');
    });
  });

  describe('cookingService.addItem', () => {
    it('should throw error when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      await expect(cookingService.addItem('user-123', { name: 'Milk' }))
        .rejects
        .toThrow('Database not available');
    });

    it('should create a new item when it does not exist', async () => {
      const mockItem = {
        id: 'item-123',
        userId: 'user-123',
        name: 'Milk',
        category: 'dairy',
        quantity: 1,
        status: 'available'
      };

      const mockPrisma = {
        groceryItem: {
          findFirst: vi.fn(() => Promise.resolve(null)),
          create: vi.fn(() => Promise.resolve(mockItem))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.addItem('user-123', {
        name: 'Milk',
        category: 'dairy',
        quantity: 1
      });

      expect(result).toEqual(mockItem);
      expect(mockPrisma.groceryItem.create).toHaveBeenCalled();
    });

    it('should update existing item when duplicate is found', async () => {
      const existingItem = {
        id: 'item-123',
        userId: 'user-123',
        name: 'Milk',
        brand: null,
        quantity: 2,
        lastPurchasePrice: 5.99
      };

      const updatedItem = {
        ...existingItem,
        quantity: 3,
        status: 'available'
      };

      const mockPrisma = {
        groceryItem: {
          findFirst: vi.fn(() => Promise.resolve(existingItem)),
          update: vi.fn(() => Promise.resolve(updatedItem))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.addItem('user-123', {
        name: 'Milk',
        quantity: 1
      });

      expect(result.quantity).toBe(3);
      expect(mockPrisma.groceryItem.update).toHaveBeenCalled();
    });
  });

  describe('cookingService.getItems', () => {
    it('should throw error when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      await expect(cookingService.getItems('user-123'))
        .rejects
        .toThrow('Database not available');
    });

    it('should return items for user', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Milk', category: 'dairy' },
        { id: 'item-2', name: 'Bread', category: 'bakery' }
      ];

      const mockPrisma = {
        groceryItem: {
          findMany: vi.fn(() => Promise.resolve(mockItems))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.getItems('user-123');

      expect(result).toEqual(mockItems);
      expect(mockPrisma.groceryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' }
        })
      );
    });

    it('should filter by category', async () => {
      const mockPrisma = {
        groceryItem: {
          findMany: vi.fn(() => Promise.resolve([]))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      await cookingService.getItems('user-123', { category: 'dairy' });

      expect(mockPrisma.groceryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'dairy' })
        })
      );
    });

    it('should filter by status', async () => {
      const mockPrisma = {
        groceryItem: {
          findMany: vi.fn(() => Promise.resolve([]))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      await cookingService.getItems('user-123', { status: 'low' });

      expect(mockPrisma.groceryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'low' })
        })
      );
    });
  });

  describe('cookingService.deleteItem', () => {
    it('should delete item successfully', async () => {
      const mockPrisma = {
        groceryItem: {
          delete: vi.fn(() => Promise.resolve({ id: 'item-123' }))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      await cookingService.deleteItem('user-123', 'item-123');

      expect(mockPrisma.groceryItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123', userId: 'user-123' }
      });
    });
  });

  describe('cookingService.createList', () => {
    it('should create a new shopping list', async () => {
      const mockList = {
        id: 'list-123',
        userId: 'user-123',
        name: 'Weekly Shopping',
        listType: 'shopping',
        items: []
      };

      const mockPrisma = {
        groceryList: {
          create: vi.fn(() => Promise.resolve(mockList))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.createList('user-123', 'Weekly Shopping');

      expect(result).toEqual(mockList);
      expect(mockPrisma.groceryList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            name: 'Weekly Shopping',
            listType: 'shopping'
          })
        })
      );
    });
  });

  describe('cookingService.getLists', () => {
    it('should return active lists for user', async () => {
      const mockLists = [
        { id: 'list-1', name: 'Weekly Shopping', items: [] },
        { id: 'list-2', name: 'Party Supplies', items: [] }
      ];

      const mockPrisma = {
        groceryList: {
          findMany: vi.fn(() => Promise.resolve(mockLists))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.getLists('user-123');

      expect(result).toEqual(mockLists);
      expect(mockPrisma.groceryList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            status: { not: 'completed' }
          })
        })
      );
    });
  });

  describe('cookingService.getInventorySummary', () => {
    it('should return correct inventory summary', async () => {
      const mockItems = [
        { id: 'item-1', category: 'dairy', quantity: 2, expiryDate: null, lastPurchasePrice: 5.99 },
        { id: 'item-2', category: 'dairy', quantity: 1, expiryDate: null, lastPurchasePrice: 3.49 },
        { id: 'item-3', category: 'produce', quantity: 5, expiryDate: null, lastPurchasePrice: 2.00 }
      ];

      const mockPrisma = {
        groceryItem: {
          findMany: vi.fn(() => Promise.resolve(mockItems))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.getInventorySummary('user-123');

      expect(result.totalItems).toBe(3);
      expect(result.byCategory).toEqual({ dairy: 2, produce: 1 });
      expect(result.totalValue).toBeGreaterThan(0);
    });
  });

  describe('cookingService.getSuggestions', () => {
    it('should return low stock items as suggestions', async () => {
      const mockItems = [
        { name: 'Milk' },
        { name: 'Eggs' }
      ];

      const mockPrisma = {
        groceryItem: {
          findMany: vi.fn(() => Promise.resolve(mockItems))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.getSuggestions('user-123');

      expect(result).toEqual(['Milk', 'Eggs']);
    });
  });

  describe('cookingService.wishlist', () => {
    it('should add to wishlist', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        title: 'Pasta Carbonara',
        isFavorite: true
      };

      const mockPrisma = {
        savedRecipe: {
          create: vi.fn(() => Promise.resolve(mockRecipe))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.addToWishlist('user-123', {
        id: 'search-123',
        title: 'Pasta Carbonara',
        source: 'ai_generated',
        ingredients: []
      });

      expect(result).toEqual(mockRecipe);
      expect(mockPrisma.savedRecipe.create).toHaveBeenCalled();
    });

    it('should get wishlist', async () => {
      const mockRecipes = [
        { id: 'recipe-1', title: 'Pasta', isFavorite: true },
        { id: 'recipe-2', title: 'Pizza', isFavorite: true }
      ];

      const mockPrisma = {
        savedRecipe: {
          findMany: vi.fn(() => Promise.resolve(mockRecipes))
        }
      };

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(mockPrisma);
      
      const { cookingService } = await import('../../src/services/cooking/cookingService');
      
      const result = await cookingService.getWishlist('user-123');

      expect(result).toEqual(mockRecipes);
      expect(mockPrisma.savedRecipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            isFavorite: true
          })
        })
      );
    });
  });
});
