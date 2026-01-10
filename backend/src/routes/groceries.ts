/**
 * Groceries Routes
 * 
 * API endpoints for grocery management, shopping lists, and recipes.
 */

import { Router } from 'express';
import * as groceriesController from '../controllers/groceriesController';

const router = Router();

// =============================================================================
// GROCERY ITEMS
// =============================================================================

// Item CRUD operations
router.post('/items', groceriesController.addItem);
router.get('/items', groceriesController.getItems);
router.put('/items/:id', groceriesController.updateItem);
router.delete('/items/:id', groceriesController.deleteItem);
router.put('/items/:id/status', groceriesController.updateItemStatus);

// Item alerts
router.get('/items/expiring', groceriesController.getExpiringItems);
router.get('/items/low-stock', groceriesController.getLowStockItems);

// =============================================================================
// SHOPPING LISTS
// =============================================================================

router.post('/lists', groceriesController.createList);
router.get('/lists', groceriesController.getLists);
router.post('/lists/:listId/items', groceriesController.addListItem);
router.put('/lists/items/:itemId/toggle', groceriesController.toggleListItem);
router.post('/lists/:listId/complete', groceriesController.completeList);

// =============================================================================
// RECIPES
// =============================================================================

router.post('/recipes/search', groceriesController.findRecipes);
router.post('/recipes', groceriesController.saveRecipe);
router.get('/recipes', groceriesController.getSavedRecipes);

// =============================================================================
// ANALYTICS
// =============================================================================

router.get('/summary', groceriesController.getSummary);
router.get('/suggestions', groceriesController.getSuggestions);

export default router;
