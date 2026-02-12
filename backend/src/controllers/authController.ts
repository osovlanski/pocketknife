import { Request, Response } from 'express';
import googleAuthService from '../services/email/googleAuthService';

/**
 * Get Google auth status
 */
export const getGoogleAuthStatus = async (req: Request, res: Response) => {
  try {
    const isAuthenticated = googleAuthService.isAuthenticated();
    let userInfo: { email?: string; name?: string } | null = null;
    let authUrl = null;
    
    if (isAuthenticated) {
      // Try to get user info (will refresh token if needed)
      try {
        userInfo = await googleAuthService.getUserInfo();
      } catch (userInfoError: any) {
        console.warn('Failed to get user info:', userInfoError.message);
      }
      
      // If userInfo is null (API call failed), try to get email from tokens
      if (!userInfo) {
        try {
          const email = await googleAuthService.getEmailFromTokens();
          if (email) {
            userInfo = { email };
          }
        } catch (emailError: any) {
          console.warn('Failed to get email from tokens:', emailError.message);
        }
      }
    } else {
      // Provide auth URL for unauthenticated users
      try {
        authUrl = googleAuthService.getAuthUrl();
      } catch (authUrlError: any) {
        console.warn('Failed to get auth URL:', authUrlError.message);
        // OAuth not configured - this is expected in some environments
      }
    }
    
    res.json({
      authenticated: isAuthenticated,
      user: userInfo,
      email: userInfo?.email,
      authUrl,
      message: isAuthenticated 
        ? (userInfo?.email ? `Connected as ${userInfo.email}` : 'Google account connected')
        : 'Google account not connected'
    });
  } catch (error: any) {
    console.error('Error getting Google auth status:', error);
    res.status(500).json({
      authenticated: false,
      error: error?.message || 'Unknown authentication error'
    });
  }
};

/**
 * Initiate Google OAuth flow - redirects to Google
 */
export const initiateGoogleAuth = async (req: Request, res: Response) => {
  try {
    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env file. See GOOGLE_SETUP.md for instructions.')}`);
    }
    
    const authUrl = googleAuthService.getAuthUrl();
    
    // Check if request wants JSON (API call) or redirect (browser)
    if (req.query.redirect === 'false') {
      res.json({ authUrl });
    } else {
      res.redirect(authUrl);
    }
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = async (req: Request, res: Response) => {
  const { code, error } = req.query;
  
  // Input validation and sanitization
  if (error) {
    const sanitizedError = typeof error === 'string' ? error.slice(0, 200) : 'Unknown error';
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(sanitizedError)}`);
  }
  
  if (!code || typeof code !== 'string' || code.length > 1000) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=Invalid authorization code`);
  }
  
  try {
    const result = await googleAuthService.handleCallback(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (result.success) {
      // Redirect to frontend with success and email
      const params = new URLSearchParams({ auth: 'success' });
      if (result.email) {
        params.append('email', result.email);
      }
      res.redirect(`${frontendUrl}?${params.toString()}`);
    } else {
      res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(result.error || 'Unknown error')}`);
    }
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Disconnect Google account
 */
export const disconnectGoogle = async (req: Request, res: Response) => {
  try {
    const result = await googleAuthService.disconnect();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Google account disconnected successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Force re-authentication (useful when scopes have changed)
 * This deletes existing tokens and returns a new auth URL
 */
export const forceReauth = async (req: Request, res: Response) => {
  try {
    const result = await googleAuthService.forceReauth();
    
    res.json({
      success: result.success,
      message: 'Please re-authenticate to grant new permissions',
      authUrl: result.authUrl,
      needsReauth: true
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

