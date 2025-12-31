import gmailService from '../services/gmailService';
import driveService from '../services/driveService';
import emailNotificationService from '../services/emailNotificationService';
import discordNotificationService from '../services/discordNotificationService';
import telegramNotificationService from '../services/telegramNotificationService';

class EmailProcessor {
  async initialize(oauth2Client: any) {
    await gmailService.initialize();
    await driveService.initialize();
    await emailNotificationService.initialize(oauth2Client);
    console.log('✅ Email processor initialized');
  }

  async handleJobOffer(email: any, classification: any) {
    console.log('💼 Processing job offer notification');

    // Send via all configured methods
    const notificationMethod = process.env.NOTIFICATION_METHOD || 'email';

    try {
      switch (notificationMethod) {
        case 'email':
          await emailNotificationService.sendJobOfferAlert(email, classification);
          break;
        case 'discord':
          await discordNotificationService.sendJobOfferAlert(email, classification);
          break;
        case 'telegram':
          await telegramNotificationService.sendJobOfferAlert(email, classification);
          break;
        case 'all':
          // Send to all configured services
          await Promise.allSettled([
            emailNotificationService.sendJobOfferAlert(email, classification),
            discordNotificationService.sendJobOfferAlert(email, classification),
            telegramNotificationService.sendJobOfferAlert(email, classification),
          ]);
          break;
        default:
          await emailNotificationService.sendJobOfferAlert(email, classification);
      }

      await gmailService.addLabel(email.id, 'Job-Offer');
      console.log('✅ Job offer processed');
    } catch (error) {
      console.error('❌ Error handling job offer:', error);
      throw error;
    }
  }

  async handleInvoice(email: any, classification: any) {
    console.log(`📄 Saving invoice: ${classification.suggested_filename}`);

    const content = `Invoice Email
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

${email.body}`;

    const driveFile = await driveService.uploadInvoice(
      classification.suggested_filename,
      content,
      'text/plain'
    );

    // Send notification
    const notificationMethod = process.env.NOTIFICATION_METHOD || 'email';

    switch (notificationMethod) {
      case 'email':
        await emailNotificationService.sendInvoiceAlert(
          email,
          classification.suggested_filename,
          driveFile.webViewLink || ''
        );
        break;
      case 'discord':
        await discordNotificationService.sendInvoiceAlert(
          email,
          classification.suggested_filename,
          driveFile.webViewLink || ''
        );
        break;
      case 'telegram':
        await telegramNotificationService.sendInvoiceAlert(
          email,
          classification.suggested_filename,
          driveFile.webViewLink || ''
        );
        break;
    }

    await gmailService.addLabel(email.id, 'Invoice-Saved');
  }

  async handleSpam(email: any) {
    console.log('🗑️ Moving spam to folder');
    await gmailService.moveToFolder(email.id, 'Spam-Commercial');
  }

  async handleOfficial(email: any, classification: any) {
    console.log('🏛️ Processing official/government email');
    
    // Save official emails to Drive for record keeping
    const content = `Official Email
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}
Category: Government/Municipality/Official
Key Details: ${classification.key_details || 'N/A'}

${email.body || email.snippet}`;

    try {
      const filename = `official_${email.subject.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_').substring(0, 50)}_${new Date().toISOString().substring(0, 10)}.txt`;
      
      await driveService.uploadInvoice(
        filename,
        content,
        'text/plain'
      );
      
      console.log(`📁 Official email saved: ${filename}`);
    } catch (error) {
      console.warn('⚠️ Could not save official email to Drive:', error);
    }

    await gmailService.addLabel(email.id, 'Official');
    console.log('✅ Official email processed');
  }
}

export default new EmailProcessor();