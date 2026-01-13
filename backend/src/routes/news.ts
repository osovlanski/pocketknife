/**
 * News Agent Routes
 */

import { Router } from 'express';
import * as controller from '../controllers/newsController';

const router = Router();

// Search
router.post('/search', controller.searchNews);

// Feed & Digest
router.get('/feed', controller.getFeed);
router.get('/digest', controller.getDigest);

// Articles
router.post('/articles/save', controller.saveArticle);
router.get('/articles/saved', controller.getSavedArticles);
router.post('/articles/summarize', controller.summarizeArticle);

// Interactions (for learning)
router.post('/interactions', controller.recordInteraction);

// Trends
router.get('/trends', controller.getTrends);

// Preferences
router.get('/preferences', controller.getPreferences);
router.put('/preferences', controller.updatePreferences);

export default router;



