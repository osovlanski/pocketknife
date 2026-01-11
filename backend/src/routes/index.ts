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
import todoRoutes from './todo';
import shoppingRoutes from './shopping';
import cookingRoutes from './cooking';
import newsRoutes from './news';
import diyRoutes from './diy';
import adminRoutes from './admin';
import settingsRoutes from './settings';

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
router.get('/config/all', configController.getAllConfig);
router.post('/config', configController.updateConfig);

// Auth routes (Google OAuth)
router.use('/auth', authRoutes);

// Unified Agent API routes
router.use('/agents', agentsRoutes);

// Autocomplete routes (with caching)
router.use('/autocomplete', autocompleteRoutes);

// ToDo agent routes
router.use('/todo', todoRoutes);

// Shopping agent routes
router.use('/shopping', shoppingRoutes);

// Cooking agent routes
router.use('/cooking', cookingRoutes);

// News agent routes
router.use('/news', newsRoutes);

// DIY agent routes
router.use('/diy', diyRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Settings routes (user preferences)
router.use('/settings', settingsRoutes);

export default router;