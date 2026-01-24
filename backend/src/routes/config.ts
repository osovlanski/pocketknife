/**
 * Config Routes
 * 
 * API endpoints for fetching and managing configuration.
 */

import { Router, Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { configService } from '../services/core/configService';
import logger from '../utils/logger';

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
    logger.fail('Error fetching public config', { error: error.message });
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
    logger.fail('Error fetching all config', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/config/frontend
 * Get all configuration needed by frontend components (dropdowns, options, etc.)
 * This returns configuration that was previously hardcoded in frontend components
 */
router.get('/frontend', async (req: Request, res: Response) => {
  try {
    // Shopping options
    const shopping = {
      sources: configService.get('shopping.search.defaultSources', ['ebay', 'aliexpress', 'amazon']) as string[],
      dealScoreThresholds: {
        excellent: configService.get('shopping.dealScore.excellent', 80),
        good: configService.get('shopping.dealScore.good', 60),
        fair: configService.get('shopping.dealScore.fair', 40),
        poor: 20
      }
    };

    // Problem solving options
    const problems = {
      categories: [
        { id: 'all', label: 'All Categories' },
        { id: 'arrays', label: 'Arrays' },
        { id: 'strings', label: 'Strings' },
        { id: 'linked-lists', label: 'Linked Lists' },
        { id: 'trees', label: 'Trees' },
        { id: 'graphs', label: 'Graphs' },
        { id: 'dynamic-programming', label: 'Dynamic Programming' },
        { id: 'backtracking', label: 'Backtracking' },
        { id: 'sorting', label: 'Sorting' },
        { id: 'searching', label: 'Searching' }
      ],
      difficulties: [
        { id: 'all', label: 'All Difficulties' },
        { id: 'easy', label: 'Easy' },
        { id: 'medium', label: 'Medium' },
        { id: 'hard', label: 'Hard' }
      ],
      languages: [
        { id: 'javascript', label: 'JavaScript' },
        { id: 'python', label: 'Python' },
        { id: 'java', label: 'Java' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'cpp', label: 'C++' },
        { id: 'go', label: 'Go' }
      ],
      curatedLists: [
        { id: 'blind75', label: 'Blind 75', count: 75 },
        { id: 'neetcode150', label: 'NeetCode 150', count: 150 },
        { id: 'grind75', label: 'Grind 75', count: 75 }
      ]
    };

    // News options
    const news = {
      topics: [
        { id: 'tech', label: 'Technology', icon: '💻' },
        { id: 'business', label: 'Business', icon: '💼' },
        { id: 'science', label: 'Science', icon: '🔬' },
        { id: 'health', label: 'Health', icon: '🏥' },
        { id: 'sports', label: 'Sports', icon: '⚽' },
        { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
        { id: 'politics', label: 'Politics', icon: '🏛️' },
        { id: 'money', label: 'Finance', icon: '💰' }
      ],
      sources: ['hackernews', 'reddit', 'gnews', 'mediastack', 'lobsters', 'devto']
    };

    // Travel options
    const travel = {
      priceLevels: [
        { id: 'budget', label: 'Budget' },
        { id: 'mid', label: 'Mid-Range' },
        { id: 'premium', label: 'Premium' }
      ],
      israelRegions: [
        { id: 'north', label: 'North (Galilee)' },
        { id: 'center', label: 'Center (Tel Aviv)' },
        { id: 'jerusalem', label: 'Jerusalem' },
        { id: 'dead_sea', label: 'Dead Sea' },
        { id: 'negev', label: 'Negev' },
        { id: 'eilat', label: 'Eilat' }
      ],
      activityTypes: [
        { id: 'hiking', label: 'Hiking' },
        { id: 'beach', label: 'Beach' },
        { id: 'historical', label: 'Historical Sites' },
        { id: 'nature', label: 'Nature Reserves' },
        { id: 'food', label: 'Food & Dining' },
        { id: 'nightlife', label: 'Nightlife' },
        { id: 'shopping', label: 'Shopping' },
        { id: 'adventure', label: 'Adventure Sports' }
      ]
    };

    // Jobs options
    const jobs = {
      industries: [
        { id: 'fintech', label: 'Fintech' },
        { id: 'cybersecurity', label: 'Cybersecurity' },
        { id: 'healthtech', label: 'Healthtech' },
        { id: 'ai_ml', label: 'AI/ML' },
        { id: 'cloud', label: 'Cloud/Infrastructure' },
        { id: 'saas', label: 'SaaS' },
        { id: 'ecommerce', label: 'E-commerce' },
        { id: 'gaming', label: 'Gaming' },
        { id: 'edtech', label: 'EdTech' },
        { id: 'cleantech', label: 'CleanTech' },
        { id: 'automotive', label: 'Automotive' },
        { id: 'defense', label: 'Defense' },
        { id: 'other', label: 'Other' }
      ],
      companySizes: [
        { id: 'startup', label: 'Startup', range: '1-50 employees' },
        { id: 'midsize', label: 'Mid-size', range: '51-500 employees' },
        { id: 'enterprise', label: 'Enterprise', range: '500+ employees' }
      ]
    };

    // Cooking options
    const cooking = {
      categories: [
        { id: 'produce', label: 'Produce', color: '#4CAF50' },
        { id: 'dairy', label: 'Dairy', color: '#FFEB3B' },
        { id: 'meat', label: 'Meat', color: '#F44336' },
        { id: 'seafood', label: 'Seafood', color: '#2196F3' },
        { id: 'frozen', label: 'Frozen', color: '#03A9F4' },
        { id: 'pantry', label: 'Pantry', color: '#795548' },
        { id: 'beverages', label: 'Beverages', color: '#9C27B0' },
        { id: 'snacks', label: 'Snacks', color: '#FF9800' },
        { id: 'bakery', label: 'Bakery', color: '#D7CCC8' },
        { id: 'condiments', label: 'Condiments', color: '#FFC107' },
        { id: 'grains', label: 'Grains', color: '#8D6E63' },
        { id: 'spices', label: 'Spices', color: '#FF5722' }
      ],
      units: ['pcs', 'pack', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'cup', 'tbsp', 'tsp', 'dozen']
    };

    // DIY options
    const diy = {
      categories: [
        { id: 'home_improvement', label: 'Home Improvement', icon: '🏠' },
        { id: 'electronics', label: 'Electronics', icon: '🔌' },
        { id: 'woodworking', label: 'Woodworking', icon: '🪵' },
        { id: 'crafts', label: 'Crafts', icon: '🎨' },
        { id: 'automotive', label: 'Automotive', icon: '🚗' },
        { id: 'gardening', label: 'Gardening', icon: '🌱' },
        { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
        { id: 'electrical', label: 'Electrical', icon: '⚡' },
        { id: 'furniture', label: 'Furniture', icon: '🪑' },
        { id: 'outdoor', label: 'Outdoor', icon: '⛺' }
      ],
      skillLevels: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' }
      ],
      difficultyLevels: [
        { id: 'easy', label: 'Easy' },
        { id: 'medium', label: 'Medium' },
        { id: 'hard', label: 'Hard' },
        { id: 'expert', label: 'Expert' }
      ]
    };

    res.json({
      success: true,
      config: {
        shopping,
        problems,
        news,
        travel,
        jobs,
        cooking,
        diy
      },
      // Include common thresholds
      thresholds: {
        shopping: configService.getShoppingThresholds(),
        jobs: configService.getJobThresholds()
      },
      // Cache hint for frontend
      cacheMaxAge: 300 // 5 minutes
    });
  } catch (error: any) {
    logger.fail('Error fetching frontend config', { error: error.message });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch frontend configuration' 
    });
  }
});

/**
 * PUT /api/config/:id
 * Update a configuration setting (admin only)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
    logger.fail('Error updating config', { error: error.message });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;



