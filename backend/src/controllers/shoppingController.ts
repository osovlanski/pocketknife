/**
 * Shopping Controller
 * 
 * Handles HTTP requests for product search, deal finding,
 * and price tracking.
 */

import { Request, Response } from 'express';
import { shoppingAgent } from '../agents/ShoppingAgent';
import { databaseService } from '../services/core/databaseService';

/**
 * Get the effective user ID (from request or default user)
 */
const getEffectiveUserId = async (requestUserId?: string): Promise<string | null> => {
  if (requestUserId && requestUserId !== 'default-user') {
    return requestUserId;
  }
  const defaultUser = await databaseService.getDefaultUser();
  return defaultUser?.id || null;
};

/**
 * Search products across sources
 */
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { userId: requestUserId, query, sources, filters } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please ensure database is configured.' });
    }

    const result = await shoppingAgent.execute({
      action: 'search-products',
      userId,
      query,
      sources,
      filters
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

/**
 * Search products by hobby/interests
 */
export const searchByHobby = async (req: Request, res: Response) => {
  try {
    const { userId: requestUserId, hobbies, query } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'search-by-hobby',
      userId,
      hobbies,
      query
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Search by hobby error:', error);
    res.status(500).json({ error: 'Failed to search by hobby' });
  }
};

/**
 * Get top deals
 */
export const getDeals = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const filters = {
      source: req.query.source as string,
      category: req.query.category as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      minDealScore: req.query.minDealScore ? parseFloat(req.query.minDealScore as string) : undefined
    };

    const result = await shoppingAgent.execute({
      action: 'get-deals',
      userId,
      filters
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to get deals' });
  }
};

/**
 * Save a product to favorites
 */
export const saveProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'save-product',
      userId,
      productId: id
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Save product error:', error);
    res.status(500).json({ error: 'Failed to save product' });
  }
};

/**
 * Remove a product from favorites
 */
export const unsaveProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'unsave-product',
      userId,
      productId: id
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Unsave product error:', error);
    res.status(500).json({ error: 'Failed to unsave product' });
  }
};

/**
 * Get saved products
 */
export const getSavedProducts = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'get-saved-products',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get saved products error:', error);
    res.status(500).json({ error: 'Failed to get saved products' });
  }
};

/**
 * Set a price alert
 */
export const setPriceAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId: requestUserId, targetPrice } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'set-price-alert',
      userId,
      productId: id,
      targetPrice
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Set price alert error:', error);
    res.status(500).json({ error: 'Failed to set price alert' });
  }
};

/**
 * Get active price alerts
 */
export const getPriceAlerts = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'get-price-alerts',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get price alerts error:', error);
    res.status(500).json({ error: 'Failed to get price alerts' });
  }
};

/**
 * Update user interests
 */
export const updateInterests = async (req: Request, res: Response) => {
  try {
    const { userId: requestUserId, interests } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'update-interests',
      userId,
      interests
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Update interests error:', error);
    res.status(500).json({ error: 'Failed to update interests' });
  }
};

/**
 * Get AI-powered product suggestions
 */
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await shoppingAgent.execute({
      action: 'get-suggestions',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

/**
 * Stop ongoing search
 */
export const stopSearch = async (req: Request, res: Response) => {
  try {
    shoppingAgent.stop();
    res.json({ success: true, message: 'Search stopped' });
  } catch (error: any) {
    console.error('Stop search error:', error);
    res.status(500).json({ error: 'Failed to stop search' });
  }
};

