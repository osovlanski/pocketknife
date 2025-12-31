import { Router } from 'express';
import { searchLearningResources, summarizeArticle } from '../controllers/learningController';

const router = Router();

// Search for learning resources
router.post('/search', searchLearningResources);

// Summarize an article
router.post('/summarize', summarizeArticle);

export default router;

