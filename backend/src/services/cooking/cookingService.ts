/**
 * Cooking Service
 * 
 * Service for cooking-related functionality including:
 * - Kitchen inventory management (GroceryItem)
 * - Shopping list management (GroceryList, GroceryListItem)
 * - Recipe management (SavedRecipe)
 */

import { getPrisma } from '../core/databaseService';

// Types
export interface CookingItemData {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string | Date;
  brand?: string;
  notes?: string;
  barcode?: string;
  lastPurchasePrice?: number;
  currency?: string;
}

export interface CookingFilters {
  category?: string;
  status?: string;
  expiringWithinDays?: number;
  lowStock?: boolean;
}

export interface RecipeSearchParams {
  query?: string;
  cuisine?: string;
  mealType?: string;
  dietaryRestrictions?: string[];
  maxPrepTime?: number;
  useAvailableOnly?: boolean;
  ingredients?: string[];
}

export interface RecipeResult {
  id: string;
  title: string;
  description?: string;
  ingredients: Array<{ name: string; quantity?: number; unit?: string; optional?: boolean }>;
  instructions?: string;
  cuisine?: string;
  mealType?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
}

export interface ShoppingListItemData {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface InventorySummary {
  totalItems: number;
  expiringItems: number;
  lowStockItems: number;
  categories: Record<string, number>;
}

export interface ProcessedInvoiceResult {
  processed: number;
  matched: number;
  created: number;
}

// Constants
export const COOKING_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'bakery',
  'pantry',
  'frozen',
  'beverages',
  'snacks',
  'condiments',
  'spices',
  'household',
  'personal_care',
  'other'
] as const;

