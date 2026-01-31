/**
 * Cooking Service
 * 
 * Service for cooking-related functionality including:
 * - Kitchen inventory management (GroceryItem)
 * - Shopping list management (GroceryList, GroceryListItem)
 * - Recipe management (SavedRecipe)
 */

import { getPrisma } from '../core/databaseService';
import { spoonacularService } from './spoonacularService';
import claudeService from '../core/claudeService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

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

    const results: RecipeResult[] = [];

    // First, search saved recipes in database
    const where: any = { userId };
    if (params?.cuisine) where.cuisine = params.cuisine;
    if (params?.mealType) where.mealType = params.mealType;
    if (params?.maxPrepTime) where.prepTime = { lte: params.maxPrepTime };

    const savedRecipes = await prisma.savedRecipe.findMany({
      where,
      take: 10,
      orderBy: { rating: 'desc' }
    });

    results.push(...savedRecipes.map(r => ({
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
    })));

    // Then search Spoonacular if available and query provided
    if (spoonacularService.isAvailable() && (params?.query || params?.cuisine || params?.ingredients)) {
      try {
        const spoonacularRecipes = await spoonacularService.searchRecipes({
          query: params?.query,
          cuisine: params?.cuisine,
          diet: params?.dietaryRestrictions?.join(','),
          maxReadyTime: params?.maxPrepTime,
          includeIngredients: params?.ingredients,
          number: 10
        });

        // Convert Spoonacular recipes to our format
        for (const recipe of spoonacularRecipes) {
          results.push({
            id: `spoonacular-${recipe.id}`,
            title: recipe.title,
            description: recipe.summary?.replace(/<[^>]*>/g, '').slice(0, 300),
            ingredients: (recipe.extendedIngredients || []).map(ing => ({
              name: ing.name,
              quantity: ing.amount,
              unit: ing.unit,
              optional: false
            })),
            instructions: recipe.instructions,
            cuisine: recipe.cuisines?.[0],
            mealType: recipe.dishTypes?.[0],
            prepTime: recipe.readyInMinutes,
            cookTime: undefined,
            servings: recipe.servings,
            imageUrl: recipe.image,
            source: 'spoonacular',
            sourceUrl: recipe.sourceUrl
          });
        }

        logger.info('Recipe search completed', {
          saved: savedRecipes.length,
          spoonacular: spoonacularRecipes.length
        });
      } catch (error) {
        logger.warn('Spoonacular search failed, using saved recipes only', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // If using available ingredients only, filter results
    if (params?.useAvailableOnly && params?.ingredients?.length) {
      const availableIngredients = new Set(params.ingredients.map(i => i.toLowerCase()));
      return results.filter(recipe => {
        const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
        const matchCount = recipeIngredients.filter(i =>
          availableIngredients.has(i) || [...availableIngredients].some(a => i.includes(a) || a.includes(i))
        ).length;
        return matchCount >= Math.ceil(recipeIngredients.length * 0.5); // At least 50% match
      });
    }

    return results;
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
  
  /**
   * Process items from a grocery invoice
   * Parses invoice data and stores items for matching
   */
  processInvoiceItems: async (
    invoiceId: string,
    invoiceDate: Date,
    merchant: string,
    items: Array<{ name: string; quantity?: number; unit?: string; price?: number }>
  ): Promise<ProcessedInvoiceResult> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    let processed = 0;
    let matched = 0;
    let created = 0;

    for (const item of items) {
      try {
        // Create invoice item record
        await prisma.groceryInvoiceItem.create({
          data: {
            invoiceId,
            invoiceDate,
            merchant,
            itemName: item.name,
            quantity: item.quantity || 1,
            unit: item.unit,
            price: item.price,
            currency: 'ILS', // Default to ILS for Israeli invoices
            isProcessed: false
          }
        });
        processed++;
      } catch (error) {
        logger.warn('Failed to process invoice item', {
          item: item.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Invoice items processed', { invoiceId, processed, merchant });
    return { processed, matched, created };
  },

  /**
   * Match invoice items to user's grocery inventory
   * Uses AI to fuzzy match item names and update inventory
   */
  matchInvoiceItems: async (userId: string, invoiceId: string): Promise<ProcessedInvoiceResult> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Get unprocessed invoice items
    const invoiceItems = await prisma.groceryInvoiceItem.findMany({
      where: { invoiceId, isProcessed: false }
    });

    if (invoiceItems.length === 0) {
      return { processed: 0, matched: 0, created: 0 };
    }

    // Get user's existing inventory
    const inventory = await prisma.groceryItem.findMany({
      where: { userId },
      select: { id: true, name: true, brand: true, category: true }
    });

    let processed = 0;
    let matched = 0;
    let created = 0;

    // Use AI to match items if Claude is available
    const aiEnabled = configService.get('cooking.invoice.autoDetect', true);
    const confidenceThreshold = configService.get('cooking.invoice.confidenceThreshold', 0.7);

    for (const invoiceItem of invoiceItems) {
      try {
        let matchedGroceryId: string | null = null;
        let matchConfidence = 0;

        // Simple fuzzy matching first
        const normalizedName = invoiceItem.itemName.toLowerCase().trim();
        for (const invItem of inventory) {
          const invName = invItem.name.toLowerCase();
          if (invName === normalizedName || invName.includes(normalizedName) || normalizedName.includes(invName)) {
            matchedGroceryId = invItem.id;
            matchConfidence = 0.9;
            break;
          }
        }

        // Use AI for fuzzy matching if no direct match found
        if (!matchedGroceryId && aiEnabled && inventory.length > 0) {
          try {
            const matchResult = await claudeService.chat([
              {
                role: 'user',
                content: `Match this grocery item from an invoice to the user's inventory.

Invoice item: "${invoiceItem.itemName}"

User's inventory items:
${inventory.map(i => `- ${i.name}${i.brand ? ` (${i.brand})` : ''}`).join('\n')}

Respond with JSON only: {"matchedItem": "exact name from inventory or null", "confidence": 0.0-1.0, "category": "suggested category"}`
              }
            ], {
              maxTokens: 200,
              system: 'You are a grocery matching assistant. Match invoice items to inventory items. Be strict - only match if confident.'
            });

            const match = JSON.parse(matchResult.content);
            if (match.matchedItem && match.confidence >= confidenceThreshold) {
              const found = inventory.find(i => i.name.toLowerCase() === match.matchedItem.toLowerCase());
              if (found) {
                matchedGroceryId = found.id;
                matchConfidence = match.confidence;
              }
            }
          } catch (aiError) {
            logger.debug('AI matching failed, using manual matching', {
              error: aiError instanceof Error ? aiError.message : String(aiError)
            });
          }
        }

        // Update invoice item with match result
        await prisma.groceryInvoiceItem.update({
          where: { id: invoiceItem.id },
          data: {
            isProcessed: true,
            processedAt: new Date(),
            matchedGroceryId,
            matchConfidence
          }
        });

        processed++;

        if (matchedGroceryId) {
          // Update matched inventory item
          await prisma.groceryItem.update({
            where: { id: matchedGroceryId },
            data: {
              lastPurchasedAt: invoiceItem.invoiceDate || new Date(),
              lastPurchasePrice: invoiceItem.price,
              status: 'available',
              quantity: { increment: invoiceItem.quantity || 1 }
            }
          });
          matched++;
        } else {
          // Create new inventory item
          const category = await cookingService.categorizeItem(invoiceItem.itemName);
          await prisma.groceryItem.create({
            data: {
              userId,
              name: invoiceItem.itemName,
              quantity: invoiceItem.quantity || 1,
              unit: invoiceItem.unit,
              category,
              status: 'available',
              lastPurchasedAt: invoiceItem.invoiceDate || new Date(),
              lastPurchasePrice: invoiceItem.price,
              purchaseSource: 'invoice'
            }
          });
          created++;
        }
      } catch (error) {
        logger.warn('Failed to match invoice item', {
          item: invoiceItem.itemName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Invoice items matched', { invoiceId, processed, matched, created });
    return { processed, matched, created };
  },

  /**
   * Categorize a grocery item using AI
   */
  categorizeItem: async (itemName: string): Promise<string> => {
    try {
      const result = await claudeService.chat([
        {
          role: 'user',
          content: `Categorize this grocery item into one of these categories: produce, dairy, meat, seafood, bakery, pantry, frozen, beverages, snacks, condiments, spices, household, personal_care, other.

Item: "${itemName}"

Respond with just the category name, nothing else.`
        }
      ], { maxTokens: 20 });

      const category = result.content.trim().toLowerCase();
      if (COOKING_CATEGORIES.includes(category as any)) {
        return category;
      }
    } catch (error) {
      logger.debug('AI categorization failed', { item: itemName });
    }
    return 'other';
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
