/**
 * Auth Controller Tests
 * 
 * Tests for the Auth controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/email/googleAuthService', () => ({
  default: {
    isAuthenticated: vi.fn().mockReturnValue(false),
    getUserInfo: vi.fn().mockResolvedValue(null),
    getEmailFromTokens: vi.fn().mockResolvedValue(null),
    getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
    handleCallback: vi.fn().mockResolvedValue({ success: true, email: 'test@test.com' }),
    disconnect: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockRedirect: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGoogleAuthStatus', () => {
    it('should return unauthenticated status', async () => {
      const { getGoogleAuthStatus } = await import('../../src/controllers/authController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(false);
    });

    it('should return authenticated status with user info', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getUserInfo as any).mockResolvedValue({ email: 'user@test.com', name: 'Test User' });
      
      const { getGoogleAuthStatus } = await import('../../src/controllers/authController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(true);
      expect(response.user.email).toBe('user@test.com');
    });

    it('should fall back to email from tokens when getUserInfo fails', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockReturnValue(true);
      (googleAuthService.getUserInfo as any).mockResolvedValue(null);
      (googleAuthService.getEmailFromTokens as any).mockResolvedValue('fallback@test.com');
      
      const { getGoogleAuthStatus } = await import('../../src/controllers/authController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.authenticated).toBe(true);
      expect(response.user.email).toBe('fallback@test.com');
    });

    it('should handle errors', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.isAuthenticated as any).mockImplementation(() => {
        throw new Error('Auth error');
      });
      
      const { getGoogleAuthStatus } = await import('../../src/controllers/authController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('initiateGoogleAuth', () => {
    it('should redirect to auth URL when credentials are configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      
      const { initiateGoogleAuth } = await import('../../src/controllers/authController');

      await initiateGoogleAuth(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should return JSON authUrl when redirect=false', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      
      const { initiateGoogleAuth } = await import('../../src/controllers/authController');
      
      mockReq.query = { redirect: 'false' };

      await initiateGoogleAuth(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should redirect with error when credentials not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      const { initiateGoogleAuth } = await import('../../src/controllers/authController');

      await initiateGoogleAuth(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });
  });

  describe('handleGoogleCallback', () => {
    it('should handle successful callback', async () => {
      const { handleGoogleCallback } = await import('../../src/controllers/authController');
      
      mockReq.query = { code: 'auth-code-123' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=success');
    });

    it('should handle callback error', async () => {
      const { handleGoogleCallback } = await import('../../src/controllers/authController');
      
      mockReq.query = { error: 'access_denied' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });

    it('should handle missing code', async () => {
      const { handleGoogleCallback } = await import('../../src/controllers/authController');
      
      mockReq.query = {};

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });

    it('should handle auth service failure', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.handleCallback as any).mockResolvedValue({
        success: false,
        error: 'Invalid code'
      });
      
      const { handleGoogleCallback } = await import('../../src/controllers/authController');
      
      mockReq.query = { code: 'invalid-code' };

      await handleGoogleCallback(mockReq as Request, mockRes as Response);

      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0];
      expect(redirectUrl).toContain('auth=error');
    });
  });

  describe('disconnectGoogle', () => {
    it('should disconnect successfully', async () => {
      const { disconnectGoogle } = await import('../../src/controllers/authController');

      await disconnectGoogle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle disconnect error', async () => {
      const googleAuthService = (await import('../../src/services/email/googleAuthService')).default;
      (googleAuthService.disconnect as any).mockRejectedValue(new Error('Disconnect failed'));
      
      const { disconnectGoogle } = await import('../../src/controllers/authController');

      await disconnectGoogle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});

