import { Request, Response } from 'express';
import learningService from '../services/learningService';

// Initialize LinkedIn from environment on startup
if (process.env.LINKEDIN_ACCESS_TOKEN) {
  learningService.configureLinkedIn({
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
    isPremium: process.env.LINKEDIN_IS_PREMIUM === 'true'
  });
}

/**
 * Search for learning resources across multiple platforms
 */
export async function searchLearningResources(req: Request, res: Response) {
  try {
    const { query, sources = ['devto', 'hackernews', 'reddit', 'newsletters'], timeRange = 'week' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`📚 Learning search request: "${query}" | Sources: ${sources.join(', ')}`);

    // Get socket.io instance for real-time updates
    const io = req.app.get('io');

    const resources = await learningService.searchAllSources({
      query,
      sources,
      timeRange
    }, io);

    res.json({
      success: true,
      query,
      count: resources.length,
      resources
    });
  } catch (error: any) {
    console.error('❌ Learning search error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search learning resources'
    });
  }
}

/**
 * Summarize an article using AI (Expert-level summary with bullets, diagrams, key points)
 */
export async function summarizeArticle(req: Request, res: Response) {
  try {
    const { url, title } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    console.log(`📝 Expert summarize request for: ${title || url}`);

    const summary = await learningService.summarizeArticle(url, title || 'Article');

    res.json({
      success: true,
      url,
      summary
    });
  } catch (error: any) {
    console.error('❌ Summarization error:', error);
    res.status(500).json({
      error: error.message || 'Failed to summarize article'
    });
  }
}

/**
 * Get LinkedIn integration status and instructions
 */
export async function getLinkedInInfo(req: Request, res: Response) {
  try {
    const info = learningService.getLinkedInIntegrationInfo();
    res.json(info);
  } catch (error: any) {
    console.error('❌ Error getting LinkedIn info:', error);
    res.status(500).json({
      error: error.message || 'Failed to get LinkedIn info'
    });
  }
}

/**
 * Configure LinkedIn integration
 */
export async function configureLinkedIn(req: Request, res: Response) {
  try {
    const { accessToken, isPremium } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    learningService.configureLinkedIn({
      accessToken,
      isPremium: isPremium === true
    });

    console.log('🔗 LinkedIn configured via API');

    res.json({
      success: true,
      message: 'LinkedIn integration configured successfully',
      isPremium: isPremium === true
    });
  } catch (error: any) {
    console.error('❌ Error configuring LinkedIn:', error);
    res.status(500).json({
      error: error.message || 'Failed to configure LinkedIn'
    });
  }
}

