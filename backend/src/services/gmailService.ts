import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

class GmailService {
  private gmail: any = null;
  private initialized: boolean = false;
  private oauth2Client: any = null;

  async initialize() {
    if (this.initialized) return;

    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Try to load existing tokens
      const tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
      
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ Loaded Gmail OAuth tokens');
      } else {
        console.warn('⚠️ No Gmail OAuth tokens found. Gmail features will be limited.');
        console.warn('💡 Run OAuth flow to authorize Gmail access.');
        console.warn('💡 For now, using mock email data for testing.');
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.initialized = true;
      console.log('✅ Gmail service initialized');
    } catch (error) {
      console.error('❌ Error initializing Gmail service:', error);
      throw error;
    }
  }

  async getUnprocessedEmails() {
    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    try {
      // Check if we have valid credentials
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        console.warn('⚠️ No Gmail access token. Returning mock emails for testing.');
        return this.getMockEmails();
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread -label:processed',
        maxResults: 100
      });

      if (!response.data.messages) {
        return [];
      }

      const emails = await Promise.all(
        response.data.messages.map((msg: any) => this.getEmailDetails(msg.id))
      );

      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      console.warn('⚠️ Returning mock emails for testing.');
      return this.getMockEmails();
    }
  }

  private getMockEmails() {
    // Return mock emails for testing when OAuth is not configured
    return [
      {
        id: 'mock-1',
        subject: 'חשבון חשמל לחודש נובמבר 2025 - Electric Bill November',
        from: 'billing@electric.co.il',
        date: new Date().toISOString(),
        snippet: 'חשבון עבור תקופה 01.11.2025 - 30.11.2025. סכום לתשלום: ₪450',
        body: `חשבון חשמל
תקופה: 01.11.2025 - 30.11.2025
סכום לתשלום: ₪450
תאריך אחרון לתשלום: 15.12.2025

Electric Bill
Period: 01.11.2025 - 30.11.2025
Amount Due: ₪450
Due Date: 15.12.2025`
      },
      {
        id: 'mock-2',
        subject: 'ארנונה דצמבר 2025 - Municipal Tax',
        from: 'city@municipality.gov.il',
        date: new Date().toISOString(),
        snippet: 'חשבון ארנונה לתקופה 01.12.2025 - 31.12.2025',
        body: `ארנונה - Municipal Tax
לתקופה: 01.12.2025 - 31.12.2025
סכום: ₪1,200
תשלום עד: 10.01.2026`
      },
      {
        id: 'mock-3',
        subject: 'Interview Invitation - Senior Developer Position',
        from: 'hr@tech-company.com',
        date: new Date().toISOString(),
        snippet: 'We would like to invite you for an interview for the Senior Developer position',
        body: `Dear Candidate,

We are pleased to invite you for an interview for the Senior Developer position at our company.

Interview Details:
- Date: Next Week
- Location: Tel Aviv Office
- Duration: 1-2 hours

Please confirm your availability.

Best regards,
HR Team`
      },
      {
        id: 'mock-4',
        subject: '🎉 50% OFF - Limited Time Offer!',
        from: 'marketing@shop.com',
        date: new Date().toISOString(),
        snippet: 'Exclusive discount! Get 50% off all products this week only!',
        body: `Limited Time Offer!
50% OFF Everything!

Shop now and save big!
This week only - don't miss out!

Click here to shop: www.shop.com/sale`
      },
      {
        id: 'mock-5',
        subject: 'חשבון מים - Water Bill December 2025',
        from: 'water@water-corp.co.il',
        date: new Date().toISOString(),
        snippet: 'חשבון מים לחודש דצמבר',
        body: `חשבון מים
חודש: דצמבר 2025
צריכה: 15 מ"ק
סכום: ₪120

Water Bill
Month: December 2025
Usage: 15 cubic meters
Amount: ₪120`
      }
    ];
  }

  async getEmailDetails(messageId: string) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = response.data.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    let body = '';
    if (response.data.payload.parts) {
      const textPart = response.data.payload.parts.find(
        (part: any) => part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (response.data.payload.body.data) {
      body = Buffer.from(response.data.payload.body.data, 'base64').toString('utf-8');
    }

    return {
      id: messageId,
      subject,
      from,
      date,
      body: body.substring(0, 1000),
      snippet: response.data.snippet
    };
  }

  async addLabel(messageId: string, labelName: string) {
    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const labels = await this.gmail.users.labels.list({ userId: 'me' });
      let label = labels.data.labels.find((l: any) => l.name === labelName);

      if (!label) {
        const created = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: { name: labelName }
        });
        label = created.data;
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id],
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error('Error adding label:', error);
    }
  }

  async moveToFolder(messageId: string, folderLabel: string) {
    await this.addLabel(messageId, folderLabel);
  }
}

export default new GmailService();