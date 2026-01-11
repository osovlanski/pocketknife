/**
 * News Agent Controller
 * 
 * HTTP request handlers for the News Agent.
 * Thin controller - delegates to agent.
 */

import { Request, Response } from 'express';
import { newsAgent } from '../agents';
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
 * Search news articles
 */
export const searchNews = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    const { query, topics, sources, timeRange, countryCode, maxResults } = req.body;

    const result = await newsAgent.execute({
      action: 'search',
      userId,
      query,
      topics,
      sources,
      timeRange,
      countryCode,
      maxResults
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('News search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get personalized news feed
 */
export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { maxResults } = req.query;

    const result = await newsAgent.execute({
      action: 'get-feed',
      userId,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get feed failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get news digest
 */
export const getDigest = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await newsAgent.execute({
      action: 'get-digest',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get digest failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Save an article
 */
export const saveArticle = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { article } = req.body;

    const result = await newsAgent.execute({
      action: 'save-article',
      userId,
      article
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Save article failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Record user interaction (for learning)
 */
export const recordInteraction = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { articleId, articleUrl, articleTitle, interactionType, readDuration, scrollDepth, isPositive, article } = req.body;

    const result = await newsAgent.execute({
      action: 'record-interaction',
      userId,
      articleId,
      articleUrl,
      articleTitle,
      interactionType,
      readDuration,
      scrollDepth,
      isPositive,
      article
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Record interaction failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get saved articles
 */
export const getSavedArticles = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { maxResults, unreadOnly } = req.query;

    const result = await newsAgent.execute({
      action: 'get-saved',
      userId,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get saved articles failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get trending topics
 */
export const getTrends = async (req: Request, res: Response) => {
  try {
    const { geoScope, countryCode } = req.query;

    const result = await newsAgent.execute({
      action: 'get-trends',
      geoScope: geoScope as 'global' | 'domestic' | 'local',
      countryCode: countryCode as string
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get trends failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { preferences } = req.body;

    const result = await newsAgent.execute({
      action: 'update-preferences',
      userId,
      preferences
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update preferences failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get user preferences
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await newsAgent.execute({
      action: 'get-preferences',
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get preferences failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate article summary
 */
export const summarizeArticle = async (req: Request, res: Response) => {
  try {
    const { articleUrl, article } = req.body;

    const result = await newsAgent.execute({
      action: 'summarize',
      articleUrl,
      article
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Summarize article failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

