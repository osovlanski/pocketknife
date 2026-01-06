import { google, Auth } from 'googleapis';
import fs from 'fs';
import path from 'path';

class GoogleAuthService {
  private oauth2Client: Auth.OAuth2Client | null = null;
  private tokenPath: string;
  private hasValidTokens: boolean = false;
  private storedScopes: string = ''; // Store scopes from token file

  constructor() {
    this.tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
  }

  /**
   * Initialize the OAuth2 client
   */
  initialize() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );

    // Set up automatic token refresh callback
    this.oauth2Client.on('tokens', (tokens) => {
      console.log('🔄 Token refresh event received');
      if (tokens.refresh_token) {
        console.log('✅ New refresh token received');
      }
      if (tokens.access_token) {
        console.log('✅ New access token received, updating saved tokens');
        // Update the saved token file with new tokens
        this.updateSavedTokens(tokens);
      }
    });

    // Try to load existing tokens
    if (fs.existsSync(this.tokenPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        this.hasValidTokens = true;
        this.storedScopes = tokens.scope || ''; // Store the scopes from token file
        console.log('✅ Google OAuth tokens loaded');
        console.log('📋 Token scopes:', this.storedScopes);
        
        // Check if access token is expired and we have a refresh token
        if (tokens.expiry_date && tokens.refresh_token) {
          const isExpired = tokens.expiry_date < Date.now();
          if (isExpired) {
            console.log('⚠️ Access token expired, will refresh on next API call');
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to load Google tokens:', error);
        this.hasValidTokens = false;
        this.storedScopes = '';
      }
    } else {
      console.warn('⚠️ No Google OAuth tokens found');
      this.hasValidTokens = false;
      this.storedScopes = '';
    }
  }

  /**
   * Update saved tokens file when tokens are refreshed
   */
  private updateSavedTokens(newTokens: Auth.Credentials) {
    try {
      let existingTokens: Auth.Credentials = {};
      if (fs.existsSync(this.tokenPath)) {
        existingTokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
      }
      
      // Merge new tokens with existing (keep refresh_token if not in new tokens)
      const mergedTokens = {
        ...existingTokens,
        ...newTokens,
        refresh_token: newTokens.refresh_token || existingTokens.refresh_token
      };
      
      fs.writeFileSync(this.tokenPath, JSON.stringify(mergedTokens, null, 2));
      this.storedScopes = mergedTokens.scope || this.storedScopes;
      console.log('✅ Token file updated with refreshed tokens');
    } catch (error) {
      console.error('❌ Failed to update token file:', error);
    }
  }

  /**
   * Ensure OAuth client is initialized and has valid credentials
   */
  private async ensureValidClient(): Promise<Auth.OAuth2Client> {
    if (!this.oauth2Client) {
      this.initialize();
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
          this.updateSavedTokens(newCredentials);
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
      this.initialize();
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
      this.initialize();
    }

    const scopes = [
      // OpenID Connect scopes for user info
      'openid',
      'email',
      'profile',
      // Gmail scopes
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      // Drive scopes
      'https://www.googleapis.com/auth/drive.file',
      // Calendar scopes
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens and save them
   */
  async handleCallback(code: string): Promise<{ success: boolean; error?: string; email?: string }> {
    try {
      // Ensure OAuth client is initialized
      if (!this.oauth2Client) {
        this.initialize();
      }
      
      console.log('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Check we got the essential tokens
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
      
      // Save tokens to file first
      const credentialsDir = path.dirname(this.tokenPath);
      if (!fs.existsSync(credentialsDir)) {
        fs.mkdirSync(credentialsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
      console.log('✅ Tokens saved to:', this.tokenPath);
      
      // Set credentials on client
      this.oauth2Client.setCredentials(tokens);
      this.hasValidTokens = true;
      this.storedScopes = tokens.scope || '';
      
      // Try to get user email (optional - don't fail if this doesn't work)
      let userEmail: string | undefined;
      try {
        // First try to get email from id_token (no API call needed)
        if (tokens.id_token) {
          try {
            const payload = JSON.parse(
              Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
            );
            if (payload.email) {
              userEmail = payload.email;
              console.log('✅ Got email from id_token:', userEmail);
            }
          } catch {
            // id_token decode failed, try API
          }
        }
        
        // If no email from id_token, try API call
        if (!userEmail) {
          const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
          const { data } = await oauth2.userinfo.get();
          userEmail = data.email || undefined;
          console.log('✅ Got email from API:', userEmail);
        }
      } catch (verifyError: any) {
        // Log but don't fail - tokens might still work for Gmail/Calendar
        console.warn('⚠️ Could not fetch user info (tokens may still work):', verifyError.message);
      }
      
      console.log('✅ Google OAuth tokens saved successfully');
      console.log('📋 Token scopes:', this.storedScopes);
      
      return { success: true, email: userEmail };
    } catch (error: any) {
      console.error('❌ Error exchanging OAuth code:', error);
      // Provide more specific error messages
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
   * Revoke tokens and delete saved file
   */
  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.oauth2Client.credentials?.access_token) {
        await this.oauth2Client.revokeToken(this.oauth2Client.credentials.access_token);
      }
      
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
      
      this.hasValidTokens = false;
      this.storedScopes = '';
      this.oauth2Client.setCredentials({});
      
      console.log('✅ Google account disconnected');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error disconnecting Google:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Force re-authentication by deleting tokens (without revoking)
   * This is useful when scopes have been updated
   */
  forceReauth(): { success: boolean; authUrl: string } {
    try {
      // Delete existing tokens without revoking (so we don't lose refresh capability)
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
        console.log('🔄 Deleted existing tokens for re-authentication');
      }
      
      this.hasValidTokens = false;
      this.storedScopes = '';
      this.oauth2Client.setCredentials({});
      
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
    
    // Check stored scopes (from token file) or credentials scope
    const scope = this.storedScopes || this.oauth2Client?.credentials?.scope || '';
    const hasCalendar = scope.includes('calendar');
    
    console.log('🔍 Checking calendar scopes:', { hasCalendar, scope: scope.substring(0, 100) + '...' });
    
    return hasCalendar;
  }

  /**
   * Get user info (email) from Google
   */
  async getUserInfo(): Promise<{ email?: string; name?: string } | null> {
    if (!this.hasValidTokens) return null;

    try {
      // Get a valid client with refreshed tokens
      const client = await this.ensureValidClient();
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data } = await oauth2.userinfo.get();
      return { email: data.email || undefined, name: data.name || undefined };
    } catch (error: any) {
      console.warn('Could not get user info:', error.message);
      
      // If unauthorized, tokens might be invalid - mark as not authenticated
      if (error.status === 401 || error.code === 401) {
        console.warn('⚠️ 401 Unauthorized - tokens may be revoked or invalid');
        // Don't set hasValidTokens to false here, let the user reconnect
      }
      
      return null;
    }
  }

  /**
   * Get email from stored tokens without making API call
   * Falls back to API call if email not in tokens
   */
  async getEmailFromTokens(): Promise<string | null> {
    if (!this.hasValidTokens || !this.oauth2Client) return null;

    try {
      // First, try to get email from token info
      const credentials = this.oauth2Client.credentials;
      
      // Try to decode the id_token if present (contains email)
      if (credentials.id_token) {
        try {
          const payload = JSON.parse(
            Buffer.from(credentials.id_token.split('.')[1], 'base64').toString()
          );
          if (payload.email) {
            return payload.email;
          }
        } catch {
          // id_token decode failed, try API
        }
      }
      
      // Fall back to API call
      const userInfo = await this.getUserInfo();
      return userInfo?.email || null;
    } catch {
      return null;
    }
  }
}

export default new GoogleAuthService();

