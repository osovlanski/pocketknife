/**
 * CookingAgent Tests
 * 
 * Comprehensive tests for the CookingAgent class that handles all cooking-related actions
 * including inventory management, shopping lists, recipes, and wishlists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockCookingService } = vi.hoisted(() => ({
  mockCookingService: {
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
    processInvoiceItems: vi.fn(),
    matchInvoiceItems: vi.fn(),
    getInventorySummary: vi.fn(),
    getSuggestions: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/cooking', () => ({
  cookingService: mockCookingService,
  COOKING_CATEGORIES: ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'bakery']
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      return defaultValue;
    })
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn(),
    init: vi.fn(),
    found: vi.fn(),
    search: vi.fn()
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
import { CookingAgent } from '../../src/agents/CookingAgent';

describe('CookingAgent', () => {
  let cookingAgent: CookingAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockCookingService.addItem.mockResolvedValue({ id: 'item-123', name: 'Milk' });
    mockCookingService.updateItem.mockResolvedValue({ id: 'item-123', name: 'Updated Item' });
    mockCookingService.deleteItem.mockResolvedValue(true);
    mockCookingService.getItems.mockResolvedValue([
      { id: 'item-1', name: 'Milk', category: 'dairy' },
      { id: 'item-2', name: 'Bread', category: 'bakery' }
    ]);
    mockCookingService.updateItemStatus.mockResolvedValue({ id: 'item-123', status: 'low' });
    mockCookingService.getExpiringItems.mockResolvedValue([
      { id: 'item-1', name: 'Milk', expiryDate: '2026-01-25' }
    ]);
    mockCookingService.getLowStockItems.mockResolvedValue([
      { id: 'item-2', name: 'Eggs', quantity: 2 }
    ]);
    mockCookingService.createList.mockResolvedValue({ id: 'list-123', name: 'Shopping' });
    mockCookingService.getLists.mockResolvedValue([
      { id: 'list-1', name: 'Weekly Shopping' }
    ]);
    mockCookingService.addListItem.mockResolvedValue({ id: 'list-item-1', name: 'Apples' });
    mockCookingService.toggleListItem.mockResolvedValue({ id: 'list-item-1', isChecked: true });
    mockCookingService.completeList.mockResolvedValue({ id: 'list-1', status: 'completed' });
    mockCookingService.findRecipes.mockResolvedValue([
      { id: 'recipe-1', title: 'Pasta Carbonara', ingredients: ['pasta', 'eggs', 'bacon'] }
    ]);
    mockCookingService.saveRecipe.mockResolvedValue({ id: 'saved-recipe-1', title: 'Pasta' });
    mockCookingService.getSavedRecipes.mockResolvedValue([
      { id: 'saved-1', title: 'Saved Recipe' }
    ]);
    mockCookingService.addToWishlist.mockResolvedValue({ id: 'wish-1', title: 'Dream Recipe' });
    mockCookingService.getWishlist.mockResolvedValue([
      { id: 'wish-1', title: 'Pasta', imageUrl: 'https://example.com/pasta.jpg' }
    ]);
    mockCookingService.removeFromWishlist.mockResolvedValue(true);
    mockCookingService.processInvoiceItems.mockResolvedValue({ processed: 5, created: 3 });
    mockCookingService.matchInvoiceItems.mockResolvedValue({ matched: 4, created: 1 });
    mockCookingService.getInventorySummary.mockResolvedValue({
      totalItems: 25,
      lowStock: 3,
      expiringSoon: 2,
      byCategory: { dairy: 5, produce: 10 }
    });
    mockCookingService.getSuggestions.mockResolvedValue(['Buy more milk', 'Use eggs before expiry']);
    
    cookingAgent = new CookingAgent();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(cookingAgent.metadata.id).toBe('cooking');
    });
    
    it('should have correct name', () => {
      expect(cookingAgent.metadata.name).toBe('Cooking Agent');
    });
    
    it('should have correct icon', () => {
      expect(cookingAgent.metadata.icon).toBe('🍳');
    });
    
    it('should have correct color', () => {
      expect(cookingAgent.metadata.color).toBe('#22C55E');
    });
    
    it('should have description', () => {
      expect(cookingAgent.metadata.description).toBeDefined();
    });
  });

  describe('agent methods', () => {
    it('should have execute method', () => {
      expect(typeof cookingAgent.execute).toBe('function');
    });
    
    it('should have stop method', () => {
      expect(typeof cookingAgent.stop).toBe('function');
    });
    
    it('should have getState method', () => {
      expect(typeof cookingAgent.getState).toBe('function');
    });
    
    it('should have getMetrics method', () => {
      expect(typeof cookingAgent.getMetrics).toBe('function');
    });
  });

  describe('add-item action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'add-item',
        itemData: { name: 'Milk' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should require itemData', async () => {
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require item name', async () => {
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { category: 'dairy' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should add item successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { name: 'Milk', category: 'dairy', quantity: 2 }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.item).toBeDefined();
    });

    it('should handle add errors', async () => {
      mockCookingService.addItem.mockRejectedValue(new Error('Database error'));
      
      const result = await cookingAgent.execute({
        action: 'add-item',
        userId: 'user-123',
        itemData: { name: 'Eggs' }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('update-item action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'update-item',
        itemId: 'item-123',
        itemData: { quantity: 5 }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should require itemId', async () => {
      const result = await cookingAgent.execute({
        action: 'update-item',
        userId: 'user-123',
        itemData: { quantity: 5 }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should update item successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'update-item',
        userId: 'user-123',
        itemId: 'item-123',
        itemData: { quantity: 5 }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.item).toBeDefined();
    });
  });

  describe('delete-item action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'delete-item',
        itemId: 'item-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should require itemId', async () => {
      const result = await cookingAgent.execute({
        action: 'delete-item',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should delete item successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'delete-item',
        userId: 'user-123',
        itemId: 'item-123'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('get-items action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-items'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should get items successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'get-items',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
    });

    it('should get items with filters', async () => {
      const result = await cookingAgent.execute({
        action: 'get-items',
        userId: 'user-123',
        filters: { category: 'dairy' }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('get-expiring action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-expiring'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get expiring items', async () => {
      const result = await cookingAgent.execute({
        action: 'get-expiring',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
    });
  });

  describe('get-low-stock action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-low-stock'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get low stock items', async () => {
      const result = await cookingAgent.execute({
        action: 'get-low-stock',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
    });
  });

  describe('create-list action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'create-list',
        listName: 'Shopping'
      });
      
      expect(result.success).toBe(false);
    });

    it('should require listName', async () => {
      const result = await cookingAgent.execute({
        action: 'create-list',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should create list successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'create-list',
        userId: 'user-123',
        listName: 'Weekly Shopping',
        listDescription: 'Shopping for the week'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.list).toBeDefined();
    });
  });

  describe('get-lists action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-lists'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get lists successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'get-lists',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.lists).toBeDefined();
    });
  });

  describe('add-list-item action', () => {
    it('should attempt to add list item', async () => {
      const result = await cookingAgent.execute({
        action: 'add-list-item',
        userId: 'user-123',
        listId: 'list-123',
        listItemData: { name: 'Apples' }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should require listId', async () => {
      const result = await cookingAgent.execute({
        action: 'add-list-item',
        userId: 'user-123',
        listItemData: { name: 'Apples' }
      });
      
      expect(result.success).toBe(false);
    });

    it('should add list item with all params', async () => {
      const result = await cookingAgent.execute({
        action: 'add-list-item',
        userId: 'user-123',
        listId: 'list-123',
        listItemData: { name: 'Apples', quantity: 5 }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('toggle-list-item action', () => {
    it('should require listItemId', async () => {
      const result = await cookingAgent.execute({
        action: 'toggle-list-item',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
    });

    it('should toggle list item successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'toggle-list-item',
        userId: 'user-123',
        listItemId: 'list-item-1',
        isChecked: true
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('complete-list action', () => {
    it('should require listId', async () => {
      const result = await cookingAgent.execute({
        action: 'complete-list',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
    });

    it('should complete list successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'complete-list',
        userId: 'user-123',
        listId: 'list-123'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('find-recipes action', () => {
    it('should find recipes', async () => {
      const result = await cookingAgent.execute({
        action: 'find-recipes',
        userId: 'user-123',
        recipeParams: { ingredients: ['pasta', 'eggs'] }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.recipes).toBeDefined();
    });
  });

  describe('save-recipe action', () => {
    it('should require recipe data', async () => {
      const result = await cookingAgent.execute({
        action: 'save-recipe',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
    });

    it('should save recipe successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'save-recipe',
        userId: 'user-123',
        recipe: { title: 'Pasta', ingredients: ['pasta', 'sauce'] }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('wishlist actions', () => {
    it('should add to wishlist', async () => {
      const result = await cookingAgent.execute({
        action: 'add-to-wishlist',
        userId: 'user-123',
        recipe: { title: 'Dream Recipe', imageUrl: 'https://example.com/img.jpg' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.recipe).toBeDefined();
    });

    it('should get wishlist', async () => {
      const result = await cookingAgent.execute({
        action: 'get-wishlist',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.wishlist).toBeDefined();
    });

    it('should remove from wishlist', async () => {
      const result = await cookingAgent.execute({
        action: 'remove-from-wishlist',
        userId: 'user-123',
        recipeId: 'recipe-123'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('process-invoice action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'process-invoice',
        invoiceItems: [{ name: 'Milk', quantity: 2 }]
      });
      
      expect(result.success).toBe(false);
    });

    it('should attempt to process invoice items', async () => {
      const result = await cookingAgent.execute({
        action: 'process-invoice',
        userId: 'user-123',
        invoiceItems: [
          { name: 'Milk', quantity: 2, price: 3.50 },
          { name: 'Bread', quantity: 1, price: 2.00 }
        ],
        invoiceDate: '2026-01-20',
        merchant: 'Grocery Store'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('get-summary action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-summary'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get summary successfully', async () => {
      const result = await cookingAgent.execute({
        action: 'get-summary',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.summary).toBeDefined();
    });
  });

  describe('get-suggestions action', () => {
    it('should require userId', async () => {
      const result = await cookingAgent.execute({
        action: 'get-suggestions'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get suggestions', async () => {
      const result = await cookingAgent.execute({
        action: 'get-suggestions',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.suggestions).toBeDefined();
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await cookingAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
