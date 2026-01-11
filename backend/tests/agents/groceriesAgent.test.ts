/**
 * Groceries Agent Tests
 * 
 * Tests for the GroceriesAgent class that handles all grocery-related actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the groceries service
vi.mock('../../src/services/groceries', () => ({
  groceriesService: {
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
    getInventorySummary: vi.fn(),
    getSuggestions: vi.fn()
  },
  GROCERY_CATEGORIES: ['produce', 'dairy', 'meat', 'pantry']
}));

describe('GroceriesAgent', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct agent metadata', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      expect(groceriesAgent.metadata).toBeDefined();
      expect(groceriesAgent.metadata.id).toBe('groceries');
      expect(groceriesAgent.metadata.name).toBe('Groceries Agent');
      expect(groceriesAgent.metadata.icon).toBe('🛒');
      expect(groceriesAgent.metadata.color).toBe('#22C55E');
    });
  });

  describe('execute - add-item action', () => {
    it('should require userId', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'add-item',
        itemData: { name: 'Milk' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require itemData', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'add-item',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item data is required');
    });

    it('should require item name', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { category: 'dairy' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item name is required');
    });

    it('should add item successfully', async () => {
      const { groceriesService } = await import('../../src/services/groceries');
      const mockItem = { id: 'item-123', name: 'Milk' };
      (groceriesService.addItem as any).mockResolvedValue(mockItem);
      
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
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
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'get-items'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should get items successfully', async () => {
      const { groceriesService } = await import('../../src/services/groceries');
      const mockItems = [{ id: 'item-1', name: 'Milk' }];
      (groceriesService.getItems as any).mockResolvedValue(mockItems);
      
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'get-items',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual(mockItems);
    });
  });

  describe('execute - delete-item action', () => {
    it('should require userId', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'delete-item',
        itemId: 'item-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require itemId', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'delete-item',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item ID is required');
    });
  });

  describe('execute - create-list action', () => {
    it('should require userId', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'create-list',
        listName: 'Shopping'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require list name', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'create-list',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('List name is required');
    });

    it('should create list successfully', async () => {
      const { groceriesService } = await import('../../src/services/groceries');
      const mockList = { id: 'list-123', name: 'Weekly Shopping' };
      (groceriesService.createList as any).mockResolvedValue(mockList);
      
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'create-list',
        userId: 'user-123',
        listName: 'Weekly Shopping'
      });

      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual(mockList);
    });
  });

  describe('execute - get-summary action', () => {
    it('should get summary successfully', async () => {
      const { groceriesService } = await import('../../src/services/groceries');
      const mockSummary = { totalItems: 10, lowStock: 2 };
      (groceriesService.getInventorySummary as any).mockResolvedValue(mockSummary);
      
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'get-summary',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.summary).toEqual(mockSummary);
    });
  });

  describe('execute - unknown action', () => {
    it('should return error for unknown action', async () => {
      const { groceriesAgent } = await import('../../src/agents/GroceriesAgent');
      
      const result = await groceriesAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

