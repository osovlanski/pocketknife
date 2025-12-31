import { Router } from 'express';
import { 
    classifyEmail, 
    processEmail, 
    getUnprocessedEmails, 
    processAllEmails, 
    testNotification,
    getInvoices 
} from '../controllers/agentController';

const router = Router();

// Route to classify an email
router.post('/classify', classifyEmail);

// Route to process a single email
router.post('/process', processEmail);

// Route to get unprocessed emails
router.get('/emails', getUnprocessedEmails);

// Route to process all unprocessed emails
router.post('/process-all', processAllEmails);

// Route to test notification
router.post('/test-notification', testNotification);

// Route to get all invoices from Drive
router.get('/invoices', getInvoices);

export default router;