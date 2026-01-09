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

export interface TelegramStatus {
  configured: boolean;
  connected: boolean;
  botUsername?: string;
  chatId?: string;
  error?: string;
}

class TelegramNotificationService {
  // Read env vars dynamically (not cached) so changes are picked up without restart
  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get chatId(): string {
    return process.env.TELEGRAM_CHAT_ID || '';
  }

  public isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  /**
   * Get the current status of Telegram integration
   */
  async getStatus(): Promise<TelegramStatus> {
    if (!this.botToken) {
      return {
        configured: false,
        connected: false,
        error: 'TELEGRAM_BOT_TOKEN not set in .env'
      };
    }

    if (!this.chatId) {
      return {
        configured: false,
        connected: false,
        error: 'TELEGRAM_CHAT_ID not set in .env'
      };
    }

    try {
      // Test the bot token by getting bot info
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const response = await axios.get(url, { timeout: 5000 });

      if (response.data.ok) {
        return {
          configured: true,
          connected: true,
          botUsername: response.data.result.username,
          chatId: this.chatId
        };
      }

      return {
        configured: true,
        connected: false,
        error: 'Bot token invalid'
      };
    } catch (error: any) {
      return {
        configured: true,
        connected: false,
        error: error.response?.data?.description || error.message || 'Connection failed'
      };
    }
  }

  /**
   * Test the connection by sending a test message
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env'
      };
    }

    try {
      const result = await this.sendMessage('🧪 <b>Test Message</b>\n\nYour Pocketknife Telegram integration is working!');
      
      if (result) {
        return {
          success: true,
          message: 'Test message sent successfully! Check your Telegram.'
        };
      }

      return {
        success: false,
        message: 'Failed to send test message'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.description || error.message || 'Connection test failed'
      };
    }
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