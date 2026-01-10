import { google } from 'googleapis';
import stream from 'stream';
import googleAuthService from './googleAuthService';

class DriveService {
  private drive: any = null;
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize the shared googleAuthService if not already done
      await googleAuthService.initialize();
      
      const client = googleAuthService.getClient();
      if (client) {
        this.drive = google.drive({ version: 'v3', auth: client });
        console.log('✅ Drive service initialized (using shared GoogleAuthService)');
      } else {
        console.warn('⚠️ Google OAuth not configured. Drive features will be limited.');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error initializing Drive service:', error);
      this.initialized = true; // Mark as initialized to avoid retry loops
    }
  }

  /**
   * Ensure we have a valid Drive client
   */
  private async ensureValidClient() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get fresh client from googleAuthService
    const client = await googleAuthService.getValidClient();
    this.drive = google.drive({ version: 'v3', auth: client });
    return this.drive;
  }

  async uploadInvoice(filename: string, content: string, mimeType: string = 'text/plain') {
    const drive = await this.ensureValidClient();

    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(Buffer.from(content));

      const response = await drive.files.create({
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
      await this.initialize();
    }

    // Refresh auth state from database in case tokens were just saved
    await googleAuthService.refreshFromDatabase();

    // Check if we have valid tokens using the shared service
    if (!googleAuthService.isAuthenticated()) {
      console.log('[DriveService] Not authenticated, returning authRequired');
      return { 
        invoices: [], 
        authRequired: true,
        message: 'Google Drive not connected. Please authenticate first.' 
      };
    }
    
    console.log('[DriveService] Authenticated, fetching invoices...');

    try {
      const drive = await this.ensureValidClient();
      
      const response = await drive.files.list({
        q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
        pageSize: pageSize,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime, size, mimeType)',
        orderBy: 'createdTime desc'
      });

      return { invoices: response.data.files || [], authRequired: false };
    } catch (error: any) {
      // Handle token expired or invalid
      if (error.message?.includes('No access') || 
          error.message?.includes('invalid_grant') ||
          error.code === 401) {
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
    return googleAuthService.isAuthenticated();
  }

  /**
   * Get the OAuth2 authorization URL
   */
  getAuthUrl(): string {
    return googleAuthService.getAuthUrl();
  }
}

export default new DriveService();
