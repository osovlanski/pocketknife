/**
 * Cooking Controller
 * 
 * HTTP request handlers for kitchen inventory, shopping lists, and recipes.
 * Thin controller - delegates to cookingAgent for business logic.
 */

import { Request, Response } from 'express';
import { cookingAgent } from '../agents';
import { getUserIdFromRequest } from '../utils/controllerHelpers';

// Alias for backward compatibility with local code
const getUserId = getUserIdFromRequest;

// =============================================================================
// INVENTORY ITEMS
// =============================================================================

/**
 * Add a new item to inventory
 */
export const addItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'add-item',
      userId,
      itemData: req.body
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update an existing item
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await cookingAgent.execute({
      action: 'update-item',
      userId,
      itemId: id,
      itemData: req.body
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete an item
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await cookingAgent.execute({
      action: 'delete-item',
      userId,
      itemId: id
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all items with optional filters
 */
export const getItems = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status, category, expiringWithinDays, lowStock } = req.query;

    const result = await cookingAgent.execute({
      action: 'get-items',
      userId,
      filters: {
        status: status as string,
        category: category as string,
        expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays as string) : undefined,
        lowStock: lowStock === 'true'
      }
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update item status
 */
export const updateItemStatus = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await cookingAgent.execute({
      action: 'update-status',
      userId,
      itemId: id,
      status
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get expiring items
 */
export const getExpiringItems = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-expiring',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get low stock items
 */
export const getLowStockItems = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-low-stock',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// SHOPPING LISTS
// =============================================================================

/**
 * Create a new shopping list
 */
export const createList = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { name, description } = req.body;

    const result = await cookingAgent.execute({
      action: 'create-list',
      userId,
      listName: name,
      listDescription: description
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all shopping lists
 */
export const getLists = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-lists',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add item to shopping list
 */
export const addListItem = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;

    const result = await cookingAgent.execute({
      action: 'add-list-item',
      listId,
      listItemData: req.body
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle list item checked status
 */
export const toggleListItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { isChecked } = req.body;

    const result = await cookingAgent.execute({
      action: 'toggle-list-item',
      listItemId: itemId,
      isChecked
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Complete a shopping list
 */
export const completeList = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { listId } = req.params;

    const result = await cookingAgent.execute({
      action: 'complete-list',
      userId,
      listId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// RECIPES
// =============================================================================

/**
 * Find recipes based on available ingredients
 */
export const findRecipes = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { ingredients, cuisine, mealType, dietaryRestrictions, maxPrepTime, useAvailableOnly } = req.body;

    const result = await cookingAgent.execute({
      action: 'find-recipes',
      userId,
      recipeParams: {
        ingredients,
        cuisine,
        mealType,
        dietaryRestrictions,
        maxPrepTime,
        useAvailableOnly
      }
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Save a recipe
 */
export const saveRecipe = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { recipe, notes } = req.body;

    const result = await cookingAgent.execute({
      action: 'save-recipe',
      userId,
      recipe,
      notes
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get saved recipes
 */
export const getSavedRecipes = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { mealType, cuisine, favoritesOnly } = req.query;

    const result = await cookingAgent.execute({
      action: 'get-saved-recipes',
      userId,
      filters: {
        mealType: mealType as string,
        cuisine: cuisine as string,
        favoritesOnly: favoritesOnly === 'true'
      }
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// RECIPE WISHLIST
// =============================================================================

/**
 * Add recipe to wishlist
 */
export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { recipe } = req.body;

    const result = await cookingAgent.execute({
      action: 'add-to-wishlist',
      userId,
      recipe
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get recipe wishlist
 */
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-wishlist',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Remove recipe from wishlist
 */
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await cookingAgent.execute({
      action: 'remove-from-wishlist',
      userId,
      recipeId: id
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Get inventory summary
 */
export const getSummary = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-summary',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get shopping suggestions
 */
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'get-suggestions',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// DELIVERY / RECIPE ORDERING
// =============================================================================

/**
 * Create an order from a recipe
 */
export const createRecipeOrder = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { spoonacularRecipeId, checkInventory, providerId } = req.body;

    const result = await cookingAgent.execute({
      action: 'create-recipe-order',
      userId,
      spoonacularRecipeId,
      checkInventory: checkInventory ?? true,
      providerId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get available delivery providers
 */
export const getDeliveryProviders = async (req: Request, res: Response) => {
  try {
    const result = await cookingAgent.execute({
      action: 'get-delivery-providers'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Place an actual Wolt Drive delivery order
 */
export const placeWoltOrder = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { orderId, customerContact, deliveryInstructions } = req.body;

    const result = await cookingAgent.execute({
      action: 'place-wolt-order',
      userId,
      orderId,
      customerContact,
      deliveryInstructions
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Wolt delivery status
 */
export const getWoltOrderStatus = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;

    const result = await cookingAgent.execute({
      action: 'get-wolt-order-status',
      woltDeliveryId: deliveryId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Cancel a Wolt delivery
 */
export const cancelWoltOrder = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;

    const result = await cookingAgent.execute({
      action: 'cancel-wolt-order',
      woltDeliveryId: deliveryId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============================================================================
// RAMI LEVY INTEGRATION
// =============================================================================

/**
 * Clean a JWT token by removing invalid trailing characters
 * Some browsers/tools truncate or corrupt tokens when copying
 */
const cleanJwtToken = (token: string): string => {
  if (!token || typeof token !== 'string') return token;
  // Remove trailing $ or other non-base64url characters
  // Base64url valid chars: A-Z, a-z, 0-9, -, _
  return token.replace(/[^A-Za-z0-9\-_\.]+$/, '');
};

/**
 * Validate that a string looks like a JWT token
 * Accepts 2 or 3 part tokens (some APIs use truncated tokens)
 */
const isValidJwtFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const cleaned = cleanJwtToken(token);
  // JWT typically has 3 parts, but some systems use 2
  const parts = cleaned.split('.');
  return parts.length >= 2 && parts.every(part => part.length > 0);
};

/**
 * Validate that cookie string is not empty and looks reasonable
 */
const isValidCookie = (cookie: string): boolean => {
  if (!cookie || typeof cookie !== 'string') return false;
  // Cookie should contain at least one key=value pair
  return cookie.includes('=') && cookie.length > 10;
};

/**
 * Setup Rami Levy authentication tokens
 * 
 * Expected body:
 * {
 *   apiKey: string,    // Bearer token from Authorization header (JWT format)
 *   ecomToken?: string, // ecomtoken header value (optional)
 *   cookie: string     // Full cookie string
 * }
 */
export const ramiLevySetup = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { apiKey: rawApiKey, ecomToken: rawEcomToken, cookie } = req.body;

    // Clean tokens (remove trailing invalid characters from copy/paste)
    const apiKey = rawApiKey ? cleanJwtToken(rawApiKey.trim()) : '';
    const ecomToken = rawEcomToken ? cleanJwtToken(rawEcomToken.trim()) : undefined;

    // Validate apiKey (required, JWT format)
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'API key (Bearer token) is required. Extract from Authorization header.' 
      });
    }
    if (!isValidJwtFormat(apiKey)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid API key format. Should be a JWT token (at least two parts separated by dots).' 
      });
    }

    // Validate cookie (required)
    if (!cookie || typeof cookie !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cookie is required. Extract full cookie string from browser request.' 
      });
    }
    if (!isValidCookie(cookie)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid cookie format. Should contain key=value pairs.' 
      });
    }

    // ecomToken is optional - validate if provided
    if (ecomToken && typeof ecomToken !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ecomToken format.' 
      });
    }

    // Optional: skip validation to debug token issues
    const skipValidation = req.body.skipValidation === true;

    const result = await cookingAgent.execute({
      action: 'rami-levy-setup',
      userId,
      ramiLevyTokens: { apiKey, ecomToken, cookie },
      skipValidation
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Rami Levy token status
 */
export const ramiLevyStatus = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-status',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search Rami Levy products
 */
export const ramiLevySearch = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { query, storeId } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-search',
      userId,
      searchQuery: query as string,
      storeId: storeId as string
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add product to Rami Levy cart
 */
export const ramiLevyAddToCart = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { productId, quantity, storeId } = req.body;

    // Validate productId (required, must be a number)
    if (productId === undefined || productId === null) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    if (typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, error: 'Product ID must be a positive integer' });
    }

    // Validate quantity if provided (must be positive number)
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-add-to-cart',
      userId,
      productId,
      quantity,
      storeId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Remove products from Rami Levy cart
 */
export const ramiLevyRemoveFromCart = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { productIds, storeId } = req.body;

    const result = await cookingAgent.execute({
      action: 'rami-levy-remove-from-cart',
      userId,
      productIds,
      storeId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update product quantity in Rami Levy cart
 */
export const ramiLevyUpdateQuantity = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { productId, quantity, storeId } = req.body;

    const result = await cookingAgent.execute({
      action: 'rami-levy-update-quantity',
      userId,
      productId,
      quantity,
      storeId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Clear Rami Levy cart
 */
export const ramiLevyClearCart = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { storeId } = req.body;

    const result = await cookingAgent.execute({
      action: 'rami-levy-clear-cart',
      userId,
      storeId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get current Rami Levy cart
 */
export const ramiLevyGetCart = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-get-cart',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Rami Levy checkout URL
 */
export const ramiLevyCheckout = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-checkout',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Order ingredients from a recipe - the main flow
 * Automatically searches for products and adds them to cart
 */
export const ramiLevyOrderIngredients = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { ingredients, storeId, autoSelectFirst } = req.body;

    const result = await cookingAgent.execute({
      action: 'rami-levy-order-ingredients',
      userId,
      ingredients,
      storeId,
      autoSelectFirst
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete Rami Levy tokens (logout)
 */
export const ramiLevyDeleteTokens = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await cookingAgent.execute({
      action: 'rami-levy-delete-tokens',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
