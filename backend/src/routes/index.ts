import { Router } from 'express';
import { 
    classifyEmail, 
    processEmail, 
    getUnprocessedEmails, 
    processAllEmails, 
    testNotification,
    getInvoices,
    getGoogleAuthStatus,
    getSchedulerStatus,
    startScheduler,
    stopScheduler,
    updateSchedule
} from '../controllers/agentController';
import * as configController from '../controllers/configController';
import jobRoutes from './jobs';
import travelRoutes from './travel';
import learningRoutes from './learning';
import problemSolvingRoutes from './problemSolving';
import authRoutes from './auth';
import agentsRoutes from './agents';
import autocompleteRoutes from './autocomplete';

const router = Router();

// Email Agent routes (with /agent prefix)
router.post('/agent/classify', classifyEmail);
router.post('/agent/process', processEmail);
router.get('/agent/emails', getUnprocessedEmails);
router.post('/agent/process-all', processAllEmails);
router.post('/agent/test-notification', testNotification);
router.get('/agent/invoices', getInvoices);
router.get('/agent/google-auth-status', getGoogleAuthStatus);

// Email Scheduler routes (automation)
router.get('/agent/scheduler/status', getSchedulerStatus);
router.post('/agent/scheduler/start', startScheduler);
router.post('/agent/scheduler/stop', stopScheduler);
router.put('/agent/scheduler/update', updateSchedule);

// Job search routes
router.use('/jobs', jobRoutes);

// Travel search routes
router.use('/travel', travelRoutes);

// Learning agent routes
router.use('/learning', learningRoutes);

// Problem solving agent routes
router.use('/problems', problemSolvingRoutes);

// Configuration routes
router.get('/config', configController.getConfig);
router.post('/config', configController.updateConfig);

// Auth routes (Google OAuth)
router.use('/auth', authRoutes);

// Unified Agent API routes
router.use('/agents', agentsRoutes);

// Autocomplete routes (with caching)
router.use('/autocomplete', autocompleteRoutes);

export default router;