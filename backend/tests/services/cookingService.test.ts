/**
 * Cooking Service Tests
 * 
 * Tests for kitchen inventory management, shopping lists, and recipes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for Prisma mocks
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    groceryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn()
    },
    groceryList: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    groceryListItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    savedRecipe: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    }
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma)
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocks
import { cookingService, COOKING_CATEGORIES } from '../../src/services/cooking/cookingService';

describe('CookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks to defaults
    mockPrisma.groceryItem.findMany.mockResolvedValue([]);
    mockPrisma.groceryItem.findUnique.mockResolvedValue(null);
    mockPrisma.groceryItem.create.mockResolvedValue({ id: 'item-1', name: 'Milk', category: 'dairy' });
    mockPrisma.groceryItem.update.mockResolvedValue({});
    mockPrisma.groceryItem.delete.mockResolvedValue({});
    mockPrisma.groceryItem.upsert.mockResolvedValue({ id: 'item-1' });
    mockPrisma.groceryItem.count.mockResolvedValue(0);
    
    mockPrisma.groceryList.findMany.mockResolvedValue([]);
    mockPrisma.groceryList.create.mockResolvedValue({ id: 'list-1' });
    mockPrisma.groceryList.update.mockResolvedValue({});
    
    mockPrisma.groceryListItem.findMany.mockResolvedValue([]);
    mockPrisma.groceryListItem.create.mockResolvedValue({ id: 'list-item-1' });
    
    mockPrisma.savedRecipe.findMany.mockResolvedValue([]);
    mockPrisma.savedRecipe.create.mockResolvedValue({ id: 'recipe-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('COOKING_CATEGORIES', () => {
    it('should export valid cooking categories', () => {
      expect(COOKING_CATEGORIES).toBeInstanceOf(Array);
      expect(COOKING_CATEGORIES.length).toBeGreaterThan(0);
      expect(COOKING_CATEGORIES).toContain('produce');
      expect(COOKING_CATEGORIES).toContain('dairy');
      expect(COOKING_CATEGORIES).toContain('meat');
      expect(COOKING_CATEGORIES).toContain('pantry');
    });
  });

  describe('cookingService.getCategories', () => {
    it('should return cooking categories', () => {
      const categories = cookingService.getCategories();
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('dairy');
    });
  });

  describe('cookingService.getItems', () => {
    it('should return items for a user', async () => {
      mockPrisma.groceryItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Milk', category: 'dairy' }
      ]);
      
      const items = await cookingService.getItems('user-123');
      expect(Array.isArray(items)).toBe(true);
    });

    it('should return empty array when no items', async () => {
      mockPrisma.groceryItem.findMany.mockResolvedValue([]);
      
      const items = await cookingService.getItems('user-123');
      expect(items).toEqual([]);
    });

    it('should accept filters', async () => {
      const items = await cookingService.getItems('user-123', { category: 'dairy' });
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('cookingService.getLists', () => {
    it('should return shopping lists', async () => {
      mockPrisma.groceryList.findMany.mockResolvedValue([
        { id: 'list-1', name: 'Weekly Shopping' }
      ]);
      
      const lists = await cookingService.getLists('user-123');
      expect(Array.isArray(lists)).toBe(true);
    });

    it('should return empty array when no lists', async () => {
      const lists = await cookingService.getLists('user-123');
      expect(lists).toEqual([]);
    });
  });

  describe('cookingService.getInventorySummary', () => {
    it('should return inventory summary', async () => {
      mockPrisma.groceryItem.findMany.mockResolvedValue([]);
      mockPrisma.groceryItem.count.mockResolvedValue(5);
      
      const summary = await cookingService.getInventorySummary('user-123');
      
      expect(summary).toHaveProperty('totalItems');
      expect(summary).toHaveProperty('expiringItems');
      expect(summary).toHaveProperty('lowStockItems');
      expect(summary).toHaveProperty('categories');
    });

    it('should return empty summary when no items', async () => {
      mockPrisma.groceryItem.findMany.mockResolvedValue([]);
      mockPrisma.groceryItem.count.mockResolvedValue(0);
      
      const summary = await cookingService.getInventorySummary('user-123');
      expect(summary.totalItems).toBe(0);
    });
  });

  describe('cookingService.getSuggestions', () => {
    it('should return suggestions array', async () => {
      const suggestions = await cookingService.getSuggestions('user-123');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('cookingService.processInvoiceItems', () => {
    it('should return processing result', async () => {
      const result = await cookingService.processInvoiceItems(
        'invoice-123',
        new Date(),
        'Store',
        []
      );
      
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('matched');
      expect(result).toHaveProperty('created');
    });
  });

  describe('cookingService.matchInvoiceItems', () => {
    it('should return matching result', async () => {
      const result = await cookingService.matchInvoiceItems('user-123', 'invoice-123');
      
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('matched');
      expect(result).toHaveProperty('created');
    });
  });

  describe('cookingService.getSavedRecipes', () => {
    it('should return saved recipes', async () => {
      mockPrisma.savedRecipe.findMany.mockResolvedValue([
        { id: 'recipe-1', title: 'Pasta' }
      ]);
      
      const recipes = await cookingService.getSavedRecipes('user-123');
      expect(Array.isArray(recipes)).toBe(true);
    });

    it('should return empty array when no recipes', async () => {
      const recipes = await cookingService.getSavedRecipes('user-123');
      expect(recipes).toEqual([]);
    });
  });

  describe('cookingService.deleteItem', () => {
    it('should delete an item', async () => {
      mockPrisma.groceryItem.delete.mockResolvedValue({ id: 'item-123' });
      
      await expect(cookingService.deleteItem('user-123', 'item-123'))
        .resolves
        .not.toThrow();
    });
  });

  describe('cookingService.addItem', () => {
    it('should add a new item', async () => {
      mockPrisma.groceryItem.create.mockResolvedValue({
        id: 'item-1',
        name: 'Milk',
        category: 'dairy'
      });
      
      const item = await cookingService.addItem('user-123', {
        name: 'Milk',
        category: 'dairy'
      });
      
      expect(item).toBeDefined();
      expect(item.id).toBe('item-1');
    });
  });

  describe('cookingService.updateItem', () => {
    it('should update an item', async () => {
      mockPrisma.groceryItem.update.mockResolvedValue({
        id: 'item-1',
        name: 'Updated Milk',
        quantity: 2
      });
      
      const item = await cookingService.updateItem('user-123', 'item-1', {
        quantity: 2
      });
      
      expect(item).toBeDefined();
    });
  });
});
