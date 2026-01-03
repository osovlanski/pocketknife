import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';

class DriveService {
  private drive: any = null;
  private initialized: boolean = false;
  private oauth2Client: any = null;
  private hasValidTokens: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Use OAuth2 (same as Gmail) instead of Service Account
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Load OAuth tokens (same file as Gmail)
      const tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
      
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        this.hasValidTokens = true;
        console.log('✅ Loaded Drive OAuth tokens (shared with Gmail)');
      } else {
        this.hasValidTokens = false;
        console.warn('⚠️ No OAuth tokens found. Drive features will be limited.');
        console.warn('💡 Run: npm run auth:gmail to authorize Google Drive access.');
      }

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.initialized = true;
      console.log('✅ Drive service initialized with OAuth2');
    } catch (error) {
      console.error('❌ Error initializing Drive service:', error);
      throw error;
    }
  }

  async uploadInvoice(filename: string, content: string, mimeType: string = 'text/plain') {
    if (!this.initialized) {
      throw new Error('Drive service not initialized');
    }

    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(Buffer.from(content));

      const response = await this.drive.files.create({
        requestBody: {
          name: filename,
          mimeType: mimeType,
          parents: [process.env.DRIVE_FOLDER_ID]
        },
        media: {
          mimeType: mimeType,
          body: bufferStream
        },
        fields: 'id, name, webViewLink'
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      throw error;
    }
  }

  generateFilename(emailSubject: string, date?: string) {
    const cleanSubject = emailSubject
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const dateStr = date 
      ? new Date(date).toISOString().substring(0, 7)
      : new Date().toISOString().substring(0, 7);
    
    return `${cleanSubject}_${dateStr}.txt`;
  }

  async listInvoices(pageSize: number = 50) {
    if (!this.initialized) {
      throw new Error('Drive service not initialized');
    }

    // Check if we have valid tokens
    if (!this.hasValidTokens) {
      return { 
        invoices: [], 
        authRequired: true,
        message: 'Google Drive not connected. Please authenticate first.' 
      };
    }

    try {
      const response = await this.drive.files.list({
        q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
        pageSize: pageSize,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime, size, mimeType)',
        orderBy: 'createdTime desc'
      });

      return { invoices: response.data.files || [], authRequired: false };
    } catch (error: any) {
      // Handle token expired or invalid
      if (error.message?.includes('No access') || error.message?.includes('invalid_grant')) {
        this.hasValidTokens = false;
        return { 
          invoices: [], 
          authRequired: true,
          message: 'Google authentication expired. Please re-authenticate.' 
        };
      }
      console.error('Error listing invoices from Drive:', error);
      throw error;
    }
  }

  /**
   * Check if Google Drive is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasValidTokens;
  }

  /**
   * Get the OAuth2 authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      return '';
    }
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
  }
}

export default new DriveService();