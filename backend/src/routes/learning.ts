import { Router } from 'express';
import { searchLearningResources, summarizeArticle, getLinkedInInfo, configureLinkedIn, generateTopicSummary } from '../controllers/learningController';

const router = Router();

// Search for learning resources
router.post('/search', searchLearningResources);

// Summarize an article
router.post('/summarize', summarizeArticle);

// Get LinkedIn integration info
router.get('/linkedin-info', getLinkedInInfo);

// Configure LinkedIn integration
router.post('/linkedin-config', configureLinkedIn);

// Generate AI topic summary
router.post('/topic-summary', generateTopicSummary);

export default router;

