/**
 * Cooking Service
 * 
 * Manages kitchen inventory, shopping lists, and recipe finding.
 * Supports manual entry and automatic detection from invoices.
 */

import { getPrisma } from '../core/databaseService';
import { cacheService, cacheKeys } from '../core/cacheService';
import { configService } from '../core/configService';
import claudeService from '../core/claudeService';
import axios from 'axios';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CookingItemData {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
  brand?: string;
  notes?: string;
  barcode?: string;
  lastPurchasePrice?: number;
  currency?: string;
}

export interface CookingFilters {
  status?: string;
  category?: string;
  expiringWithinDays?: number;
  lowStock?: boolean;
}

export interface RecipeSearchParams {
  ingredients?: string[];
  cuisine?: string;
  mealType?: string;
  dietaryRestrictions?: string[];
  maxPrepTime?: number;
  useAvailableOnly?: boolean;
}

export interface RecipeResult {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: RecipeIngredient[];
  missingIngredients?: string[];
  matchPercentage?: number;
  source: string;
  sourceUrl?: string;
}

interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  optional?: boolean;
}

// =============================================================================
// COOKING CATEGORIES
// =============================================================================

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

// =============================================================================
// SERVICE
// =============================================================================

export const cookingService = {
  // ===========================================================================
  // INVENTORY ITEM MANAGEMENT
  // ===========================================================================

  /**
   * Add a new item to inventory
   */
  addItem: async (userId: string, itemData: CookingItemData): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Normalize brand to null if empty or undefined
    const brand = itemData.brand?.trim() || null;

    // Check if item with same name and brand already exists
    const existingItem = await prisma.groceryItem.findFirst({
      where: {
        userId,
        name: itemData.name,
        brand
      }
    });

    if (existingItem) {
      // Update existing item instead of creating duplicate
      const updatedItem = await prisma.groceryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + (itemData.quantity || 1),
          lastPurchasedAt: new Date(),
          lastPurchasePrice: itemData.lastPurchasePrice ?? existingItem.lastPurchasePrice,
          ...(itemData.expiryDate && { expiryDate: new Date(itemData.expiryDate) }),
          ...(itemData.notes && { notes: itemData.notes }),
          status: 'available'
        }
      });

      await cacheService.delete(`cooking:${userId}:items`);
      return updatedItem;
    }

    const item = await prisma.groceryItem.create({
      data: {
        userId,
        name: itemData.name,
        category: itemData.category || 'other',
        quantity: itemData.quantity || 1,
        unit: itemData.unit,
        expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate) : null,
        brand,
        notes: itemData.notes,
        barcode: itemData.barcode,
        lastPurchasePrice: itemData.lastPurchasePrice,
        currency: itemData.currency || 'USD',
        purchaseSource: 'manual',
        lastPurchasedAt: new Date()
      }
    });

    // Invalidate cache
    await cacheService.delete(`cooking:${userId}:items`);

    return item;
  },

  /**
   * Update an existing item
   */
  updateItem: async (userId: string, itemId: string, updates: Partial<CookingItemData>): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryItem.update({
      where: { id: itemId, userId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.expiryDate !== undefined && { expiryDate: updates.expiryDate ? new Date(updates.expiryDate) : null }),
        ...(updates.brand !== undefined && { brand: updates.brand }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.lastPurchasePrice !== undefined && { lastPurchasePrice: updates.lastPurchasePrice })
      }
    });

    await cacheService.delete(`cooking:${userId}:items`);

    return item;
  },

  /**
   * Delete an item
   */
  deleteItem: async (userId: string, itemId: string): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    await prisma.groceryItem.delete({
      where: { id: itemId, userId }
    });

    await cacheService.delete(`cooking:${userId}:items`);
  },

  /**
   * Get all items with optional filters
   */
  getItems: async (userId: string, filters?: CookingFilters): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:items:${JSON.stringify(filters || {})}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      where.expiryDate = {
        lte: futureDate,
        gte: new Date()
      };
    }

    if (filters?.lowStock) {
      const threshold = configService.get('cooking.lowStock.threshold', 2);
      where.quantity = { lte: threshold };
    }

    const items = await prisma.groceryItem.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Cache items
    const itemsCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, items, { ttl: itemsCacheTtl });

    return items;
  },

  /**
   * Update item status (available, low, out_of_stock, expired)
   */
  updateItemStatus: async (userId: string, itemId: string, status: string): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryItem.update({
      where: { id: itemId, userId },
      data: { status }
    });

    await cacheService.delete(`cooking:${userId}:items`);

    return item;
  },

  /**
   * Get expiring items (within configured days)
   */
  getExpiringItems: async (userId: string): Promise<any[]> => {
    const daysAhead = configService.get('cooking.expiryWarning.daysAhead', 3);
    return cookingService.getItems(userId, { expiringWithinDays: daysAhead });
  },

  /**
   * Get low stock items
   */
  getLowStockItems: async (userId: string): Promise<any[]> => {
    return cookingService.getItems(userId, { lowStock: true });
  },

  // ===========================================================================
  // SHOPPING LIST MANAGEMENT
  // ===========================================================================

  /**
   * Create a new shopping list
   */
  createList: async (userId: string, name: string, description?: string): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const list = await prisma.groceryList.create({
      data: {
        userId,
        name,
        description,
        listType: 'shopping'
      },
      include: { items: true }
    });

    // Invalidate lists cache
    await cacheService.delete(`cooking:${userId}:lists`);

    return list;
  },

  /**
   * Get all lists for user
   */
  getLists: async (userId: string, includeCompleted = false): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:lists:${includeCompleted}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { userId };
    if (!includeCompleted) {
      where.status = { not: 'completed' };
    }

    const lists = await prisma.groceryList.findMany({
      where,
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Cache lists
    const listsCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, lists, { ttl: listsCacheTtl });

    return lists;
  },

  /**
   * Add item to shopping list
   */
  addListItem: async (
    listId: string,
    itemData: { name: string; quantity?: number; unit?: string; category?: string; groceryId?: string }
  ): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryListItem.create({
      data: {
        listId,
        name: itemData.name,
        quantity: itemData.quantity || 1,
        unit: itemData.unit,
        category: itemData.category,
        groceryId: itemData.groceryId
      }
    });

    // Get the list to invalidate its cache
    const list = await prisma.groceryList.findUnique({ where: { id: listId }, select: { userId: true } });
    if (list) {
      await cacheService.delete(`cooking:${list.userId}:lists`);
    }

    return item;
  },

  /**
   * Toggle list item checked status
   */
  toggleListItem: async (itemId: string, isChecked: boolean): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const item = await prisma.groceryListItem.update({
      where: { id: itemId },
      data: {
        isChecked,
        checkedAt: isChecked ? new Date() : null
      }
    });

    return item;
  },

  /**
   * Complete a shopping list (mark as done and update inventory)
   */
  completeList: async (userId: string, listId: string): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Get list with checked items
    const list = await prisma.groceryList.findUnique({
      where: { id: listId, userId },
      include: { items: { where: { isChecked: true } } }
    });

    if (!list) throw new Error('List not found');

    // Update inventory with purchased items
    for (const item of list.items) {
      if (item.groceryId) {
        // Update existing grocery item
        await prisma.groceryItem.update({
          where: { id: item.groceryId },
          data: {
            quantity: { increment: item.quantity },
            status: 'available',
            lastPurchasedAt: new Date(),
            lastPurchasePrice: item.actualPrice
          }
        });
      } else {
        // Create new grocery item from list item
        // First check if item exists by name (brand is nullable)
        const existingItem = await prisma.groceryItem.findFirst({
          where: {
            userId,
            name: item.name,
            brand: null
          }
        });

        if (existingItem) {
          // Update existing item
          await prisma.groceryItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: { increment: item.quantity },
              status: 'available',
              lastPurchasedAt: new Date(),
              lastPurchasePrice: item.actualPrice
            }
          });
        } else {
          // Create new grocery item
          await prisma.groceryItem.create({
            data: {
              userId,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category || 'other',
              purchaseSource: 'shopping_list',
              lastPurchasedAt: new Date(),
              lastPurchasePrice: item.actualPrice
            }
          });
        }
      }
    }

    // Mark list as completed
    const updatedList = await prisma.groceryList.update({
      where: { id: listId },
      data: {
        status: 'completed',
        completedAt: new Date()
      },
      include: { items: true }
    });

    await cacheService.delete(`cooking:${userId}:items`);
    await cacheService.delete(`cooking:${userId}:lists`);

    return updatedList;
  },

  // ===========================================================================
  // RECIPE SEARCH
  // ===========================================================================

  /**
   * Find recipes based on available ingredients
   */
  findRecipes: async (userId: string, params: RecipeSearchParams): Promise<RecipeResult[]> => {
    const maxResults = configService.get('cooking.recipe.maxResults', 10);
    let ingredients = params.ingredients || [];

    // If using available ingredients, get from inventory
    if (params.useAvailableOnly && ingredients.length === 0) {
      const items = await cookingService.getItems(userId, { status: 'available' });
      ingredients = items.map(item => item.name);
    }

    if (ingredients.length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = `cooking:recipes:${JSON.stringify({ ingredients, ...params })}`;
    const cached = await cacheService.get<RecipeResult[]>(cacheKey);
    if (cached) return cached;

    // Try external API first (Spoonacular has free tier)
    const apiKey = process.env.SPOONACULAR_API_KEY;
    if (apiKey) {
      try {
        const response = await axios.get('https://api.spoonacular.com/recipes/findByIngredients', {
          params: {
            apiKey,
            ingredients: ingredients.join(','),
            number: maxResults,
            ranking: 2, // Minimize missing ingredients
            ignorePantry: true
          }
        });

        const recipes = response.data.map((recipe: any) => ({
          id: `spoonacular-${recipe.id}`,
          title: recipe.title,
          imageUrl: recipe.image,
          ingredients: recipe.usedIngredients.map((i: any) => ({
            name: i.name,
            quantity: i.amount,
            unit: i.unit
          })),
          missingIngredients: recipe.missedIngredients.map((i: any) => i.name),
          matchPercentage: Math.round(
            (recipe.usedIngredientCount / (recipe.usedIngredientCount + recipe.missedIngredientCount)) * 100
          ),
          source: 'spoonacular',
          sourceUrl: `https://spoonacular.com/recipes/${recipe.title.replace(/\s+/g, '-').toLowerCase()}-${recipe.id}`
        }));

        // Cache recipes
        const recipesCacheTtl = configService.get('cooking.cache.recipesTtlSeconds', 3600);
        await cacheService.set(cacheKey, recipes, { ttl: recipesCacheTtl });

        return recipes;
      } catch (error) {
        logger.warn(`Spoonacular API error, falling back to AI: ${error}`);
      }
    }

    // Fallback: Use AI to generate recipe suggestions
    const recipes = await cookingService.generateRecipesWithAI(ingredients, params);
    
    // Cache AI-generated recipes
    const aiRecipesCacheTtl = configService.get('cooking.cache.recipesTtlSeconds', 3600);
    await cacheService.set(cacheKey, recipes, { ttl: aiRecipesCacheTtl });
    
    return recipes;
  },

  /**
   * Generate recipe suggestions using AI
   */
  generateRecipesWithAI: async (ingredients: string[], params: RecipeSearchParams): Promise<RecipeResult[]> => {
    const maxTokens = configService.get('cooking.ai.maxTokens', 2000);

    const prompt = `Based on these available ingredients: ${ingredients.join(', ')}

${params.cuisine ? `Cuisine preference: ${params.cuisine}` : ''}
${params.mealType ? `Meal type: ${params.mealType}` : ''}
${params.dietaryRestrictions?.length ? `Dietary restrictions: ${params.dietaryRestrictions.join(', ')}` : ''}
${params.maxPrepTime ? `Maximum prep time: ${params.maxPrepTime} minutes` : ''}

Suggest 5 practical recipes that can be made with these ingredients. For each recipe, specify which ingredients from the list are used and what additional ingredients might be needed.

Respond ONLY with valid JSON:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "ingredients": [
        {"name": "ingredient", "quantity": 1, "unit": "cup", "optional": false}
      ],
      "missingIngredients": ["salt", "pepper"],
      "instructions": "Step-by-step instructions",
      "matchPercentage": 85
    }
  ]
}`;

    try {
      const response = await claudeService.generateText(prompt, maxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanResponse);

      return (data.recipes || []).map((recipe: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl || undefined,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients || [],
        missingIngredients: recipe.missingIngredients || [],
        matchPercentage: recipe.matchPercentage || 80,
        source: 'ai_generated'
      }));
    } catch (error) {
      logger.error(`AI recipe generation failed: ${error}`);
      return [];
    }
  },

  /**
   * Save a recipe for the user
   */
  saveRecipe: async (userId: string, recipe: RecipeResult, notes?: string): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const saved = await prisma.savedRecipe.create({
      data: {
        userId,
        title: recipe.title,
        description: recipe.description,
        source: recipe.source,
        sourceUrl: recipe.sourceUrl,
        sourceId: recipe.id,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
        imageUrl: recipe.imageUrl,
        notes
      }
    });

    // Invalidate recipes cache
    await cacheService.delete(`cooking:${userId}:recipes`);

    return saved;
  },

  /**
   * Get user's saved recipes
   */
  getSavedRecipes: async (userId: string, filters?: { mealType?: string; cuisine?: string; favoritesOnly?: boolean }): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:recipes:${JSON.stringify(filters || {})}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { userId };

    if (filters?.mealType) where.mealType = filters.mealType;
    if (filters?.cuisine) where.cuisine = filters.cuisine;
    if (filters?.favoritesOnly) where.isFavorite = true;

    const recipes = await prisma.savedRecipe.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    // Cache recipes from available ingredients
    const availableRecipesCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, recipes, { ttl: availableRecipesCacheTtl });

    return recipes;
  },

  // ===========================================================================
  // RECIPE WISHLIST
  // ===========================================================================

  /**
   * Add a recipe to user's wishlist
   */
  addToWishlist: async (userId: string, recipe: RecipeResult): Promise<any> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Fetch image URL if not provided
    let imageUrl = recipe.imageUrl;
    if (!imageUrl) {
      imageUrl = await cookingService.fetchRecipeImage(recipe.title);
    }

    const saved = await prisma.savedRecipe.create({
      data: {
        userId,
        title: recipe.title,
        description: recipe.description,
        source: recipe.source || 'wishlist',
        sourceUrl: recipe.sourceUrl,
        sourceId: recipe.id,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
        imageUrl,
        isFavorite: true, // Wishlist items are marked as favorites
        notes: 'Added to wishlist'
      }
    });

    // Invalidate caches
    await cacheService.delete(`cooking:${userId}:recipes`);
    await cacheService.delete(`cooking:${userId}:wishlist`);

    return saved;
  },

  /**
   * Get user's recipe wishlist
   */
  getWishlist: async (userId: string): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:wishlist`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const recipes = await prisma.savedRecipe.findMany({
      where: {
        userId,
        isFavorite: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Cache wishlist
    const wishlistCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, recipes, { ttl: wishlistCacheTtl });

    return recipes;
  },

  /**
   * Remove a recipe from wishlist
   */
  removeFromWishlist: async (userId: string, recipeId: string): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    await prisma.savedRecipe.delete({
      where: { id: recipeId, userId }
    });

    // Invalidate caches
    await cacheService.delete(`cooking:${userId}:recipes`);
    await cacheService.delete(`cooking:${userId}:wishlist`);
  },

  /**
   * Fetch a recipe image using web search or placeholder
   */
  fetchRecipeImage: async (recipeTitle: string): Promise<string | undefined> => {
    // Try using SerpApi for image search
    const serpApiKey = process.env.SERPAPI_KEY;
    if (serpApiKey) {
      try {
        const response = await axios.get('https://serpapi.com/search', {
          params: {
            api_key: serpApiKey,
            engine: 'google_images',
            q: `${recipeTitle} recipe food dish`,
            num: 1
          },
          timeout: configService.get('cooking.api.timeoutMs', 5000)
        });

        const images = response.data.images_results || [];
        if (images.length > 0) {
          return images[0].original || images[0].thumbnail;
        }
      } catch (error) {
        logger.warn(`SerpApi image search failed: ${error}`);
      }
    }

    // No image found - let frontend handle with placeholder
    return undefined;
  },

  // ===========================================================================
  // INVOICE/RECEIPT PROCESSING
  // ===========================================================================

  /**
   * Process grocery items from an invoice/receipt
   * Called by Email Agent when invoice is detected
   */
  processInvoiceItems: async (
    invoiceId: string,
    invoiceDate: Date,
    merchant: string,
    items: Array<{ name: string; quantity?: number; unit?: string; price?: number }>
  ): Promise<{ processed: number; matched: number }> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const autoDetect = configService.get('cooking.invoice.autoDetect', true);
    if (!autoDetect) {
      return { processed: 0, matched: 0 };
    }

    let processed = 0;
    let matched = 0;

    for (const item of items) {
      // Store the invoice item
      await prisma.groceryInvoiceItem.create({
        data: {
          invoiceId,
          invoiceDate,
          merchant,
          itemName: item.name,
          quantity: item.quantity || 1,
          unit: item.unit,
          price: item.price,
          isProcessed: false
        }
      });

      processed++;
    }

    return { processed, matched };
  },

  /**
   * Use AI to categorize and match invoice items to inventory
   */
  matchInvoiceItems: async (userId: string, invoiceId: string): Promise<{ matched: number; created: number }> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const confidenceThreshold = configService.get('cooking.invoice.confidenceThreshold', 0.7);

    // Get unprocessed items from this invoice
    const invoiceItems = await prisma.groceryInvoiceItem.findMany({
      where: { invoiceId, isProcessed: false }
    });

    if (invoiceItems.length === 0) {
      return { matched: 0, created: 0 };
    }

    // Get user's existing grocery items for matching
    const existingItems = await prisma.groceryItem.findMany({
      where: { userId },
      select: { id: true, name: true, brand: true, category: true }
    });

    const prompt = `Match these invoice items to grocery categories and existing items.

