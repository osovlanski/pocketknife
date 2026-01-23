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

// Company search (find company info and their jobs)
router.post('/company/search', jobController.searchCompany);
router.get('/companies/list', jobController.getCompaniesWithJobs);
router.get('/companies/trending', jobController.getTrendingCompanies);

// Preferences
router.put('/preferences', jobController.updateJobPreferences);

// Mock Interview
router.post('/interview/extract', jobController.extractInterviewQuestions);
router.post('/interview/generate-answer', jobController.generateInterviewAnswer);
router.post('/interview/evaluate', jobController.evaluateInterviewAnswer);

// Example Interview Questions (Glassdoor-style)
router.post('/interview/example-questions', jobController.getExampleQuestions);
router.get('/interview/popular-companies', jobController.getPopularCompanyQuestions);

// System Design
router.post('/interview/system-design/evaluate', jobController.evaluateSystemDesign);
router.get('/interview/system-design/questions', jobController.getSystemDesignQuestions);
router.post('/interview/system-design/generate', jobController.generateSystemDesignDiagram);

export default router;
