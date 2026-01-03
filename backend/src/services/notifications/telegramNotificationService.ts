import axios from 'axios';

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

class TelegramNotificationService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  private isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendMessage(text: string) {
    if (!this.isConfigured()) {
      console.warn('⚠️ Telegram not configured, skipping notification');
      return null;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML',
      });
      console.log('✅ Telegram message sent');
      return response.data;
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      return null;
    }
  }

  async sendJobOfferAlert(email: Email, analysis: Classification) {
    const message = `
🎯 <b>New Job Opportunity!</b>

<b>Subject:</b> ${this.escapeHtml(email.subject)}
<b>From:</b> ${this.escapeHtml(email.from)}
<b>Confidence:</b> ${(analysis.confidence * 100).toFixed(1)}%

<b>Key Details:</b>
${this.escapeHtml(analysis.key_details || 'N/A')}

<b>Preview:</b>
${this.escapeHtml(email.snippet.substring(0, 200))}...

📧 Check your Gmail for full details!
    `.trim();

    return await this.sendMessage(message);
  }

  async sendInvoiceAlert(email: Email, filename: string, driveLink: string) {
    const message = `
📄 <b>Invoice Saved to Drive</b>

<b>File:</b> ${this.escapeHtml(filename)}
<b>From:</b> ${this.escapeHtml(email.from)}
<b>Subject:</b> ${this.escapeHtml(email.subject)}

<a href="${driveLink}">Open in Google Drive</a>
    `.trim();

    return await this.sendMessage(message);
  }

  async sendDailySummary(stats: any) {
    const message = `
📊 <b>Daily Summary</b>

📧 Emails Processed: ${stats.processed}
📄 Invoices Saved: ${stats.invoices}
💼 Job Offers: ${stats.jobOffers}
🗑️ Spam Filtered: ${stats.spam}
    `.trim();

    return await this.sendMessage(message);
  }
}

export default new TelegramNotificationService();