/**
 * Recipe Delivery Service
 * 
 * Bridges recipe ingredients with delivery providers.
 * Handles inventory checking, ingredient matching, and order creation.
 */

import { getPrisma } from '../core/databaseService';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import { deliveryService } from '../delivery';
import { spoonacularService, SpoonacularIngredient } from './spoonacularService';
import logger from '../../utils/logger';
import type {
  DeliveryProduct,
  DeliveryOrderItem,
  IngredientMatchResult,
  RecipeOrderRequest,
  RecipeOrderResult,
  RecipeIngredient,
  OrderPreview,
  OrderLink
} from '../../types/delivery';

// =============================================================================
// TYPES
// =============================================================================

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

export const recipeDeliveryService = {
  /**
   * Get user's inventory items for checking availability
   */
  async getUserInventory(userId: string): Promise<InventoryItem[]> {
    const prisma = getPrisma();
    if (!prisma) {
      logger.warn('Database not available for inventory check');
      return [];
    }

    try {
      const items = await prisma.groceryItem.findMany({
        where: {
          userId,
          status: 'available',
          quantity: { gt: 0 }
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: true
        }
      });

      return items;
    } catch (error: any) {
      logger.fail('Failed to get inventory', { error: error.message });
      return [];
    }
  },

  /**
   * Check if an ingredient exists in user's inventory
   */
  checkInventoryForIngredient(
    ingredient: RecipeIngredient,
    inventory: InventoryItem[]
  ): { inInventory: boolean; inventoryItem?: InventoryItem; amount?: number } {
    const normalizedName = ingredient.name.toLowerCase().trim();

    for (const item of inventory) {
      const itemName = item.name.toLowerCase().trim();
      
      // Check for match (basic fuzzy matching)
      if (
        itemName.includes(normalizedName) ||
        normalizedName.includes(itemName) ||
        this.fuzzyMatch(normalizedName, itemName)
      ) {
        return {
          inInventory: true,
          inventoryItem: item,
          amount: item.quantity
        };
      }
    }

    return { inInventory: false };
  },

  /**
   * Simple fuzzy matching for ingredient names
   */
  fuzzyMatch(a: string, b: string): boolean {
    // Remove common words and compare
    const stripWords = ['fresh', 'organic', 'large', 'small', 'medium', 'chopped', 'diced', 'minced'];
    const cleanA = stripWords.reduce((s, w) => s.replace(w, ''), a).trim();
    const cleanB = stripWords.reduce((s, w) => s.replace(w, ''), b).trim();
    
    return cleanA === cleanB || 
           cleanA.includes(cleanB) || 
           cleanB.includes(cleanA);
  },

  /**
   * Match recipe ingredients to delivery products
   */
  async matchIngredientsToProducts(
    ingredients: RecipeIngredient[],
    providerId?: string
  ): Promise<IngredientMatchResult[]> {
    const ingredientNames = ingredients.map(i => i.name);
    const productMap = await deliveryService.searchProducts(ingredientNames, { providerId });
    
    const results: IngredientMatchResult[] = [];

    for (const ingredient of ingredients) {
      const normalizedName = ingredient.name.toLowerCase();
      let matchedProducts: DeliveryProduct[] = [];
      let bestMatch: DeliveryProduct | undefined;
      let matchConfidence = 0;

      // Search through all provider results
      for (const [, products] of productMap) {
        for (const product of products) {
          const productName = product.name.toLowerCase();
          
          if (
            productName.includes(normalizedName) ||
            normalizedName.includes(productName.split(' ')[0])
          ) {
            matchedProducts.push(product);
            
            // Calculate confidence based on name similarity
            const confidence = this.calculateMatchConfidence(normalizedName, productName);
            if (confidence > matchConfidence) {
              matchConfidence = confidence;
              bestMatch = product;
            }
          }
        }
      }

      results.push({
        ingredient: ingredient.name,
        originalAmount: ingredient.original || `${ingredient.amount} ${ingredient.unit}`,
        matchedProducts,
        bestMatch,
        matchConfidence,
        inInventory: false,
        needToOrder: true
      });
    }

    return results;
  },

  /**
   * Calculate match confidence between ingredient and product name
   */
  calculateMatchConfidence(ingredient: string, productName: string): number {
    const ingWords = ingredient.toLowerCase().split(/\s+/);
    const prodWords = productName.toLowerCase().split(/\s+/);
    
    let matchedWords = 0;
    for (const word of ingWords) {
      if (prodWords.some(pw => pw.includes(word) || word.includes(pw))) {
        matchedWords++;
      }
    }

    return Math.min(100, Math.round((matchedWords / ingWords.length) * 100));
  },

  /**
   * Create a full recipe order with inventory check
   */
  async createRecipeOrder(request: RecipeOrderRequest): Promise<RecipeOrderResult> {
    logger.search('Creating recipe order', { 
      recipeId: request.recipeId, 
      recipeName: request.recipeName 
    });

    // Get user inventory if needed
    const inventory = request.checkInventory 
      ? await this.getUserInventory(request.userId)
      : [];

    // Match ingredients to products
    const ingredientMatches = await this.matchIngredientsToProducts(
      request.ingredients,
      request.providerId
    );

    // Check inventory for each ingredient
    const itemsInInventory: IngredientMatchResult[] = [];
    const itemsToOrder: IngredientMatchResult[] = [];

    for (const match of ingredientMatches) {
      const ingredientData: RecipeIngredient = {
        name: match.ingredient,
        amount: 1,
        unit: '',
        original: match.originalAmount
      };

      const inventoryCheck = this.checkInventoryForIngredient(ingredientData, inventory);
      
      if (inventoryCheck.inInventory) {
        itemsInInventory.push({
          ...match,
          inInventory: true,
          inventoryAmount: inventoryCheck.amount,
          needToOrder: false
        });
      } else {
        itemsToOrder.push(match);
      }
    }

    // Create order preview for items to order
    let orderPreview: OrderPreview | undefined;
    let orderLink: OrderLink | undefined;

    if (itemsToOrder.length > 0) {
      const orderItems: DeliveryOrderItem[] = itemsToOrder
        .filter(item => item.bestMatch)
        .map(item => ({
          product: item.bestMatch!,
          quantity: 1,
          originalIngredient: item.ingredient,
          matchConfidence: item.matchConfidence
        }));

      if (orderItems.length > 0) {
        orderPreview = await deliveryService.createOrderPreview(
          orderItems,
          request.providerId,
          request.location
        ) || undefined;

        if (orderPreview) {
          // Add recipe info to preview
          orderPreview.recipeId = String(request.recipeId);
          orderPreview.recipeName = request.recipeName;

          // Generate order link
          const link = await deliveryService.generateOrderLink(orderPreview.id);
          orderLink = link || undefined;
        }
      }
    }

    // Calculate savings from using inventory items
    const savings = itemsInInventory.reduce((sum, item) => {
      if (item.bestMatch) {
        return sum + item.bestMatch.price;
      }
      return sum;
    }, 0);

    const result: RecipeOrderResult = {
      recipeId: request.recipeId,
      recipeName: request.recipeName,
      ingredientMatches,
      itemsInInventory,
      itemsToOrder,
      orderPreview,
      orderLink,
      savings: Math.round(savings * 100) / 100
    };

    logger.success('Recipe order created', {
      recipe: request.recipeName,
      inInventory: itemsInInventory.length,
      toOrder: itemsToOrder.length,
      total: orderPreview?.total
    });

    return result;
  },

  /**
   * Create order from Spoonacular recipe
   */
  async createOrderFromSpoonacularRecipe(
    recipeId: number,
    userId: string,
    checkInventory: boolean = true,
    providerId?: string
  ): Promise<RecipeOrderResult | null> {
    // Get recipe details
    const recipe = await spoonacularService.getRecipe(recipeId);
    if (!recipe) {
      logger.fail('Recipe not found', { recipeId });
      return null;
    }

    // Convert Spoonacular ingredients to our format
    const ingredients: RecipeIngredient[] = recipe.extendedIngredients.map(
      (ing: SpoonacularIngredient) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        original: ing.original,
        aisle: ing.aisle
      })
    );

    return this.createRecipeOrder({
      recipeId,
      recipeName: recipe.title,
      ingredients,
      servings: recipe.servings,
      userId,
      providerId,
      checkInventory
    });
  },

  /**
   * Get available delivery providers
   */
  getDeliveryProviders() {
    return deliveryService.getProviders();
  }
};

export default recipeDeliveryService;
