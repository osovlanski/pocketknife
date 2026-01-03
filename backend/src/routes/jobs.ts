import { Router } from 'express';
import * as jobController from '../controllers/jobController';

const router = Router();

// CV upload and analysis
router.post('/cv/upload', jobController.uploadCV);
router.get('/cv/data', jobController.getCVData);

// Job search
router.post('/search', jobController.searchJobs);
router.get('/listings', jobController.getJobListings);

// AI-powered search by requirements
router.post('/ai-search', jobController.aiSearch);

// Career path recommendations
router.post('/career-path', jobController.getCareerPath);

// Israeli tech jobs scraper
router.post('/israeli-jobs', jobController.searchIsraeliJobs);

// Company enrichment
router.get('/company/:companyName', jobController.getCompanyInfo);
router.post('/companies/enrich', jobController.enrichCompanies);

// Preferences
router.put('/preferences', jobController.updateJobPreferences);

export default router;
