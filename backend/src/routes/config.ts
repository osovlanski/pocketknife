/**
 * Config Routes
 * 
 * API endpoints for fetching and managing configuration.
 */

import { Router, Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { configService } from '../services/core/configService';

const router = Router();

/**
 * GET /api/config/public
 * Get all public configuration settings
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    
    if (!prisma) {
      // Return defaults if no database
      return res.json({
        settings: {
          shopping: configService.getShoppingThresholds(),
          jobs: configService.getJobThresholds()
        }
      });
    }

    // Fetch public settings from database
    const settings = await prisma.systemSetting.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        category: true,
        name: true,
        value: true,
        description: true
      }
    });

    // Group by category
    const grouped: Record<string, Record<string, unknown>> = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      // Extract the key from id (e.g., 'shopping.dealScore.excellent' -> 'dealScore.excellent')
      const key = setting.id.replace(`${setting.category}.`, '');
      grouped[setting.category][key] = setting.value;
    }

    res.json({
      settings: grouped,
      // Also include commonly needed settings in a flat structure
      thresholds: {
        shopping: configService.getShoppingThresholds(),
        jobs: configService.getJobThresholds()
      }
    });
  } catch (error: any) {
    console.error('Error fetching public config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/config/all
 * Get all configuration settings (admin only)
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    
    if (!prisma) {
      return res.json({
        settings: configService.getAll()
      });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    }

    res.json({
      settings: grouped,
      categories: Object.keys(grouped)
    });
  } catch (error: any) {
    console.error('Error fetching all config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * PUT /api/config/:id
 * Update a configuration setting (admin only)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    const adminEmail = req.headers['x-user-email'] as string;

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(400).json({ error: 'Database not configured' });
    }

    // Check if setting exists and is editable
    const setting = await prisma.systemSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!setting.isEditable) {
      return res.status(403).json({ error: 'This setting cannot be modified' });
    }

    // Update the setting
    const updated = await prisma.systemSetting.update({
      where: { id },
      data: {
        value,
        updatedBy: adminEmail || undefined
      }
    });

    // Refresh config cache
    await configService.refresh();

    res.json({
      success: true,
      setting: updated
    });
  } catch (error: any) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;



