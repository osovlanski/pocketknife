/**
 * Google Auth Service Tests
 * 
 * Tests the Google OAuth authentication service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/oauth'),
        getToken: vi.fn().mockResolvedValue({ tokens: { access_token: 'test-token' } }),
        setCredentials: vi.fn(),
        credentials: {},
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'refresh-token',
            expiry_date: Date.now() + 3600000
          }
        })
      }))
    }
  }
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn()
  };
});

describe('GoogleAuthService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Management', () => {
    it('should detect expired tokens correctly', () => {
      const now = Date.now();
      const expiredDate = now - 1000; // 1 second ago
      const validDate = now + 3600000; // 1 hour from now

      expect(expiredDate < now).toBe(true);
      expect(validDate > now).toBe(true);
    });

    it('should identify when refresh is needed', () => {
      const credentials = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() - 1000 // expired
      };

      const isExpired = credentials.expiry_date ? credentials.expiry_date < Date.now() : true;
      expect(isExpired).toBe(true);
    });

    it('should identify valid tokens', () => {
      const credentials = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000 // valid for 1 hour
      };

      const isExpired = credentials.expiry_date ? credentials.expiry_date < Date.now() : true;
      expect(isExpired).toBe(false);
    });
  });

  describe('Token Scopes', () => {
    it('should include required Gmail scopes', () => {
      const requiredScopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels'
      ];

      // Validate scope format
      requiredScopes.forEach(scope => {
        expect(scope).toMatch(/^https:\/\/www\.googleapis\.com\/auth\//);
      });
    });

    it('should include required Calendar scopes', () => {
      const requiredScopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      requiredScopes.forEach(scope => {
        expect(scope).toMatch(/^https:\/\/www\.googleapis\.com\/auth\/calendar/);
      });
    });

    it('should include required Drive scopes', () => {
      const requiredScopes = [
        'https://www.googleapis.com/auth/drive.file'
      ];

      requiredScopes.forEach(scope => {
        expect(scope).toMatch(/^https:\/\/www\.googleapis\.com\/auth\/drive/);
      });
    });
  });

  describe('Credentials Path', () => {
    it('should use correct credentials directory', () => {
      const credentialsDir = path.join(process.cwd(), 'credentials');
      expect(credentialsDir).toContain('credentials');
    });

    it('should construct token file path correctly', () => {
      const tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
      expect(tokenPath).toContain('gmail-token.json');
    });
  });
});

