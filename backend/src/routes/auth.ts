import { Router } from 'express';
import { 
  getGoogleAuthStatus, 
  initiateGoogleAuth, 
  handleGoogleCallback,
  disconnectGoogle 
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

export default router;





