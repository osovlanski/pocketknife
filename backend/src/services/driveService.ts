import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';

class DriveService {
  private drive: any = null;
  private initialized: boolean = false;
  private oauth2Client: any = null;

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
        console.log('✅ Loaded Drive OAuth tokens (shared with Gmail)');
      } else {
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

    try {
      const response = await this.drive.files.list({
        q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
        pageSize: pageSize,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime, size, mimeType)',
        orderBy: 'createdTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing invoices from Drive:', error);
      throw error;
    }
  }
}

export default new DriveService();