// Service implementation
export const cookingService = {
  // ===========================================================================
  // INVENTORY MANAGEMENT
  // ===========================================================================
  
  addItem: async (userId: string, itemData: CookingItemData) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryItem.create({
      data: {
        userId,
        name: itemData.name,
        category: itemData.category || 'other',
        quantity: itemData.quantity || 1,
        unit: itemData.unit,
        expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate) : null,
        brand: itemData.brand,
        notes: itemData.notes,
        barcode: itemData.barcode,
        lastPurchasePrice: itemData.lastPurchasePrice,
        currency: itemData.currency || 'USD',
        status: 'available'
      }
    });

    return item;
  },
  
  updateItem: async (userId: string, itemId: string, data: Partial<CookingItemData>) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryItem.update({
      where: { id: itemId, userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.expiryDate !== undefined && { 
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null 
        }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.lastPurchasePrice !== undefined && { lastPurchasePrice: data.lastPurchasePrice }),
        ...(data.currency && { currency: data.currency })
      }
    });

    return item;
  },
  
  deleteItem: async (userId: string, itemId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    await prisma.groceryItem.delete({
      where: { id: itemId, userId }
    });
  },
  
  getItems: async (userId: string, filters?: CookingFilters) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const where: any = { userId };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.lowStock) {
      where.status = { in: ['low', 'out_of_stock'] };
    }

    if (filters?.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      where.expiryDate = {
        lte: futureDate,
        gte: new Date()
      };
    }

    const items = await prisma.groceryItem.findMany({
      where,
      orderBy: [
        { expiryDate: 'asc' },
        { name: 'asc' }
      ]
    });

    return items;
  },
  
  updateItemStatus: async (userId: string, itemId: string, status: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryItem.update({
      where: { id: itemId, userId },
      data: { status }
    });

    return item;
  },
  
  getExpiringItems: async (userId: string, days: number = 7) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const items = await prisma.groceryItem.findMany({
      where: {
        userId,
        expiryDate: {
          lte: futureDate,
          gte: new Date()
        },
        status: { not: 'expired' }
      },
      orderBy: { expiryDate: 'asc' }
    });

    return items;
  },
  
  getLowStockItems: async (userId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const items = await prisma.groceryItem.findMany({
      where: {
        userId,
        status: { in: ['low', 'out_of_stock'] }
      },
      orderBy: { name: 'asc' }
    });

    return items;
  },
  
  getInventorySummary: async (userId: string): Promise<InventorySummary> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const [items, expiringItems, lowStockItems] = await Promise.all([
      prisma.groceryItem.findMany({
        where: { userId },
        select: { category: true }
      }),
      prisma.groceryItem.count({
        where: {
          userId,
          expiryDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date()
          }
        }
      }),
      prisma.groceryItem.count({
        where: {
          userId,
          status: { in: ['low', 'out_of_stock'] }
        }
      })
    ]);

    const categories: Record<string, number> = {};
    for (const item of items) {
      const cat = item.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return {
      totalItems: items.length,
      expiringItems,
      lowStockItems,
      categories
    };
  },

  // ===========================================================================
  // SHOPPING LISTS
  // ===========================================================================
  
  createList: async (userId: string, name: string, description?: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const list = await prisma.groceryList.create({
      data: {
        userId,
        name,
        description,
        listType: 'shopping',
        status: 'active'
      },
      include: { items: true }
    });

    return list;
  },
  
  getLists: async (userId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const lists = await prisma.groceryList.findMany({
      where: { userId, status: 'active' },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return lists;
  },
  
  addListItem: async (listId: string, item: ShoppingListItemData) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const listItem = await prisma.groceryListItem.create({
      data: {
        listId,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit,
        category: item.category
      }
    });

    return listItem;
  },
  
  toggleListItem: async (listItemId: string, isChecked: boolean) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryListItem.update({
      where: { id: listItemId },
      data: {
        isChecked,
        checkedAt: isChecked ? new Date() : null
      }
    });

    return item;
  },
  
  completeList: async (userId: string, listId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const list = await prisma.groceryList.update({
      where: { id: listId, userId },
      data: {
        status: 'completed',
        completedAt: new Date()
      },
      include: { items: true }
    });

    return list;
  },

  // ===========================================================================
  // RECIPES
  // ===========================================================================
  
  findRecipes: async (userId: string, params?: RecipeSearchParams): Promise<RecipeResult[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // For now, return user's saved recipes that match criteria
    // TODO: Integrate with external recipe API (Spoonacular, etc.)
    const where: any = { userId };

    if (params?.cuisine) where.cuisine = params.cuisine;
    if (params?.mealType) where.mealType = params.mealType;
    if (params?.maxPrepTime) where.prepTime = { lte: params.maxPrepTime };

    const recipes = await prisma.savedRecipe.findMany({
      where,
      take: 20,
      orderBy: { rating: 'desc' }
    });

    return recipes.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      ingredients: (r.ingredients as any) || [],
      instructions: r.instructions || undefined,
      cuisine: r.cuisine || undefined,
      mealType: r.mealType || undefined,
      prepTime: r.prepTime || undefined,
      cookTime: r.cookTime || undefined,
      servings: r.servings || undefined,
      imageUrl: r.imageUrl || undefined,
      source: r.source,
      sourceUrl: r.sourceUrl || undefined
    }));
  },
  
  saveRecipe: async (userId: string, recipe: RecipeResult, notes?: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const saved = await prisma.savedRecipe.create({
      data: {
        userId,
        title: recipe.title,
        description: recipe.description,
        instructions: recipe.instructions,
        source: recipe.source || 'manual',
        sourceUrl: recipe.sourceUrl,
        cuisine: recipe.cuisine,
        mealType: recipe.mealType,
        ingredients: recipe.ingredients as any,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        notes,
        dietaryInfo: []
      }
    });

    return saved;
  },
  
  getSavedRecipes: async (userId: string, filters?: { mealType?: string; cuisine?: string; favoritesOnly?: boolean }) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const where: any = { userId };

    if (filters?.mealType) where.mealType = filters.mealType;
    if (filters?.cuisine) where.cuisine = filters.cuisine;
    if (filters?.favoritesOnly) where.isFavorite = true;

    const recipes = await prisma.savedRecipe.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return recipes;
  },

  // ===========================================================================
  // WISHLIST
  // ===========================================================================
  
  addToWishlist: async (userId: string, recipe: RecipeResult) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const saved = await prisma.savedRecipe.create({
      data: {
        userId,
        title: recipe.title,
        description: recipe.description,
        instructions: recipe.instructions,
        source: recipe.source || 'wishlist',
        sourceUrl: recipe.sourceUrl,
        cuisine: recipe.cuisine,
        mealType: recipe.mealType,
        ingredients: recipe.ingredients as any,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        isFavorite: true,
        dietaryInfo: []
      }
    });

    return saved;
  },
  
  getWishlist: async (userId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const recipes = await prisma.savedRecipe.findMany({
      where: {
        userId,
        isFavorite: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return recipes;
  },
  
  removeFromWishlist: async (userId: string, recipeId: string) => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    await prisma.savedRecipe.delete({
      where: { id: recipeId, userId }
    });
  },

  // ===========================================================================
  // INVOICE PROCESSING
  // ===========================================================================
  
  processInvoiceItems: async (
    _invoiceId: string,
    _invoiceDate: Date,
    _merchant: string,
    _items: any[]
  ): Promise<ProcessedInvoiceResult> => {
    // TODO: Implement invoice processing
    return { processed: 0, matched: 0, created: 0 };
  },
  
  matchInvoiceItems: async (_userId: string, _invoiceId: string): Promise<ProcessedInvoiceResult> => {
    // TODO: Implement invoice matching
    return { processed: 0, matched: 0, created: 0 };
  },

  // ===========================================================================
  // SUGGESTIONS
  // ===========================================================================
  
  getSuggestions: async (userId: string): Promise<string[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Get low stock and out of stock items as suggestions
    const lowStockItems = await prisma.groceryItem.findMany({
      where: {
        userId,
        status: { in: ['low', 'out_of_stock'] }
      },
      select: { name: true },
      take: 10
    });

    return lowStockItems.map(item => item.name);
  },
  
  getCategories: (): string[] => {
    return [...COOKING_CATEGORIES];
  }
};

export default cookingService;
