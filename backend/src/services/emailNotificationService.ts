import nodemailer from 'nodemailer';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
}

interface Classification {
  category: string;
  confidence: number;
  key_details?: string;
  reasoning?: string;
}

class EmailNotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private initialized: boolean = false;

  async initialize(oauth2Client?: any) {
    try {
      if (this.initialized) return;

      // Check if SMTP is configured via environment variables
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log('✅ Email notification service initialized with SMTP');
      } else if (oauth2Client) {
        // Production with Gmail OAuth2
        try {
          const accessToken = await oauth2Client.getAccessToken();
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: process.env.GMAIL_USER_EMAIL,
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              refreshToken: oauth2Client.credentials.refresh_token,
              accessToken: accessToken.token || '',
            },
          });
          console.log('✅ Email notification service initialized with Gmail OAuth');
        } catch (oauthError) {
          console.warn('⚠️ Gmail OAuth not available for notifications');
        }
      } else {
        // No email configured - notifications will be logged only
        console.log('ℹ️ Email notifications disabled (no SMTP/OAuth configured)');
        console.log('   To enable, set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Error initializing email service:', error);
      this.initialized = true; // Mark as initialized to prevent retries
      // Don't throw, just log - service will skip sending
    }
  }

  async sendJobOfferAlert(email: Email, analysis: Classification) {
    if (!this.transporter) {
      console.warn('⚠️ Email service not initialized, skipping notification');
      return null;
    }

    const mailOptions = {
      from: process.env.GMAIL_USER_EMAIL || 'noreply@gmail-agent.com',
      to: process.env.ALERT_EMAIL || process.env.GMAIL_USER_EMAIL,
      subject: '🎯 New Job Opportunity Detected!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎯 New Job Opportunity!</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Email Details:</h3>
            <p><strong>Subject:</strong> ${email.subject}</p>
            <p><strong>From:</strong> ${email.from}</p>
            <p><strong>Date:</strong> ${new Date(email.date).toLocaleString()}</p>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">AI Analysis:</h3>
            <p><strong>Confidence:</strong> ${(analysis.confidence * 100).toFixed(1)}%</p>
            <p><strong>Key Details:</strong> ${analysis.key_details || 'N/A'}</p>
            <p><strong>Reasoning:</strong> ${analysis.reasoning || 'N/A'}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px;">
            <p style="margin: 0;"><strong>📧 Preview:</strong></p>
            <p style="margin: 10px 0 0 0; color: #666;">${email.snippet}</p>
          </div>

          <p style="margin-top: 30px; text-align: center;">
            <a href="https://mail.google.com" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Open Gmail
            </a>
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Job offer email sent:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info.messageId;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return null;
    }
  }

  async sendInvoiceAlert(email: Email, filename: string, driveLink: string) {
    if (!this.transporter) {
      console.warn('⚠️ Email service not initialized, skipping notification');
      return null;
    }

    const mailOptions = {
      from: process.env.GMAIL_USER_EMAIL || 'noreply@gmail-agent.com',
      to: process.env.ALERT_EMAIL || process.env.GMAIL_USER_EMAIL,
      subject: '📄 New Invoice Saved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">📄 Invoice Saved to Drive</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice:</strong> ${filename}</p>
            <p><strong>From:</strong> ${email.from}</p>
            <p><strong>Subject:</strong> ${email.subject}</p>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="${driveLink}" 
               style="background-color: #2196F3; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View in Google Drive
            </a>
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Invoice alert sent:', info.messageId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info.messageId;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return null;
    }
  }

  async sendDailySummary(stats: any) {
    if (!this.transporter) {
      console.warn('⚠️ Email service not initialized, skipping notification');
      return null;
    }

    const mailOptions = {
      from: process.env.GMAIL_USER_EMAIL || 'noreply@gmail-agent.com',
      to: process.env.ALERT_EMAIL || process.env.GMAIL_USER_EMAIL,
      subject: '📊 Gmail Agent Daily Summary',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9C27B0;">📊 Daily Summary</h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; font-size: 36px; color: #2196F3;">${stats.processed}</h3>
              <p style="margin: 10px 0 0 0; color: #666;">Emails Processed</p>
            </div>
            <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; font-size: 36px; color: #9C27B0;">${stats.invoices}</h3>
              <p style="margin: 10px 0 0 0; color: #666;">Invoices Saved</p>
            </div>
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; font-size: 36px; color: #4CAF50;">${stats.jobOffers}</h3>
              <p style="margin: 10px 0 0 0; color: #666;">Job Offers</p>
            </div>
            <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; font-size: 36px; color: #f44336;">${stats.spam}</h3>
              <p style="margin: 10px 0 0 0; color: #666;">Spam Filtered</p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Daily summary sent:', info.messageId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info.messageId;
    } catch (error) {
      console.error('❌ Error sending summary:', error);
      return null;
    }
  }
}

export default new EmailNotificationService();