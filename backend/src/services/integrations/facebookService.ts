/**
 * Facebook Integration Service
 * 
 * Facebook Login and Graph API integration.
 * Used for: Alternative sign-in, sharing to feed
 */

import axios from 'axios';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

export interface FacebookStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
  appName?: string;
}

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

class FacebookService {
  private readonly graphUrl = 'https://graph.facebook.com/v18.0';

  private get appId(): string {
    return process.env.FACEBOOK_APP_ID || '';
  }

  private get appSecret(): string {
    return process.env.FACEBOOK_APP_SECRET || '';
  }

  /**
   * Check if Facebook is configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  /**
   * Get connection status
   */
  async getStatus(): Promise<FacebookStatus> {
    if (!this.appId) {
      return {
        configured: false,
        connected: false,
        error: 'FACEBOOK_APP_ID not set in .env'
      };
    }

    if (!this.appSecret) {
      return {
        configured: false,
        connected: false,
        error: 'FACEBOOK_APP_SECRET not set in .env'
      };
    }

    try {
      // Get app access token to verify credentials
      const tokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`;
      const tokenResponse = await axios.get(tokenUrl, { timeout: configService.get('integrations.facebook.timeoutMs', 5000) as number });
      
      if (tokenResponse.data?.access_token) {
        // Get app info
        const appUrl = `${this.graphUrl}/${this.appId}?access_token=${tokenResponse.data.access_token}`;
        const appResponse = await axios.get(appUrl, { timeout: configService.get('integrations.facebook.timeoutMs', 5000) as number });
        
        return {
          configured: true,
          connected: true,
          appName: appResponse.data?.name || 'Facebook App'
        };
      }

      return {
        configured: true,
        connected: false,
        error: 'Failed to get access token'
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message 
        || error.message 
        || 'Connection failed';
      
      return {
        configured: true,
        connected: false,
        error: errorMsg
      };
    }
  }

  /**
   * Get OAuth login URL
   */
  getLoginUrl(redirectUri: string, scopes: string[] = ['email', 'public_profile']): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code'
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.graphUrl}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: redirectUri,
          code
        }
      });

      return response.data?.access_token || null;
    } catch (error: any) {
      logger.error(`Facebook token exchange error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user profile from access token
   */
  async getUserProfile(accessToken: string): Promise<FacebookUser | null> {
    try {
      const response = await axios.get(`${this.graphUrl}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email,picture'
        }
      });

      return {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        picture: response.data.picture?.data?.url
      };
    } catch (error: any) {
      logger.error(`Facebook get user error: ${error.message}`);
      return null;
    }
  }

  /**
   * Test connection by verifying app credentials
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Facebook not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env'
      };
    }

    const status = await this.getStatus();
    
    if (status.connected) {
      return {
        success: true,
        message: `Connected to ${status.appName || 'Facebook App'}`
      };
    }

    return {
      success: false,
      message: status.error || 'Connection failed'
    };
  }
}

export const facebookService = new FacebookService();
export default facebookService;
