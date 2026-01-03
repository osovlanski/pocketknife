import { Request, Response } from 'express';
import gmailService from '../services/email/gmailService';
import claudeService from '../services/core/claudeService';
import driveService from '../services/email/driveService';
import emailProcessor from '../utils/emailProcessor';
import emailSchedulerService from '../services/email/emailSchedulerService';
import processControlService from '../services/core/processControlService';
// Import notification services only for test endpoint
import emailNotificationService from '../services/email/emailNotificationService';
import discordNotificationService from '../services/notifications/discordNotificationService';
import telegramNotificationService from '../services/notifications/telegramNotificationService';

// Helper for consistent logging
const emitLog = (io: any, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  if (io) {
    io.emit('log', { message, type, agent: 'email' });
    io.emit('email-log', { message, type }); // Keep legacy event for backward compatibility
  }
};

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
        
        // Start process and track it
        processControlService.startProcess('email');
        
        console.log('📧 Starting to process all emails...');
        emitLog(io, '🚀 Starting email processing...', 'info');
        
        const emails = await gmailService.getUnprocessedEmails();
        console.log(`📬 Found ${emails.length} unprocessed emails`);
        emitLog(io, `📬 Found ${emails.length} unread email(s) to process`, 'info');
        
        const results = {
            processed: 0,
            invoices: 0,
            jobOffers: 0,
            official: 0,
            spam: 0,
            errors: 0,
            total: emails.length
        };

        let wasStopped = false;

        for (let i = 0; i < emails.length; i++) {
            // Check for stop signal before processing each email
            if (processControlService.shouldStop('email')) {
                console.log('🛑 Stop signal received - halting email processing');
                wasStopped = true;
                break;
            }

            const email = emails[i];
            const emailNum = i + 1;
            const remaining = emails.length - i - 1;
            
            try {
                console.log(`Processing email: ${email.subject}`);
                emitLog(io, `📧 [${emailNum}/${emails.length}] Processing: "${email.subject.substring(0, 60)}${email.subject.length > 60 ? '...' : ''}"`, 'info');
                
                const classification = await claudeService.classifyEmail(email);
                console.log(`Classification: ${classification.category} (${classification.confidence})`);
                
                // Check for stop signal after classification (API call)
                if (processControlService.shouldStop('email')) {
                    console.log('🛑 Stop signal received after classification - halting');
                    wasStopped = true;
                    break;
                }
                
                if (classification.confidence >= parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.75')) {
                    // Delegate to emailProcessor for consistent business logic
                    switch (classification.category) {
                        case 'INVOICE':
                            emitLog(io, `📄 Classified as INVOICE (${Math.round(classification.confidence * 100)}% confident)`, 'success');
                            const invoiceResult = await emailProcessor.handleInvoice(email, classification);
                            emitLog(io, `💾 Invoice saved to Google Drive: ${classification.suggested_filename || 'invoice.pdf'}`, 'success');
                            results.invoices++;
                            break;
                        
                        case 'JOB_OFFER':
                            emitLog(io, `💼 Classified as JOB OFFER (${Math.round(classification.confidence * 100)}% confident)`, 'success');
                            const jobResult = await emailProcessor.handleJobOffer(email, classification);
                            emitLog(io, `📧 Job offer notification sent to ${process.env.ALERT_EMAIL}`, 'success');
                            results.jobOffers++;
                            break;
                        
                        case 'SPAM':
                            emitLog(io, `🗑️ Classified as SPAM (${Math.round(classification.confidence * 100)}% confident) - Moving to spam folder`, 'warning');
                            await emailProcessor.handleSpam(email);
                            results.spam++;
                            break;
                        
                        case 'OFFICIAL':
                            emitLog(io, `🏛️ Classified as OFFICIAL (${Math.round(classification.confidence * 100)}% confident) - Government/Municipality email`, 'success');
                            await emailProcessor.handleOfficial(email, classification);
                            emitLog(io, '📁 Official email saved and labeled', 'success');
                            results.official++;
                            break;
                    }
                    
                    await gmailService.addLabel(email.id, 'processed');
                    results.processed++;
                    
                    emitLog(io, `✅ Email ${emailNum}/${emails.length} processed (${remaining} remaining)`, 'info');
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
                
                emitLog(io, `❌ Error processing email: ${errorMsg}`, 'error');
                
                results.errors++;
            }
        }

        // Complete the process
        processControlService.completeProcess('email', wasStopped);

        if (wasStopped) {
            emitLog(io, `⏹️ Processing stopped. Processed: ${results.processed}/${emails.length} emails before stopping.`, 'warning');
        } else {
            console.log('✅ All emails processed:', results);
            emitLog(io, `✅ Processing complete! Processed: ${results.processed}, Invoices: ${results.invoices}, Job Offers: ${results.jobOffers}, Official: ${results.official}, Spam: ${results.spam}${results.errors > 0 ? `, Errors: ${results.errors}` : ''}`, 'success');
            
            // Analyze patterns for rule suggestions (only when processing completed)
            if (emails.length >= 5 && !wasStopped) {
                try {
                    emitLog(io, '🔍 Analyzing email patterns for new rules...', 'info');
                    const patternAnalysis = await claudeService.analyzeEmailPatterns(emails);
                    
                    if (patternAnalysis.suggestedRules.length > 0) {
                        emitLog(io, `💡 Found ${patternAnalysis.suggestedRules.length} potential new rules`, 'success');
                        patternAnalysis.suggestedRules.forEach(rule => {
                            emitLog(io, `  📋 ${rule.type}: "${rule.pattern}" → ${rule.suggestedCategory} (${Math.round(rule.confidence * 100)}%)`, 'info');
                        });
                    }
                    
                    // Add suggested rules to response
                    (results as any).suggestedRules = patternAnalysis.suggestedRules;
                } catch (patternError) {
                    console.warn('Pattern analysis failed:', patternError);
                }
            }
        }

        res.status(200).json({ 
            message: wasStopped ? 'Processing stopped by user' : 'All emails processed', 
            stopped: wasStopped,
            results 
        });
    } catch (error) {
        // Make sure to complete the process on error
        processControlService.completeProcess('email', false);
        
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
        const result = await driveService.listInvoices();
        
        // Check if authentication is required
        if (result.authRequired) {
            res.status(200).json({ 
                invoices: [],
                authRequired: true,
                message: result.message,
                driveFolder: process.env.GOOGLE_DRIVE_FOLDER_ID 
            });
            return;
        }

        res.status(200).json({ 
            invoices: result.invoices,
            authRequired: false,
            driveFolder: process.env.GOOGLE_DRIVE_FOLDER_ID 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching invoices', 
            error: (error as Error).message 
        });
    }
};

export const getGoogleAuthStatus = async (req: Request, res: Response) => {
    try {
        const isAuthenticated = driveService.isAuthenticated();
        const authUrl = !isAuthenticated ? driveService.getAuthUrl() : null;
        
        res.status(200).json({ 
            authenticated: isAuthenticated,
            authUrl: authUrl,
            message: isAuthenticated 
                ? 'Google services connected' 
                : 'Google services not connected. Run "npm run auth:gmail" in the backend folder, or use the auth URL below.'
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error checking Google auth status', 
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