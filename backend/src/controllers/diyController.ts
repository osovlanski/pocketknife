/**
 * DIY Agent Controller
 * 
 * HTTP request handlers for the DIY Agent.
 * Thin controller - delegates to agent.
 */

import { Request, Response } from 'express';
import { diyAgent } from '../agents';
import { databaseService } from '../services/core/databaseService';

/**
 * Get user ID from request headers
 */
const getUserId = async (req: Request): Promise<string | undefined> => {
  const email = req.headers['x-user-email'] as string;
  if (!email) return undefined;
  const user = await databaseService.getOrCreateUser(email);
  return user?.id;
};

/**
 * Generate DIY project instructions
 */
export const generateProject = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    const { description, category, budget, currency, skillLevel, timeAvailable, existingTools } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'Project description is required' });
    }

    const result = await diyAgent.execute({
      action: 'generate',
      userId,
      description,
      category,
      budget,
      currency,
      skillLevel,
      timeAvailable,
      existingTools
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Generate project failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get a specific project
 */
export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await diyAgent.execute({
      action: 'get-project',
      projectId: id
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get project failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get user's projects
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status, category, limit } = req.query;

    const result = await diyAgent.execute({
      action: 'get-projects',
      userId,
      status: status as string,
      category: category as string,
      limit: limit ? parseInt(limit as string) : undefined
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get projects failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Save a project
 */
export const saveProject = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { project } = req.body;

    const result = await diyAgent.execute({
      action: 'save-project',
      userId,
      project
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Save project failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update project status
 */
export const updateProjectStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, startedAt, completedAt, actualTime, actualCost } = req.body;

    const result = await diyAgent.execute({
      action: 'update-status',
      projectId: id,
      status,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      completedAt: completedAt ? new Date(completedAt) : undefined,
      actualTime,
      actualCost
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update project status failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get materials with purchase links
 */
export const getMaterialsWithLinks = async (req: Request, res: Response) => {
  try {
    const { materials, location } = req.body;

    const result = await diyAgent.execute({
      action: 'get-materials-links',
      materials,
      location
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get materials links failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create shopping list from project materials
 */
export const createShoppingList = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { projectId, materials } = req.body;

    const result = await diyAgent.execute({
      action: 'create-shopping-list',
      userId,
      projectId,
      materials
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Create shopping list failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search for DIY ideas
 */
export const searchIdeas = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const result = await diyAgent.execute({
      action: 'search-ideas',
      query: query as string
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Search ideas failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get DIY templates
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const result = await diyAgent.execute({
      action: 'get-templates',
      category: category as string
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get templates failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add project feedback
 */
export const addFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, notes, lessonsLearned } = req.body;

    const result = await diyAgent.execute({
      action: 'add-feedback',
      projectId: id,
      rating,
      notes,
      lessonsLearned
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Add feedback failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get categories and difficulty info
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await diyAgent.execute({
      action: 'get-categories'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get categories failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

