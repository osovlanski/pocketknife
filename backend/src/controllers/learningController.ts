import { Request, Response } from 'express';
import learningService from '../services/learningService';

/**
 * Search for learning resources across multiple platforms
 */
export async function searchLearningResources(req: Request, res: Response) {
  try {
    const { query, sources = ['devto', 'hackernews', 'reddit'], timeRange = 'week' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`📚 Learning search request: "${query}"`);

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
 * Summarize an article using AI
 */
export async function summarizeArticle(req: Request, res: Response) {
  try {
    const { url, title } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    console.log(`📝 Summarize request for: ${title || url}`);

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

