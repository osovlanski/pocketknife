import { Request, Response } from 'express';
import gmailService from '../services/gmailService';
import claudeService from '../services/claudeService';
import driveService from '../services/driveService';
import emailProcessor from '../utils/emailProcessor';
import emailSchedulerService from '../services/emailSchedulerService';
// Import notification services only for test endpoint
import emailNotificationService from '../services/emailNotificationService';
import discordNotificationService from '../services/discordNotificationService';
import telegramNotificationService from '../services/telegramNotificationService';

export const classifyEmail = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const classification = await claudeService.classifyEmail(email);
        res.status(200).json(classification);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error classifying email', 
            error: (error as Error).message 
        });
    }
};

export const processEmail = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const classification = await claudeService.classifyEmail(email);
        
        // Delegate to emailProcessor for business logic
        if (classification.category === 'INVOICE') {
            await emailProcessor.handleInvoice(email, classification);
        } else if (classification.category === 'JOB_OFFER') {
            await emailProcessor.handleJobOffer(email, classification);
        } else if (classification.category === 'SPAM') {
            await emailProcessor.handleSpam(email);
        }
        
        res.status(200).json({ 
            message: 'Email processed successfully', 
            classification 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error processing email', 
            error: (error as Error).message 
        });
    }
};

export const getUnprocessedEmails = async (req: Request, res: Response) => {
    try {
        const emails = await gmailService.getUnprocessedEmails();
        res.status(200).json(emails);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching emails', 
            error: (error as Error).message 
        });
    }
};

export const processAllEmails = async (req: Request, res: Response) => {
    try {
        const io = req.app.get('io');
        
        console.log('📧 Starting to process all emails...');
        io.emit('log', { message: '🚀 Starting email processing...', type: 'info' });
        
        const emails = await gmailService.getUnprocessedEmails();
        console.log(`📬 Found ${emails.length} unprocessed emails`);
        io.emit('log', { 
            message: `📬 Found ${emails.length} unread email(s) to process`, 
            type: 'info',
            details: { total: emails.length }
        });
        
        const results = {
            processed: 0,
            invoices: 0,
            jobOffers: 0,
            spam: 0,
            errors: 0,
            total: emails.length
        };

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const emailNum = i + 1;
            const remaining = emails.length - i - 1;
            
            try {
                console.log(`Processing email: ${email.subject}`);
                io.emit('log', { 
                    message: `📧 [${emailNum}/${emails.length}] Processing: "${email.subject.substring(0, 60)}${email.subject.length > 60 ? '...' : ''}"`, 
                    type: 'info',
                    details: { current: emailNum, total: emails.length, remaining }
                });
                
                const classification = await claudeService.classifyEmail(email);
                console.log(`Classification: ${classification.category} (${classification.confidence})`);
                
                if (classification.confidence >= parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.75')) {
                    // Delegate to emailProcessor for consistent business logic
                    switch (classification.category) {
                        case 'INVOICE':
                            io.emit('log', { 
                                message: `📄 Classified as INVOICE (${Math.round(classification.confidence * 100)}% confident)`, 
                                type: 'success',
                                details: { category: 'INVOICE', confidence: classification.confidence }
                            });
                            const invoiceResult = await emailProcessor.handleInvoice(email, classification);
                            io.emit('log', { 
                                message: `💾 Invoice saved to Google Drive: ${classification.suggested_filename || 'invoice.pdf'}`, 
                                type: 'success',
                                details: { filename: classification.suggested_filename }
                            });
                            results.invoices++;
                            break;
                        
                        case 'JOB_OFFER':
                            io.emit('log', { 
                                message: `💼 Classified as JOB OFFER (${Math.round(classification.confidence * 100)}% confident)`, 
                                type: 'success',
                                details: { category: 'JOB_OFFER', confidence: classification.confidence }
                            });
                            const jobResult = await emailProcessor.handleJobOffer(email, classification);
                            io.emit('log', { 
                                message: `📧 Job offer notification sent to ${process.env.ALERT_EMAIL}`, 
                                type: 'success',
                                details: { email: process.env.ALERT_EMAIL }
                            });
                            results.jobOffers++;
                            break;
                        
                        case 'SPAM':
                            io.emit('log', { 
                                message: `🗑️ Classified as SPAM (${Math.round(classification.confidence * 100)}% confident) - Moving to spam folder`, 
                                type: 'warning',
                                details: { category: 'SPAM', confidence: classification.confidence }
                            });
                            await emailProcessor.handleSpam(email);
                            results.spam++;
                            break;
                    }
                    
                    await gmailService.addLabel(email.id, 'processed');
                    results.processed++;
                    
                    io.emit('log', { 
                        message: `✅ Email ${emailNum}/${emails.length} processed (${remaining} remaining)`, 
                        type: 'info',
                        details: { current: emailNum, total: emails.length, remaining }
                    });
                }
            } catch (error: any) {
                console.error(`❌ Error processing email ${email.id}:`, error);
                
                // Enhanced error logging
                let errorMsg = error.message || 'Unknown error';
                if (error.message?.includes('Connection error') || error.code === 'ECONNREFUSED') {
                    errorMsg = 'API Connection Error - Check internet connection';
                    console.error('❌ API Connection Error - Check internet connection');
                } else if (error.message?.includes('authentication')) {
                    errorMsg = 'Authentication Error - Check API key';
                    console.error('❌ Authentication Error - Check API key');
                }
                
                io.emit('log', { 
                    message: `❌ Error processing email: ${errorMsg}`, 
                    type: 'error',
                    details: { error: errorMsg }
                });
                
                results.errors++;
            }
        }

        console.log('✅ All emails processed:', results);
        io.emit('log', { 
            message: `✅ Processing complete! Processed: ${results.processed}, Invoices: ${results.invoices}, Job Offers: ${results.jobOffers}, Spam: ${results.spam}${results.errors > 0 ? `, Errors: ${results.errors}` : ''}`, 
            type: 'success',
            details: results
        });
        res.status(200).json({ 
            message: 'All emails processed', 
            results 
        });
    } catch (error) {
        console.error('❌ Error in processAllEmails:', error);
        res.status(500).json({ 
            message: 'Error processing emails', 
            error: (error as Error).message,
            stack: (error as Error).stack
        });
    }
};

