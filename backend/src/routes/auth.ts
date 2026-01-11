import { Router, Request, Response } from 'express';
import { 
  getGoogleAuthStatus, 
  initiateGoogleAuth, 
  handleGoogleCallback,
  disconnectGoogle,
  forceReauth
} from '../controllers/authController';

const router = Router();

// Get Google auth status
router.get('/status', getGoogleAuthStatus);

// Initiate Google OAuth flow (redirects to Google)
router.get('/google', initiateGoogleAuth);

// Handle Google OAuth callback
router.get('/google/callback', handleGoogleCallback);

// Disconnect Google account
router.post('/google/disconnect', disconnectGoogle);

// Force re-authentication (useful when scopes change)
router.post('/google/reauth', forceReauth);

// =============================================================================
// SOCIAL SIGN-IN PROVIDERS STATUS
// =============================================================================

/**
 * Get status of configured social sign-in providers
 * Used by frontend to show/hide social login buttons
 */
router.get('/social/status', (_req: Request, res: Response) => {
  // Check which social providers have their required env vars configured
  const status = {
    facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    sso: !!(process.env.SSO_ISSUER_URL && process.env.SSO_CLIENT_ID)
  };
  
  res.json(status);
});

/**
 * Debug endpoint to check all integration env vars (admin only in production)
 * This helps diagnose "env var not found" issues
 */
router.get('/debug/env-status', (_req: Request, res: Response) => {
  // Only show on development or with special header
  const isDev = process.env.NODE_ENV !== 'production';
  const hasDebugHeader = _req.headers['x-debug-key'] === process.env.DEBUG_SECRET;
  
  if (!isDev && !hasDebugHeader) {
    return res.status(403).json({ error: 'Not available in production' });
  }

  // Check all integration env vars (mask actual values)
  const envStatus = {
    // Core
    database: !!process.env.DATABASE_URL,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    frontendUrl: !!process.env.FRONTEND_URL,
    
    // Google OAuth
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    
    // Social Auth
    facebookAppId: !!process.env.FACEBOOK_APP_ID,
    facebookAppSecret: !!process.env.FACEBOOK_APP_SECRET,
    linkedinClientId: !!process.env.LINKEDIN_CLIENT_ID,
    linkedinClientSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
    ssoIssuerUrl: !!process.env.SSO_ISSUER_URL,
    ssoClientId: !!process.env.SSO_CLIENT_ID,
    
    // Notifications
    telegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: !!process.env.TELEGRAM_CHAT_ID,
    discordWebhookUrl: !!process.env.DISCORD_WEBHOOK_URL,
    
    // External APIs
    rapidApiKey: !!process.env.RAPIDAPI_KEY,
    googleCseApiKey: !!process.env.GOOGLE_CSE_API_KEY,
    googleCseId: !!process.env.GOOGLE_CSE_ID,
    amadeusApiKey: !!process.env.AMADEUS_API_KEY,
    amadeusApiSecret: !!process.env.AMADEUS_API_SECRET,
    adzunaAppId: !!process.env.ADZUNA_APP_ID,
    adzunaApiKey: !!process.env.ADZUNA_API_KEY,
    
    // Metadata
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
  
  res.json(envStatus);
});

export default router;






