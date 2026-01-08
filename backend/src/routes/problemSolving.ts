import { Router } from 'express';
import { 
  searchProblems, 
  generateHints, 
  evaluateCode, 
  getProblemDescription,
  generateSignature,
  generateImprovedCode,
  getCompanyInterviewProfile,
  getAllCompanies,
  getCuratedLists,
  saveSolvedProblem,
  getSolvedProblems,
  getSolvedProblemCode,
  runTests
} from '../controllers/problemSolvingController';

const router = Router();

// Search for coding problems
router.post('/search', searchProblems);

// Get full problem description
router.get('/description/:titleSlug', getProblemDescription);

// Generate hints for a problem
router.post('/hints', generateHints);

// Evaluate submitted code
router.post('/evaluate', evaluateCode);

// Generate problem-specific method signature
router.post('/signature', generateSignature);

// Generate improved code from suggestions
router.post('/improve', generateImprovedCode);

// Get company interview profile and tips
router.get('/company/:companyName', getCompanyInterviewProfile);

// Get all available companies
router.get('/companies', getAllCompanies);

// Get curated problem lists info
router.get('/curated-lists', getCuratedLists);

// Save solved problem to database
router.post('/save', saveSolvedProblem);

// Get user's solved problems
router.get('/solved', getSolvedProblems);

// Get specific solved problem with code
router.get('/solved/:problemId/:source?', getSolvedProblemCode);

// Run code against test cases
router.post('/test', runTests);

export default router;