export const testNotification = async (req: Request, res: Response) => {
    try {
        const testEmail = {
            id: 'test-123',
            subject: 'Test Notification',
            from: 'test@example.com',
            date: new Date().toISOString(),
            snippet: 'This is a test notification',
            body: 'Test notification body'
        };

        const testClassification = {
            category: 'JOB_OFFER',
            confidence: 0.95,
            key_details: 'Test job offer details',
            reasoning: 'This is a test'
        };

        const notificationMethod = process.env.NOTIFICATION_METHOD || 'email';

        switch (notificationMethod) {
            case 'email':
                await emailNotificationService.sendJobOfferAlert(testEmail, testClassification);
                break;
            case 'discord':
                await discordNotificationService.sendJobOfferAlert(testEmail, testClassification);
                break;
            case 'telegram':
                await telegramNotificationService.sendJobOfferAlert(testEmail, testClassification);
                break;
            case 'all':
                await Promise.all([
                    emailNotificationService.sendJobOfferAlert(testEmail, testClassification),
                    discordNotificationService.sendJobOfferAlert(testEmail, testClassification),
                    telegramNotificationService.sendJobOfferAlert(testEmail, testClassification)
                ]);
                break;
        }

        res.status(200).json({ 
            message: 'Test notification sent successfully',
            method: notificationMethod 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error sending test notification', 
            error: (error as Error).message 
        });
    }
};

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const invoices = await driveService.listInvoices();
        res.status(200).json({ 
            invoices,
            driveFolder: process.env.GOOGLE_DRIVE_FOLDER_ID 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching invoices', 
            error: (error as Error).message 
        });
    }
};

// ============ Scheduler Endpoints ============

export const getSchedulerStatus = async (req: Request, res: Response) => {
    try {
        const status = emailSchedulerService.getStatus();
        const presets = (emailSchedulerService.constructor as any).getCronPresets();
        res.status(200).json({ status, presets });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error getting scheduler status', 
            error: (error as Error).message 
        });
    }
};

export const startScheduler = async (req: Request, res: Response) => {
    try {
        const { cronExpression } = req.body;
        const status = emailSchedulerService.start(cronExpression);
        res.status(200).json({ 
            message: 'Scheduler started successfully',
            status 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error starting scheduler', 
            error: (error as Error).message 
        });
    }
};

export const stopScheduler = async (req: Request, res: Response) => {
    try {
        const status = emailSchedulerService.stop();
        res.status(200).json({ 
            message: 'Scheduler stopped successfully',
            status 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error stopping scheduler', 
            error: (error as Error).message 
        });
    }
};

export const updateSchedule = async (req: Request, res: Response) => {
    try {
        const { cronExpression } = req.body;
        if (!cronExpression) {
            return res.status(400).json({ message: 'cronExpression is required' });
        }
        const status = emailSchedulerService.updateSchedule(cronExpression);
        res.status(200).json({ 
            message: 'Schedule updated successfully',
            status 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error updating schedule', 
            error: (error as Error).message 
        });
    }
};