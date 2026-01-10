/**
 * Groceries Controller
 * 
 * HTTP request handlers for grocery management, shopping lists, and recipes.
 * Thin controller - delegates to groceriesAgent for business logic.
 */

import { Request, Response } from 'express';
import { groceriesAgent } from '../agents';
import { databaseService } from '../services/core/databaseService';

/**
 * Get user ID from request
 */
const getUserId = async (req: Request): Promise<string | undefined> => {
  const email = req.headers['x-user-email'] as string;
  if (!email) return undefined;

  const user = await databaseService.getOrCreateUser(email);
  return user?.id;
};

// =============================================================================
// GROCERY ITEMS
// =============================================================================

/**
 * Add a new grocery item
 */
export const addItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await groceriesAgent.execute({
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
 * Update an existing grocery item
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await groceriesAgent.execute({
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
 * Delete a grocery item
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await groceriesAgent.execute({
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
 * Get all grocery items with optional filters
 */
export const getItems = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status, category, expiringWithinDays, lowStock } = req.query;

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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

    const result = await groceriesAgent.execute({
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
