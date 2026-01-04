import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

class GoogleAuthService {
  private oauth2Client: any = null;
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

    // Try to load existing tokens
    if (fs.existsSync(this.tokenPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        this.hasValidTokens = true;
        this.storedScopes = tokens.scope || ''; // Store the scopes from token file
        console.log('✅ Google OAuth tokens loaded');
        console.log('📋 Token scopes:', this.storedScopes);
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
   * Get the OAuth2 client
   */
  getClient() {
    return this.oauth2Client;
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
      prompt: 'consent' // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens and save them
   */
  async handleCallback(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Save tokens to file
      const credentialsDir = path.dirname(this.tokenPath);
      if (!fs.existsSync(credentialsDir)) {
        fs.mkdirSync(credentialsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
      
      // Set credentials on client
      this.oauth2Client.setCredentials(tokens);
      this.hasValidTokens = true;
      this.storedScopes = tokens.scope || ''; // Store scopes
      
      console.log('✅ Google OAuth tokens saved successfully');
      console.log('📋 Token scopes:', this.storedScopes);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error exchanging OAuth code:', error);
      return { success: false, error: error.message };
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
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      return { email: data.email || undefined, name: data.name || undefined };
    } catch (error) {
      console.warn('Could not get user info:', error);
      return null;
    }
  }
}

export default new GoogleAuthService();

