/**
 * Config Controller
 * 
 * Handles configuration API requests.
 */

import { Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { configService } from '../services/core/configService';
import logger from '../utils/logger';

/**
 * GET /api/config
 * Get public configuration settings
 */
export const getConfig = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    
    if (!prisma) {
      // Return defaults if no database
      return res.json({
        success: true,
        settings: {
          shopping: configService.getShoppingThresholds(),
          jobs: configService.getJobThresholds(),
          email: configService.getEmailSettings(),
          api: configService.getApiLimits()
        },
        thresholds: {
          shopping: configService.getShoppingThresholds(),
          jobs: configService.getJobThresholds()
        },
        agents: {
          email: true,
          jobs: true,
          travel: true,
          learning: true,
          problems: true,
          todo: true,
          shopping: true
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

    // Get agent enabled status from system settings
    const agentSettings = await prisma.systemSetting.findMany({
      where: { 
        category: 'agents',
        id: { startsWith: 'agents.' }
      }
    });

    // Build agent status map
    const agents: Record<string, boolean> = {
      email: true,
      jobs: true,
      travel: true,
      learning: true,
      problems: true,
      todo: true,
      shopping: true
    };

    for (const setting of agentSettings) {
      // Extract agent name from id (e.g., 'agents.email_enabled' -> 'email')
      const match = setting.id.match(/^agents\.(\w+)_enabled$/);
      if (match) {
        // Handle different value formats (JSON can store as boolean, string, or number)
        const val = setting.value;
        const isEnabled = val === true || val === 'true' || val === 1;
        agents[match[1]] = isEnabled;
        logger.info(`[Config] Agent ${match[1]}: ${isEnabled} (raw value: ${JSON.stringify(val)})`);
      }
    }

    res.json({
      success: true,
      settings: grouped,
      // Also include commonly needed thresholds
      thresholds: {
        shopping: configService.getShoppingThresholds(),
        jobs: configService.getJobThresholds()
      },
      // Include agent enabled status
      agents
    });
  } catch (error: any) {
    console.error('Error fetching config:', error);
    console.error('Stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch configuration';
    if (error.code === 'P2021') {
      errorMessage = 'Database table not found. Run migrations: npx prisma migrate deploy';
    } else if (error.code === 'P1001') {
      errorMessage = 'Cannot connect to database. Check DATABASE_URL';
    } else if (error.message) {
      errorMessage = `Config error: ${error.message}`;
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      code: error.code
    });
  }
};

/**
 * POST /api/config
 * Update configuration setting (admin only)
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { id, value } = req.body;
    const adminEmail = req.headers['x-user-email'] as string;

    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Setting ID is required' 
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(400).json({ 
        success: false,
        error: 'Database not configured' 
      });
    }

    // Check if setting exists and is editable
    const setting = await prisma.systemSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return res.status(404).json({ 
        success: false,
        error: 'Setting not found' 
      });
    }

    if (!setting.isEditable) {
      return res.status(403).json({ 
        success: false,
        error: 'This setting cannot be modified' 
      });
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
      setting: updated,
      message: `Setting '${setting.name}' updated successfully`
    });
  } catch (error: any) {
    console.error('Error updating config:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update configuration' 
    });
  }
};

/**
 * GET /api/config/all
 * Get all configuration settings (admin only)
 */
export const getAllConfig = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    
    if (!prisma) {
      return res.json({
        success: true,
        settings: configService.getAll(),
        categories: []
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
      success: true,
      settings: grouped,
      categories: Object.keys(grouped).sort()
    });
  } catch (error: any) {
    console.error('Error fetching all config:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch configuration' 
    });
  }
};
