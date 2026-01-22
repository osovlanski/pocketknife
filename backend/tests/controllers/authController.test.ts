/**
 * Auth Controller Tests
 * 
 * Tests for the Auth controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted for mocks
const { mockGoogleAuthService } = vi.hoisted(() => ({
  mockGoogleAuthService: {
    isAuthenticated: vi.fn(),
    getUserInfo: vi.fn(),
    getEmailFromTokens: vi.fn(),
    getAuthUrl: vi.fn(),
    handleCallback: vi.fn(),
    disconnect: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/email/googleAuthService', () => ({
  default: mockGoogleAuthService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn()
  }
}));

// Static imports after mocks
import {
  getGoogleAuthStatus,
  initiateGoogleAuth,
  handleGoogleCallback,
  disconnectGoogle
} from '../../src/controllers/authController';

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockRedirect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockRedirect = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus,
      redirect: mockRedirect
    };
    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    // Reset mock values to defaults
    mockGoogleAuthService.isAuthenticated.mockReturnValue(false);
    mockGoogleAuthService.getUserInfo.mockResolvedValue(null);
    mockGoogleAuthService.getEmailFromTokens.mockResolvedValue(null);
    mockGoogleAuthService.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth');
    mockGoogleAuthService.handleCallback.mockResolvedValue({ success: true, email: 'test@test.com' });
    mockGoogleAuthService.disconnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGoogleAuthStatus', () => {
    it('should return unauthenticated status', async () => {
      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(false);
    });

    it('should return authenticated status with user info', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getUserInfo.mockResolvedValue({ email: 'user@test.com', name: 'Test User' });

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(true);
      expect(response.user.email).toBe('user@test.com');
    });

    it('should fall back to email from tokens when getUserInfo fails', async () => {
      mockGoogleAuthService.isAuthenticated.mockReturnValue(true);
      mockGoogleAuthService.getUserInfo.mockResolvedValue(null);
      mockGoogleAuthService.getEmailFromTokens.mockResolvedValue('fallback@test.com');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(true);
      expect(response.user.email).toBe('fallback@test.com');
    });
  });

  describe('initiateGoogleAuth', () => {
    it('should redirect to Google auth URL', async () => {
      // Set up env vars
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
      
      await initiateGoogleAuth(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
    });
  });

  describe('handleGoogleCallback', () => {
    it('should handle successful callback', async () => {
      mockGoogleAuthService.handleCallback.mockResolvedValue({ 
        success: true, 
        email: 'test@test.com' 
      });
      
      mockReq.query = { code: 'auth-code-123' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=success');
    });

    it('should handle callback error', async () => {
      mockReq.query = { error: 'access_denied' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });

    it('should handle missing code', async () => {
      mockReq.query = {};

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });

    it('should handle auth service failure', async () => {
      mockGoogleAuthService.handleCallback.mockResolvedValue({
        success: false,
        error: 'Invalid code'
      });
      
      mockReq.query = { code: 'invalid-code' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });
  });

  describe('disconnectGoogle', () => {
    it('should disconnect successfully', async () => {
      mockGoogleAuthService.disconnect.mockResolvedValue({ success: true });

      await disconnectGoogle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle disconnect error', async () => {
      mockGoogleAuthService.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      await disconnectGoogle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});
