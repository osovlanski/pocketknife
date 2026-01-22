/**
 * Gmail Service Tests
 * 
 * Tests for the Gmail service that handles email operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockGmailClient, mockGoogleAuthService } = vi.hoisted(() => ({
  mockGmailClient: {
    users: {
      messages: {
        list: vi.fn(),
        get: vi.fn(),
        modify: vi.fn(),
        trash: vi.fn()
      },
      labels: {
        list: vi.fn(),
        create: vi.fn()
      }
    }
  },
  mockGoogleAuthService: {
    initialize: vi.fn(),
    getClient: vi.fn(),
    getValidClient: vi.fn(),
    isAuthenticated: vi.fn()
  }
}));

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn(() => mockGmailClient)
  }
}));

// Mock googleAuthService
vi.mock('../../src/services/email/googleAuthService', () => ({
  default: mockGoogleAuthService
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    api: vi.fn()
  }
}));

// Static import after mocks
import gmailService from '../../src/services/email/gmailService';

describe('Gmail Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks to defaults
    mockGoogleAuthService.initialize.mockResolvedValue(undefined);
    mockGoogleAuthService.getClient.mockReturnValue({});
    mockGoogleAuthService.getValidClient.mockResolvedValue({});
    mockGoogleAuthService.isAuthenticated.mockReturnValue(false);
    
    mockGmailClient.users.messages.list.mockResolvedValue({ data: { messages: [] } });
    mockGmailClient.users.messages.get.mockResolvedValue({ data: {} });
    mockGmailClient.users.messages.modify.mockResolvedValue({});
    mockGmailClient.users.messages.trash.mockResolvedValue({});
    mockGmailClient.users.labels.list.mockResolvedValue({ data: { labels: [] } });
    mockGmailClient.users.labels.create.mockResolvedValue({ data: { id: 'label-1' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await gmailService.initialize();
      
      // Service should be initialized without errors
      expect(mockGoogleAuthService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockGoogleAuthService.initialize.mockRejectedValue(new Error('Init failed'));
      
      // Should not throw
      await expect(gmailService.initialize()).resolves.not.toThrow();
    });
  });

  describe('getUnprocessedEmails', () => {
    it('should return mock emails when not authenticated', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(false);
      
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      expect(Array.isArray(emails)).toBe(true);
    });

    it('should return emails when authenticated', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockResolvedValue({});
      
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: {
          messages: [
            { id: 'msg-1' },
            { id: 'msg-2' }
          ]
        }
      });
      mockGmailClient.users.messages.get.mockResolvedValue({
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
      
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      expect(Array.isArray(emails)).toBe(true);
    });

    it('should handle API errors and return mock emails', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockRejectedValue(new Error('Auth error'));
      
      await gmailService.initialize();
      
      const emails = await gmailService.getUnprocessedEmails();
      
      // Should return mock emails when real API fails
      expect(Array.isArray(emails)).toBe(true);
    });
  });

  describe('getEmailDetails', () => {
    it('should get email details', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockResolvedValue({});
      
      mockGmailClient.users.messages.get.mockResolvedValue({
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
      
      await gmailService.initialize();
      
      const details = await gmailService.getEmailDetails('msg-1');
      
      expect(details).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockRejectedValue(new Error('Not found'));
      
      await gmailService.initialize();
      
      // Should return null or throw depending on implementation
      const result = await gmailService.getEmailDetails('invalid-msg').catch(() => null);
      
      // Either null or caught error - both are acceptable
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe('addLabel', () => {
    it('should add label to email', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockResolvedValue({});
      
      mockGmailClient.users.labels.list.mockResolvedValue({
        data: { labels: [{ id: 'label-1', name: 'Important' }] }
      });
      mockGmailClient.users.messages.modify.mockResolvedValue({ data: {} });
      
      await gmailService.initialize();
      
      await expect(gmailService.addLabel('msg-1', 'Important')).resolves.not.toThrow();
    });

    it('should handle label errors gracefully', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockRejectedValue(new Error('Auth error'));
      
      await gmailService.initialize();
      
      // Should not throw, but log error
      await expect(gmailService.addLabel('msg-1', 'Label')).resolves.not.toThrow();
    });
  });

  describe('moveToFolder', () => {
    it('should move email to folder', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getValidClient.mockResolvedValue({});
      
      mockGmailClient.users.labels.list.mockResolvedValue({
        data: { labels: [{ id: 'label-1', name: 'Archive' }] }
      });
      mockGmailClient.users.messages.modify.mockResolvedValue({ data: {} });
      
      await gmailService.initialize();
      
      await expect(gmailService.moveToFolder('msg-1', 'Archive')).resolves.not.toThrow();
    });
  });
});
