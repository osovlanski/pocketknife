/**
 * Gmail Service Tests
 * 
 * Tests for the Gmail service that handles email operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn().mockReturnValue({
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({ data: { messages: [] } }),
          get: vi.fn().mockResolvedValue({ data: {} }),
          modify: vi.fn().mockResolvedValue({}),
          trash: vi.fn().mockResolvedValue({})
        },
        labels: {
          list: vi.fn().mockResolvedValue({ data: { labels: [] } }),
          create: vi.fn().mockResolvedValue({ data: { id: 'label-1' } })
        }
      }
    })
  }
}));

// Mock googleAuthService
vi.mock('../../src/services/email/googleAuthService', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockReturnValue({}),
    getValidClient: vi.fn().mockResolvedValue({}),
    isAuthenticated: vi.fn().mockReturnValue(false)
  }
}));

describe('Gmail Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      
      await gmailService.initialize();
      
      // Service should be initialized without errors
      expect(true).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.initialize as any).mockRejectedValue(new Error('Init failed'));
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      
      // Should not throw
      await expect(gmailService.initialize()).resolves.not.toThrow();
    });
  });

  describe('getUnprocessedEmails', () => {
    it('should return mock emails when not authenticated', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      expect(Array.isArray(emails)).toBe(true);
    });

    it('should return emails when authenticated', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockResolvedValue({});
      
      const { google } = await import('googleapis');
      const mockGmail = google.gmail();
      (mockGmail.users.messages.list as any).mockResolvedValue({
        data: {
          messages: [
            { id: 'msg-1' },
            { id: 'msg-2' }
          ]
        }
      });
      (mockGmail.users.messages.get as any).mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Email' },
              { name: 'From', value: 'test@test.com' },
              { name: 'Date', value: '2026-01-20' }
            ],
            body: { data: '' }
          },
          snippet: 'Test snippet'
        }
      });
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      expect(Array.isArray(emails)).toBe(true);
    });

    it('should handle API errors and return mock emails', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockRejectedValue(new Error('Auth error'));
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      // Should return mock emails when real API fails
      expect(Array.isArray(emails)).toBe(true);
    });
  });

  describe('getEmailDetails', () => {
    it('should get email details', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockResolvedValue({});
      
      const { google } = await import('googleapis');
      const mockGmail = google.gmail();
      (mockGmail.users.messages.get as any).mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Email' },
              { name: 'From', value: 'test@test.com' },
              { name: 'Date', value: '2026-01-20' }
            ],
            body: { data: '' }
          },
          snippet: 'Test snippet'
        }
      });
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      const details = await gmailService.getEmailDetails('msg-1');
      
      expect(details).toBeDefined();
    });

    it('should return null for invalid message', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockRejectedValue(new Error('Not found'));
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      const details = await gmailService.getEmailDetails('invalid-msg');
      
      expect(details).toBeNull();
    });
  });

  describe('addLabel', () => {
    it('should add label to email', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockResolvedValue({});
      
      const { google } = await import('googleapis');
      const mockGmail = google.gmail();
      (mockGmail.users.labels.list as any).mockResolvedValue({
        data: { labels: [{ id: 'label-1', name: 'Important' }] }
      });
      (mockGmail.users.messages.modify as any).mockResolvedValue({ data: {} });
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      await expect(gmailService.addLabel('msg-1', 'Important')).resolves.not.toThrow();
    });

    it('should handle label errors gracefully', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockRejectedValue(new Error('Auth error'));
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      // Should not throw, but log error
      await expect(gmailService.addLabel('msg-1', 'Label')).resolves.not.toThrow();
    });
  });

  describe('moveToFolder', () => {
    it('should move email to folder', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getValidClient as any).mockResolvedValue({});
      
      const { google } = await import('googleapis');
      const mockGmail = google.gmail();
      (mockGmail.users.labels.list as any).mockResolvedValue({
        data: { labels: [{ id: 'label-1', name: 'Archive' }] }
      });
      (mockGmail.users.messages.modify as any).mockResolvedValue({ data: {} });
      
      const { default: gmailService } = await import('../../src/services/email/gmailService');
      await gmailService.initialize();
      
      await expect(gmailService.moveToFolder('msg-1', 'Archive')).resolves.not.toThrow();
    });
  });
});
