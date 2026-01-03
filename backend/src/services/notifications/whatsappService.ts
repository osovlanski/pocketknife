// Note: twilio is optional - install with: npm install twilio
let twilio: any;
try {
  twilio = require('twilio');
} catch {
  // twilio not installed
}

class WhatsAppService {
  private client: any = null;
  private configured: boolean = false;

  constructor() {
    if (twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.configured = true;
    }
  }

  async sendJobOfferNotification(email: any, details: any) {
    if (!this.configured) {
      console.warn('⚠️ Twilio not configured, skipping WhatsApp notification');
      return null;
    }

    try {
      const message = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: process.env.USER_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER,
        body: `🎯 New Job Opportunity!

Subject: ${email.subject}
From: ${email.from}

${details.key_details}

Check your email for full details!`
      });

      console.log('✅ WhatsApp notification sent:', message.sid);
      return message.sid;
    } catch (error) {
      console.error('❌ Error sending WhatsApp:', error);
      return null;
    }
  }
}

export default new WhatsAppService();