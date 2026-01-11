/**
 * DIY Agent Routes
 */

import { Router } from 'express';
import * as controller from '../controllers/diyController';

const router = Router();

// Project generation
router.post('/generate', controller.generateProject);

// Project CRUD
router.get('/projects', controller.getProjects);
router.get('/projects/:id', controller.getProject);
router.post('/projects', controller.saveProject);
router.patch('/projects/:id/status', controller.updateProjectStatus);
router.post('/projects/:id/feedback', controller.addFeedback);

// Materials & Shopping
router.post('/materials/links', controller.getMaterialsWithLinks);
router.post('/shopping-list', controller.createShoppingList);

// Ideas & Templates
router.get('/ideas', controller.searchIdeas);
router.get('/ideas/featured', controller.getFeaturedIdeas);
router.get('/ideas/inspire', controller.getInspiration);
router.get('/templates', controller.getTemplates);
router.get('/categories', controller.getCategories);

export default router;


