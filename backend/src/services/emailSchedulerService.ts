import cron from 'node-cron';
import gmailService from './gmailService';
import claudeService from './claudeService';
import emailProcessor from '../utils/emailProcessor';

interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string; // e.g., '*/30 * * * *' for every 30 minutes
  lastRun?: Date;
  nextRun?: Date;
  processedCount?: number;
  errorCount?: number;
}

class EmailSchedulerService {
  private task: cron.ScheduledTask | null = null;
  private config: SchedulerConfig = {
    enabled: false,
    cronExpression: '*/30 * * * *', // Default: every 30 minutes
    processedCount: 0,
    errorCount: 0
  };
  private io: any = null;

  /**
   * Initialize the scheduler with Socket.io for real-time updates
   */
  initialize(io: any) {
    this.io = io;
    console.log('📅 Email scheduler service initialized');
  }

  /**
   * Start automatic email processing
   */
  start(cronExpression?: string) {
    if (this.task) {
      this.stop();
    }

    const expression = cronExpression || this.config.cronExpression;

    // Validate cron expression
    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    this.config.cronExpression = expression;
    this.config.enabled = true;

    this.task = cron.schedule(expression, async () => {
      await this.processEmails();
    });

    console.log(`✅ Email scheduler started with cron: ${expression}`);
    this.logToFrontend('📅 Email scheduler started - automatic processing enabled', 'success');

    // Calculate next run
    this.updateNextRun();

    return this.getStatus();
  }

  /**
   * Stop automatic email processing
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    this.config.enabled = false;
    
    console.log('⏹️ Email scheduler stopped');
    this.logToFrontend('⏹️ Email scheduler stopped', 'info');

    return this.getStatus();
  }

  /**
   * Process emails (called by cron or manually)
   */
  async processEmails() {
    console.log('🔄 Running scheduled email processing...');
    this.logToFrontend('🔄 Running scheduled email processing...', 'info');
    
    this.config.lastRun = new Date();

    try {
      // Get unprocessed emails
      const emails = await gmailService.getUnprocessedEmails();
      
      if (emails.length === 0) {
        console.log('📭 No new emails to process');
        this.logToFrontend('📭 No new emails to process', 'info');
        this.updateNextRun();
        return { processed: 0 };
      }

      console.log(`📧 Found ${emails.length} emails to process`);
      this.logToFrontend(`📧 Found ${emails.length} emails to process`, 'info');

      let processed = 0;
      let invoices = 0;
      let jobOffers = 0;
      let spam = 0;

      for (const email of emails) {
        try {
          // Classify email using Claude
          const classification = await claudeService.classifyEmail(email);

          switch (classification.category) {
            case 'invoice':
              await emailProcessor.handleInvoice(email, classification);
              invoices++;
              break;
            case 'job_offer':
              await emailProcessor.handleJobOffer(email, classification);
              jobOffers++;
              break;
            case 'spam':
              await emailProcessor.handleSpam(email);
              spam++;
              break;
            default:
              // Other category - just mark as processed
              await gmailService.addLabel(email.id, 'Processed');
          }

          processed++;
          this.config.processedCount = (this.config.processedCount || 0) + 1;
        } catch (error: any) {
          console.error(`❌ Error processing email ${email.id}:`, error.message);
          this.config.errorCount = (this.config.errorCount || 0) + 1;
        }
      }

      const summary = `✅ Processed ${processed} emails: ${invoices} invoices, ${jobOffers} job offers, ${spam} spam`;
      console.log(summary);
      this.logToFrontend(summary, 'success');

      this.updateNextRun();

      return { processed, invoices, jobOffers, spam };
    } catch (error: any) {
      console.error('❌ Error in scheduled processing:', error.message);
      this.logToFrontend(`❌ Scheduled processing error: ${error.message}`, 'error');
      this.config.errorCount = (this.config.errorCount || 0) + 1;
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerConfig & { isRunning: boolean } {
    return {
      ...this.config,
      isRunning: this.task !== null && this.config.enabled
    };
  }

  /**
   * Update cron expression
   */
  updateSchedule(cronExpression: string) {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    if (this.config.enabled) {
      this.stop();
      this.start(cronExpression);
    } else {
      this.config.cronExpression = cronExpression;
    }

    return this.getStatus();
  }

  /**
   * Calculate and update next run time
   */
  private updateNextRun() {
    if (!this.task) {
      this.config.nextRun = undefined;
      return;
    }

    // Simple calculation based on cron expression
    // For more accurate calculation, would need a cron parser library
    const parts = this.config.cronExpression.split(' ');
    const minutes = parts[0];
    
    const now = new Date();
    const nextRun = new Date(now);

    if (minutes.startsWith('*/')) {
      const interval = parseInt(minutes.slice(2));
      const currentMinutes = now.getMinutes();
      const nextMinutes = Math.ceil((currentMinutes + 1) / interval) * interval;
      nextRun.setMinutes(nextMinutes);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
    }

    this.config.nextRun = nextRun;
  }

  /**
   * Log message to frontend via Socket.io
   */
  private logToFrontend(message: string, type: string) {
    if (this.io) {
      this.io.emit('log', { message, type });
    }
  }

  /**
   * Get common cron presets
   */
  static getCronPresets() {
    return [
      { label: 'Every 5 minutes', value: '*/5 * * * *' },
      { label: 'Every 15 minutes', value: '*/15 * * * *' },
      { label: 'Every 30 minutes', value: '*/30 * * * *' },
      { label: 'Every hour', value: '0 * * * *' },
      { label: 'Every 2 hours', value: '0 */2 * * *' },
      { label: 'Every day at 9 AM', value: '0 9 * * *' },
      { label: 'Every day at 6 PM', value: '0 18 * * *' },
      { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
      { label: 'Twice daily (9 AM & 6 PM)', value: '0 9,18 * * *' }
    ];
  }
}

export default new EmailSchedulerService();


