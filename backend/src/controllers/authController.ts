import { Request, Response } from 'express';
import googleAuthService from '../services/email/googleAuthService';

/**
 * Get Google auth status
 */
export const getGoogleAuthStatus = async (req: Request, res: Response) => {
  try {
    const isAuthenticated = googleAuthService.isAuthenticated();
    let userInfo = null;
    
    if (isAuthenticated) {
      userInfo = await googleAuthService.getUserInfo();
    }
    
    res.json({
      authenticated: isAuthenticated,
      user: userInfo,
      message: isAuthenticated 
        ? 'Google account connected' 
        : 'Google account not connected'
    });
  } catch (error: any) {
    res.status(500).json({
      authenticated: false,
      error: error.message
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
  
  if (error) {
    // User denied access or other error
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(error as string)}`);
  }
  
  if (!code || typeof code !== 'string') {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=No authorization code received`);
  }
  
  try {
    const result = await googleAuthService.handleCallback(code);
    
    if (result.success) {
      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(result.error || 'Unknown error')}`);
    }
  } catch (error: any) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(error.message)}`);
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

