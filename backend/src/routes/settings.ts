/**
 * Settings Routes
 * 
 * Routes for user preferences and settings management.
 */

import { Router, Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { authenticate } from '../middleware/adminMiddleware';
import telegramService from '../services/notifications/telegramNotificationService';
import discordService from '../services/notifications/discordNotificationService';

const router = Router();

// =============================================================================
// INTEGRATIONS
// =============================================================================

/**
 * Get Telegram integration status
 * Note: No auth required - just returns config status, no sensitive data
 */
router.get('/integrations/telegram/status', async (_req: Request, res: Response) => {
  try {
    console.log('📱 Telegram status check - BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
    console.log('📱 Telegram status check - CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? 'SET' : 'NOT SET');
    const status = await telegramService.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Get Telegram status error:', error);
    res.status(500).json({ 
      configured: false, 
      connected: false, 
      error: 'Failed to get status' 
    });
  }
});

/**
 * Test Telegram connection
 */
router.post('/integrations/telegram/test', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await telegramService.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error('Test Telegram connection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test connection' 
    });
  }
});

/**
 * Get Discord integration status
 * Note: No auth required - just returns config status, no sensitive data
 */
router.get('/integrations/discord/status', async (_req: Request, res: Response) => {
  try {
    console.log('💬 Discord status check - WEBHOOK_URL:', process.env.DISCORD_WEBHOOK_URL ? 'SET' : 'NOT SET');
    const status = await discordService.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Get Discord status error:', error);
    res.status(500).json({ 
      configured: false, 
      connected: false, 
      error: 'Failed to get status' 
    });
  }
});

/**
 * Test Discord connection
 */
router.post('/integrations/discord/test', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await discordService.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error('Test Discord connection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test connection' 
    });
  }
});

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Get user preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user!.id }
    });

    if (!preferences) {
      // Create default preferences if none exist
      const newPreferences = await prisma.userPreferences.create({
        data: {
          userId: req.user!.id,
          preferredLanguage: 'javascript',
          preferredJobTypes: [],
          preferredLocations: [],
          preferredCompanies: [],
          preferredAirlines: [],
          completedLists: []
        }
      });
      return res.json({ preferences: newPreferences });
    }

    res.json({ preferences });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * Update user preferences
 */
router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.user!.id },
      update: updateData,
      create: {
        userId: req.user!.id,
        preferredLanguage: 'javascript',
        preferredJobTypes: [],
        preferredLocations: [],
        preferredCompanies: [],
        preferredAirlines: [],
        completedLists: [],
        ...updateData
      }
    });

    res.json({ preferences });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { name, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl })
      },
      include: { preferences: true }
    });

    res.json({ user });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;



