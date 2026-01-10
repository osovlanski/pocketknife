/**
 * Shopping Routes
 * 
 * API endpoints for product search, deals, and price tracking.
 */

import { Router } from 'express';
import * as shoppingController from '../controllers/shoppingController';

const router = Router();

// Product search
router.post('/search', shoppingController.searchProducts);
router.post('/search/hobby', shoppingController.searchByHobby);
router.post('/search/stop', shoppingController.stopSearch);

// Deals
router.get('/deals', shoppingController.getDeals);

// Saved products
router.get('/saved', shoppingController.getSavedProducts);
router.post('/products/:id/save', shoppingController.saveProduct);
router.post('/products/:id/unsave', shoppingController.unsaveProduct);

// Price alerts
router.get('/alerts', shoppingController.getPriceAlerts);
router.post('/products/:id/alert', shoppingController.setPriceAlert);

// User interests
router.put('/interests', shoppingController.updateInterests);

// AI suggestions
router.get('/suggestions', shoppingController.getSuggestions);

export default router;