Invoice items:
${invoiceItems.map((i) => `- "${i.itemName}" (qty: ${i.quantity}, price: ${i.price ?? 'N/A'})`).join('\n')}

Existing inventory items:
${existingItems.map((i) => `- "${i.name}" (id: ${i.id}, category: ${i.category ?? 'unknown'})`).join('\n')}

For each invoice item, determine:
1. The best matching existing item (if any)
2. A confidence score (0-1)
3. The grocery category

Respond ONLY with valid JSON:
{
  "matches": [
    {
      "invoiceItemName": "original name from invoice",
      "normalizedName": "cleaned up name for grocery",
      "matchedItemId": "existing item id or null",
      "confidence": 0.9,
      "category": "produce"
    }
  ]
}`;

    try {
      const response = await claudeService.generateText(prompt, 2000);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanResponse);

      let matched = 0;
      let created = 0;

      for (const match of data.matches || []) {
        const invoiceItem = invoiceItems.find((i) => i.itemName === match.invoiceItemName);
        if (!invoiceItem) continue;

        if (match.matchedItemId && match.confidence >= confidenceThreshold) {
          // Update existing item
          await prisma.groceryItem.update({
            where: { id: match.matchedItemId },
            data: {
              quantity: { increment: invoiceItem.quantity },
              lastPurchasedAt: invoiceItem.invoiceDate,
              lastPurchasePrice: invoiceItem.price,
              status: 'available'
            }
          });
          matched++;
        } else {
          // Create new grocery item
          await prisma.groceryItem.create({
            data: {
              userId,
              name: match.normalizedName || invoiceItem.itemName,
              category: match.category || 'other',
              quantity: invoiceItem.quantity,
              unit: invoiceItem.unit,
              lastPurchasedAt: invoiceItem.invoiceDate,
              lastPurchasePrice: invoiceItem.price,
              purchaseSource: 'invoice'
            }
          });
          created++;
        }

        // Mark invoice item as processed
        await prisma.groceryInvoiceItem.update({
          where: { id: invoiceItem.id },
          data: {
            isProcessed: true,
            processedAt: new Date(),
            matchedGroceryId: match.matchedItemId,
            matchConfidence: match.confidence
          }
        });
      }

      await cacheService.delete(`cooking:${userId}:items`);

      return { matched, created };
    } catch (error) {
      logger.error(`Invoice matching failed: ${error}`);
      return { matched: 0, created: 0 };
    }
  },

  // ===========================================================================
  // ANALYTICS & SUGGESTIONS
  // ===========================================================================

  /**
   * Get inventory summary
   */
  getInventorySummary: async (userId: string): Promise<{
    totalItems: number;
    byCategory: Record<string, number>;
    expiringSoon: number;
    lowStock: number;
    totalValue: number;
  }> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:summary`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const items = await prisma.groceryItem.findMany({
      where: { userId }
    });

    const daysAhead = configService.get('cooking.expiryWarning.daysAhead', 3);
    const lowStockThreshold = configService.get('cooking.lowStock.threshold', 2);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const byCategory: Record<string, number> = {};
    let expiringSoon = 0;
    let lowStock = 0;
    let totalValue = 0;

    for (const item of items) {
      // Count by category
      const category = item.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;

      // Check expiring
      if (item.expiryDate && new Date(item.expiryDate) <= futureDate) {
        expiringSoon++;
      }

      // Check low stock
      if (item.quantity <= lowStockThreshold) {
        lowStock++;
      }

      // Calculate value
      if (item.lastPurchasePrice) {
        totalValue += item.lastPurchasePrice * item.quantity;
      }
    }

    const summary = {
      totalItems: items.length,
      byCategory,
      expiringSoon,
      lowStock,
      totalValue
    };

    // Cache summary
    const summaryCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, summary, { ttl: summaryCacheTtl });

    return summary;
  },

  /**
   * Generate shopping suggestions based on usage patterns
   */
  getSuggestions: async (userId: string): Promise<string[]> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    // Check cache first
    const cacheKey = `cooking:${userId}:suggestions`;
    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    // Get items that are low or out of stock
    const lowItems = await prisma.groceryItem.findMany({
      where: {
        userId,
        OR: [
          { status: 'low' },
          { status: 'out_of_stock' },
          { quantity: { lte: 2 } }
        ]
      },
      select: { name: true }
    });

    const suggestions = lowItems.map((i) => i.name);

    // Cache suggestions
    const suggestionsCacheTtl = configService.get('cooking.cache.itemsTtlSeconds', 300);
    await cacheService.set(cacheKey, suggestions, { ttl: suggestionsCacheTtl });

    return suggestions;
  }
};

export default cookingService;
