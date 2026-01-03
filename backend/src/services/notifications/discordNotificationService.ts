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

class DiscordNotificationService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
  }

  private isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  async sendJobOfferAlert(email: Email, analysis: Classification) {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook URL not configured, skipping notification');
      return null;
    }

    const embed = {
      title: '🎯 New Job Opportunity!',
      color: 0x4CAF50, // Green
      fields: [
        {
          name: 'Subject',
          value: email.subject,
          inline: false,
        },
        {
          name: 'From',
          value: email.from,
          inline: true,
        },
        {
          name: 'Confidence',
          value: `${(analysis.confidence * 100).toFixed(1)}%`,
          inline: true,
        },
        {
          name: 'Key Details',
          value: analysis.key_details || 'N/A',
          inline: false,
        },
        {
          name: 'Preview',
          value: email.snippet.substring(0, 200) + '...',
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gmail AI Agent',
      },
    };

    try {
      await axios.post(this.webhookUrl, {
        username: 'Gmail Agent',
        embeds: [embed],
      });
      console.log('✅ Discord notification sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending Discord notification:', error);
      return null;
    }
  }

  async sendInvoiceAlert(email: Email, filename: string, driveLink: string) {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook URL not configured, skipping notification');
      return null;
    }

    const embed = {
      title: '📄 Invoice Saved',
      color: 0x2196F3, // Blue
      fields: [
        {
          name: 'Filename',
          value: filename,
          inline: false,
        },
        {
          name: 'From',
          value: email.from,
          inline: true,
        },
        {
          name: 'Subject',
          value: email.subject,
          inline: false,
        },
        {
          name: 'Google Drive',
          value: `[Open File](${driveLink})`,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gmail AI Agent',
      },
    };

    try {
      await axios.post(this.webhookUrl, {
        username: 'Gmail Agent',
        embeds: [embed],
      });
      console.log('✅ Discord invoice alert sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending Discord notification:', error);
      return null;
    }
  }

  async sendDailySummary(stats: any) {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook URL not configured, skipping notification');
      return null;
    }

    const embed = {
      title: '📊 Daily Summary',
      color: 0x9C27B0, // Purple
      fields: [
        {
          name: '📧 Emails Processed',
          value: stats.processed.toString(),
          inline: true,
        },
        {
          name: '📄 Invoices',
          value: stats.invoices.toString(),
          inline: true,
        },
        {
          name: '💼 Job Offers',
          value: stats.jobOffers.toString(),
          inline: true,
        },
        {
          name: '🗑️ Spam',
          value: stats.spam.toString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gmail AI Agent',
      },
    };

    try {
      await axios.post(this.webhookUrl, {
        username: 'Gmail Agent',
        embeds: [embed],
      });
      console.log('✅ Discord summary sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending Discord summary:', error);
      return null;
    }
  }
}

export default new DiscordNotificationService();