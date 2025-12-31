import { Router } from 'express';
import * as jobController from '../controllers/jobController';

const router = Router();

// CV upload and analysis
router.post('/cv/upload', jobController.uploadCV);
router.get('/cv/data', jobController.getCVData);

// Job search
router.post('/search', jobController.searchJobs);
router.get('/listings', jobController.getJobListings);

// Preferences
router.put('/preferences', jobController.updateJobPreferences);

export default router;
