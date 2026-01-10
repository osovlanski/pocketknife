import { google, Auth } from 'googleapis';
import { getPrisma } from '../core/database';

const PROVIDER = 'google';
const DEFAULT_USER_EMAIL = process.env.GMAIL_USER_EMAIL || 'default';

class GoogleAuthService {
  private oauth2Client: Auth.OAuth2Client | null = null;
  private hasValidTokens: boolean = false;
  private storedScopes: string = '';
  private currentUserEmail: string = DEFAULT_USER_EMAIL;

  constructor() {
    // No file path needed - tokens stored in database
  }

  /**
   * Initialize the OAuth2 client
   */
  async initialize() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );

    // Set up automatic token refresh callback
    this.oauth2Client.on('tokens', async (tokens) => {
      console.log('🔄 Token refresh event received');
      if (tokens.refresh_token) {
        console.log('✅ New refresh token received');
      }
      if (tokens.access_token) {
        console.log('✅ New access token received, updating saved tokens');
        await this.saveTokensToDatabase(tokens);
      }
    });

    // Try to load existing tokens from database
    await this.loadTokensFromDatabase();
  }

  /**
   * Load tokens from database
   */
  private async loadTokensFromDatabase(): Promise<boolean> {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        console.warn('⚠️ Database not available for token loading');
        return false;
      }

      // Check if OAuthToken table exists
      if (!(prisma as any).oAuthToken) {
        console.warn('⚠️ OAuthToken table not found. Run migrations.');
        return false;
      }

      const tokenRecord = await (prisma as any).oAuthToken.findUnique({
        where: {
          provider_userEmail: {
            provider: PROVIDER,
            userEmail: this.currentUserEmail
          }
        }
      });

      if (tokenRecord) {
        const tokens: Auth.Credentials = {
          access_token: tokenRecord.accessToken,
          refresh_token: tokenRecord.refreshToken,
          token_type: tokenRecord.tokenType,
          scope: tokenRecord.scope,
          expiry_date: tokenRecord.expiryDate?.getTime()
        };

        this.oauth2Client?.setCredentials(tokens);
        this.hasValidTokens = true;
        this.storedScopes = tokenRecord.scope || '';
        console.log('✅ Google OAuth tokens loaded from database');
        console.log('📋 Token scopes:', this.storedScopes.substring(0, 100) + '...');

        // Check if access token is expired
        if (tokenRecord.expiryDate && tokenRecord.refreshToken) {
          const isExpired = tokenRecord.expiryDate.getTime() < Date.now();
          if (isExpired) {
            console.log('⚠️ Access token expired, will refresh on next API call');
          }
        }
        return true;
      } else {
        console.warn('⚠️ No Google OAuth tokens found in database');
        this.hasValidTokens = false;
        this.storedScopes = '';
        return false;
      }
    } catch (error: any) {
      // Handle table not existing gracefully
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.warn('⚠️ OAuthToken table not found. Run migrations first.');
      } else {
        console.warn('⚠️ Failed to load Google tokens from database:', error.message);
      }
      this.hasValidTokens = false;
      this.storedScopes = '';
      return false;
    }
  }

  /**
   * Save tokens to database
   */
  private async saveTokensToDatabase(tokens: Auth.Credentials): Promise<boolean> {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        console.warn('⚠️ Database not available for token saving');
        return false;
      }

      if (!(prisma as any).oAuthToken) {
        console.warn('⚠️ OAuthToken table not found. Run migrations.');
        return false;
      }

      // Merge with existing tokens (keep refresh_token if not in new tokens)
      let existingRefreshToken: string | null = null;
      try {
        const existing = await (prisma as any).oAuthToken.findUnique({
          where: {
            provider_userEmail: {
              provider: PROVIDER,
              userEmail: this.currentUserEmail
            }
          }
        });
        if (existing) {
          existingRefreshToken = existing.refreshToken;
        }
      } catch {
        // No existing token, that's fine
      }

      await (prisma as any).oAuthToken.upsert({
        where: {
          provider_userEmail: {
            provider: PROVIDER,
            userEmail: this.currentUserEmail
          }
        },
        update: {
          accessToken: tokens.access_token || '',
          refreshToken: tokens.refresh_token || existingRefreshToken,
          tokenType: tokens.token_type || 'Bearer',
          scope: tokens.scope,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        },
        create: {
          provider: PROVIDER,
          userEmail: this.currentUserEmail,
          accessToken: tokens.access_token || '',
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type || 'Bearer',
          scope: tokens.scope,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });

      this.storedScopes = tokens.scope || this.storedScopes;
      console.log('✅ Tokens saved to database');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to save tokens to database:', error.message);
      return false;
    }
  }

  /**
   * Delete tokens from database
   */
  private async deleteTokensFromDatabase(): Promise<boolean> {
    try {
      const prisma = getPrisma();
      if (!prisma || !(prisma as any).oAuthToken) {
        return false;
      }

      await (prisma as any).oAuthToken.delete({
        where: {
          provider_userEmail: {
            provider: PROVIDER,
            userEmail: this.currentUserEmail
          }
        }
      });
      console.log('✅ Tokens deleted from database');
      return true;
    } catch (error: any) {
      // P2025 = record not found, which is fine
      if (error.code !== 'P2025') {
        console.error('❌ Failed to delete tokens from database:', error.message);
      }
      return false;
    }
  }

  /**
   * Ensure OAuth client is initialized and has valid credentials
   */
  private async ensureValidClient(): Promise<Auth.OAuth2Client> {
    if (!this.oauth2Client) {
      await this.initialize();
    }
    
    if (!this.oauth2Client) {
      throw new Error('Failed to initialize OAuth client');
    }

    // If we have credentials, try to get a valid access token
    const credentials = this.oauth2Client.credentials;
    if (credentials?.refresh_token) {
      const isExpired = credentials.expiry_date ? credentials.expiry_date < Date.now() : true;
      
      if (isExpired || !credentials.access_token) {
        console.log('🔄 Access token expired or missing, refreshing...');
        try {
          const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(newCredentials);
          await this.saveTokensToDatabase(newCredentials);
          console.log('✅ Access token refreshed successfully');
        } catch (refreshError: any) {
          console.error('❌ Failed to refresh access token:', refreshError.message);
          throw new Error('Failed to refresh access token. Please reconnect your Google account.');
        }
      }
    }
    
    return this.oauth2Client;
  }

  /**
   * Get the OAuth2 client (synchronous - for basic use)
   */
  getClient(): Auth.OAuth2Client | null {
    if (!this.oauth2Client) {
      // Can't call async initialize here, just return null
      return null;
    }
    return this.oauth2Client;
  }

  /**
   * Get a valid OAuth2 client with refreshed tokens (async - for API calls)
   */
  async getValidClient(): Promise<Auth.OAuth2Client> {
    return this.ensureValidClient();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasValidTokens;
  }

  /**
   * Generate the OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      // Synchronous initialization for auth URL generation
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
      );
    }

    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens and save them
   */
  async handleCallback(code: string): Promise<{ success: boolean; error?: string; email?: string }> {
    try {
      if (!this.oauth2Client) {
        await this.initialize();
      }
      
      if (!this.oauth2Client) {
        return { success: false, error: 'Failed to initialize OAuth client' };
      }
      
      console.log('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        console.error('❌ No access token received');
        return { success: false, error: 'No access token received from Google. Please try again.' };
      }
      
      console.log('✅ Received tokens:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none',
        scopes: tokens.scope?.substring(0, 100) + '...'
      });
      
      // Get user email to associate with tokens
      let userEmail: string | undefined;
      try {
        if (tokens.id_token) {
          try {
            const payload = JSON.parse(
              Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
            );
            if (payload.email) {
              userEmail = payload.email;
              this.currentUserEmail = userEmail;
              console.log('✅ Got email from id_token:', userEmail);
            }
          } catch {
            // id_token decode failed
          }
        }
        
        if (!userEmail) {
          this.oauth2Client.setCredentials(tokens);
          const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
          const { data } = await oauth2.userinfo.get();
          userEmail = data.email || undefined;
          if (userEmail) {
            this.currentUserEmail = userEmail;
          }
          console.log('✅ Got email from API:', userEmail);
        }
      } catch (verifyError: any) {
        console.warn('⚠️ Could not fetch user info (tokens may still work):', verifyError.message);
      }
      
      // Save tokens to database
      await this.saveTokensToDatabase(tokens);
      
      // Set credentials on client
      this.oauth2Client.setCredentials(tokens);
      this.hasValidTokens = true;
      this.storedScopes = tokens.scope || '';
      
      console.log('✅ Google OAuth tokens saved successfully to database');
      console.log('📋 Token scopes:', this.storedScopes.substring(0, 100) + '...');
      
      return { success: true, email: userEmail };
    } catch (error: any) {
      console.error('❌ Error exchanging OAuth code:', error);
      let errorMessage = error.message || 'Unknown error';
      if (error.response?.data?.error_description) {
        errorMessage = error.response.data.error_description;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Revoke tokens and delete from database
   */
  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.oauth2Client?.credentials?.access_token) {
        try {
          await this.oauth2Client.revokeToken(this.oauth2Client.credentials.access_token);
        } catch (revokeError) {
          console.warn('⚠️ Failed to revoke token (may already be revoked)');
        }
      }
      
      await this.deleteTokensFromDatabase();
      
      this.hasValidTokens = false;
      this.storedScopes = '';
      this.oauth2Client?.setCredentials({});
      
      console.log('✅ Google account disconnected');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error disconnecting Google:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Force re-authentication by deleting tokens
   */
  async forceReauth(): Promise<{ success: boolean; authUrl: string }> {
    try {
      await this.deleteTokensFromDatabase();
      
      this.hasValidTokens = false;
      this.storedScopes = '';
      this.oauth2Client?.setCredentials({});
      
      console.log('🔄 Deleted existing tokens for re-authentication');
      
      return { 
        success: true, 
        authUrl: this.getAuthUrl() 
      };
    } catch (error: any) {
      console.error('❌ Error forcing re-auth:', error);
      return { 
        success: false, 
        authUrl: this.getAuthUrl() 
      };
    }
  }

  /**
   * Check if current tokens have the required scopes
   */
  hasCalendarScopes(): boolean {
    if (!this.hasValidTokens) {
      return false;
    }
    
    const scope = this.storedScopes || this.oauth2Client?.credentials?.scope || '';
    const hasCalendar = scope.includes('calendar');
    
    return hasCalendar;
  }

  /**
   * Get user info (email) from Google
   */
  async getUserInfo(): Promise<{ email?: string; name?: string } | null> {
    if (!this.hasValidTokens) return null;

    try {
      const client = await this.ensureValidClient();
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data } = await oauth2.userinfo.get();
      return { email: data.email || undefined, name: data.name || undefined };
    } catch (error: any) {
      console.warn('Could not get user info:', error.message);
      
      if (error.status === 401 || error.code === 401) {
        console.warn('⚠️ 401 Unauthorized - tokens may be revoked or invalid');
      }
      
      return null;
    }
  }

  /**
   * Get email from stored tokens without making API call
   */
  async getEmailFromTokens(): Promise<string | null> {
    if (!this.hasValidTokens || !this.oauth2Client) return null;

    try {
      const credentials = this.oauth2Client.credentials;
      
      if (credentials.id_token) {
        try {
          const payload = JSON.parse(
            Buffer.from(credentials.id_token.split('.')[1], 'base64').toString()
          );
          if (payload.email) {
            return payload.email;
          }
        } catch {
          // id_token decode failed
        }
      }
      
      const userInfo = await this.getUserInfo();
      return userInfo?.email || null;
    } catch {
      return null;
    }
  }
}

export default new GoogleAuthService();
