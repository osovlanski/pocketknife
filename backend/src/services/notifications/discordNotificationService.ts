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

export interface DiscordStatus {
  configured: boolean;
  connected: boolean;
  webhookUrl?: string;
  error?: string;
}

class DiscordNotificationService {
  // Read env vars dynamically so changes are picked up on restart
  private get webhookUrl(): string {
    return process.env.DISCORD_WEBHOOK_URL || '';
  }

  public isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Get the current status of Discord integration
   */
  async getStatus(): Promise<DiscordStatus> {
    const webhookUrl = this.webhookUrl?.trim();
    
    if (!webhookUrl) {
      return {
        configured: false,
        connected: false,
        error: 'DISCORD_WEBHOOK_URL not set in .env'
      };
    }

    // Validate webhook URL format (both discord.com and discordapp.com are valid)
    const isValidUrl = webhookUrl.startsWith('https://discord.com/api/webhooks/') 
      || webhookUrl.startsWith('https://discordapp.com/api/webhooks/');
    
    if (!isValidUrl) {
      return {
        configured: true,
        connected: false,
        error: 'Invalid webhook URL format. Should start with https://discord.com/api/webhooks/'
      };
    }

    try {
      // Discord webhooks can be tested with a GET request to get webhook info
      console.log('🔍 Testing Discord webhook connection...');
      const response = await axios.get(webhookUrl, { timeout: 5000 });

      if (response.data && response.data.id) {
        // Mask the webhook URL for security (only show channel name)
        const channelName = response.data.name || 'Webhook';
        const guildName = response.data.guild_id ? 'Server' : '';
        console.log(`✅ Discord connected: ${channelName}`);
        return {
          configured: true,
          connected: true,
          webhookUrl: `#${channelName}`
        };
      }

      return {
        configured: true,
        connected: false,
        error: 'Invalid webhook response - missing id'
      };
    } catch (error: any) {
      const errorMsg = error.response?.status === 404 
        ? 'Webhook not found - it may have been deleted'
        : error.response?.status === 401 
          ? 'Unauthorized - invalid webhook token'
          : error.response?.data?.message || error.message || 'Connection failed';
      
      console.error('❌ Discord connection failed:', errorMsg);
      return {
        configured: true,
        connected: false,
        error: errorMsg
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
        message: 'Discord not configured. Set DISCORD_WEBHOOK_URL in .env'
      };
    }

    try {
      await axios.post(this.webhookUrl, {
        username: 'Pocketknife',
        embeds: [{
          title: '🧪 Test Message',
          description: 'Your Pocketknife Discord integration is working!',
          color: 0x4CAF50,
          timestamp: new Date().toISOString(),
          footer: { text: 'Pocketknife AI Platform' }
        }]
      });

      return {
        success: true,
        message: 'Test message sent successfully! Check your Discord channel.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed'
      };
    }
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