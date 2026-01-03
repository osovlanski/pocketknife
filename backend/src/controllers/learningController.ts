import { Request, Response } from 'express';
import learningService from '../services/learning/learningService';
import { databaseService } from '../services/core/databaseService';

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

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'learning',
        action: 'search',
        details: `Searched for: ${query}`,
        metadata: { query, sources, timeRange, resultsCount: resources.length },
        status: 'success'
      });
    }

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

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'learning',
        action: 'summarize-article',
        details: `Summarized: ${title || url}`,
        metadata: { url, title, summaryLength: summary.length },
        status: 'success'
      });
    }

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

/**
 * Generate AI-powered topic summary for improving developer skills
 */
export async function generateTopicSummary(req: Request, res: Response) {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log(`📚 Generating topic summary for: "${topic}"`);

    const summary = await learningService.generateTopicSummary(topic);

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'learning',
        action: 'topic-summary',
        details: `Generated topic summary for: ${topic}`,
        metadata: { topic, summaryLength: summary.length },
        status: 'success'
      });
    }

    res.json({
      success: true,
      topic,
      summary
    });
  } catch (error: any) {
    console.error('❌ Topic summary generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate topic summary'
    });
  }
}

