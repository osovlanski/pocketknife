/**
 * Cooking Routes
 * 
 * API endpoints for kitchen inventory, shopping lists, recipes, and wishlist.
 */

import { Router } from 'express';
import * as cookingController from '../controllers/cookingController';

const router = Router();

// =============================================================================
// INVENTORY ITEMS
// =============================================================================

// Item CRUD operations
router.post('/items', cookingController.addItem);
router.get('/items', cookingController.getItems);
router.put('/items/:id', cookingController.updateItem);
router.delete('/items/:id', cookingController.deleteItem);
router.put('/items/:id/status', cookingController.updateItemStatus);

// Item alerts
router.get('/items/expiring', cookingController.getExpiringItems);
router.get('/items/low-stock', cookingController.getLowStockItems);

// =============================================================================
// SHOPPING LISTS
// =============================================================================

router.post('/lists', cookingController.createList);
router.get('/lists', cookingController.getLists);
router.post('/lists/:listId/items', cookingController.addListItem);
router.put('/lists/items/:itemId/toggle', cookingController.toggleListItem);
router.post('/lists/:listId/complete', cookingController.completeList);

// =============================================================================
// RECIPES
// =============================================================================

router.post('/recipes/search', cookingController.findRecipes);
router.post('/recipes', cookingController.saveRecipe);
router.get('/recipes', cookingController.getSavedRecipes);

// =============================================================================
// RECIPE WISHLIST
// =============================================================================

router.post('/wishlist', cookingController.addToWishlist);
router.get('/wishlist', cookingController.getWishlist);
router.delete('/wishlist/:id', cookingController.removeFromWishlist);

// =============================================================================
// ANALYTICS
// =============================================================================

router.get('/summary', cookingController.getSummary);
router.get('/suggestions', cookingController.getSuggestions);

export default router;
