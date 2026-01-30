/**
 * Cooking Routes
 *
 * API endpoints for kitchen inventory, shopping lists, recipes, and wishlist.
 */

import { Router } from 'express';
import * as cookingController from '../controllers/cookingController';
import { ramiLevyLimiter } from '../middleware';

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

// =============================================================================
// DELIVERY / RECIPE ORDERING
// =============================================================================

router.post('/recipes/order', cookingController.createRecipeOrder);
router.get('/delivery/providers', cookingController.getDeliveryProviders);

// Wolt Drive actual delivery (dispatches courier)
router.post('/delivery/wolt/order', cookingController.placeWoltOrder);
router.get('/delivery/wolt/status/:deliveryId', cookingController.getWoltOrderStatus);
router.post('/delivery/wolt/cancel/:deliveryId', cookingController.cancelWoltOrder);

// =============================================================================
// RAMI LEVY INTEGRATION (Auto Cart Population)
// All Rami Levy endpoints have specific rate limiting (20 req/min)
// =============================================================================

// Token management
router.post('/rami-levy/setup', ramiLevyLimiter, cookingController.ramiLevySetup);
router.get('/rami-levy/status', ramiLevyLimiter, cookingController.ramiLevyStatus);
router.delete('/rami-levy/tokens', ramiLevyLimiter, cookingController.ramiLevyDeleteTokens);

// Product search
router.get('/rami-levy/search', ramiLevyLimiter, cookingController.ramiLevySearch);

// Cart operations
router.get('/rami-levy/cart', ramiLevyLimiter, cookingController.ramiLevyGetCart);
router.post('/rami-levy/cart/add', ramiLevyLimiter, cookingController.ramiLevyAddToCart);
router.post('/rami-levy/cart/remove', ramiLevyLimiter, cookingController.ramiLevyRemoveFromCart);
router.post('/rami-levy/cart/update', ramiLevyLimiter, cookingController.ramiLevyUpdateQuantity);
router.post('/rami-levy/cart/clear', ramiLevyLimiter, cookingController.ramiLevyClearCart);

// Checkout
router.get('/rami-levy/checkout', ramiLevyLimiter, cookingController.ramiLevyCheckout);

// Main flow - order ingredients from a recipe
router.post('/rami-levy/order-ingredients', ramiLevyLimiter, cookingController.ramiLevyOrderIngredients);

export default router;
