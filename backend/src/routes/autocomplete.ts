/**
 * Autocomplete Routes
 * 
 * Provides search suggestions based on user history and cached popular searches.
 */

import { Router, Request, Response } from 'express';
import { cacheService } from '../services/core/cacheService';
import { databaseService, getPrisma } from '../services/core/databaseService';

const router = Router();

// Cache keys
const POPULAR_SEARCHES_KEY = 'autocomplete:popular';
const USER_HISTORY_PREFIX = 'autocomplete:user:';

interface SearchHistoryItem {
  query: string;
  agent: string;
  count: number;
  lastUsed: Date;
}

/**
 * GET /api/autocomplete
 * Get autocomplete suggestions for a query
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, agent, limit = '10' } = req.query;
    const query = (q as string || '').toLowerCase().trim();
    const agentType = agent as string || 'all';
    const maxResults = Math.min(parseInt(limit as string) || 10, 20);

    if (!query || query.length < 2) {
      // Return popular searches when no query
      const popular = await getPopularSearches(agentType, maxResults);
      return res.json({ suggestions: popular, source: 'popular' });
    }

    // Get suggestions from multiple sources
    const [userHistory, popularMatches] = await Promise.all([
      getUserSearchHistory(agentType, query, maxResults),
      getPopularSearches(agentType, maxResults)
    ]);

    // Filter popular searches that match the query
    const filteredPopular = popularMatches.filter(
      (s) => s.toLowerCase().includes(query) && !userHistory.includes(s)
    );

    // Combine and dedupe
    const suggestions = [...userHistory, ...filteredPopular]
      .slice(0, maxResults)
      .map(s => ({
        text: s,
        isHistory: userHistory.includes(s)
      }));

    res.json({ 
      suggestions, 
      source: userHistory.length > 0 ? 'combined' : 'popular' 
    });
  } catch (error: any) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/autocomplete/record
 * Record a search query for autocomplete
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const { query, agent } = req.body;

    if (!query || !agent) {
      return res.status(400).json({ error: 'Query and agent are required' });
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Update popular searches cache
    await updatePopularSearches(normalizedQuery, agent);

    // Update user history in database if available
    if (databaseService.isConfigured()) {
      await recordSearchInDb(normalizedQuery, agent);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Record autocomplete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's search history
 */
async function getUserSearchHistory(agent: string, query: string, limit: number): Promise<string[]> {
  // Check cache first
  const cacheKey = `${USER_HISTORY_PREFIX}${agent}`;
  const cached = await cacheService.get<string[]>(cacheKey);
  
  if (cached) {
    return cached.filter(s => s.includes(query)).slice(0, limit);
  }

  // Try to get from database
  if (databaseService.isConfigured()) {
    try {
      const prisma = getPrisma();
      const activities = await prisma.activityLog.findMany({
        where: {
          agent: agent === 'all' ? undefined : agent,
          action: 'search'
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        distinct: ['details']
      });

      const searches = activities
        .map((a: any) => {
          if (a.metadata && typeof a.metadata === 'object' && 'query' in a.metadata) {
            return (a.metadata as any).query;
          }
          return a.details;
        })
        .filter(Boolean) as string[];

      // Cache for 5 minutes
      await cacheService.set(cacheKey, searches, { ttl: 300 });
      
      return searches.filter(s => s.includes(query)).slice(0, limit);
    } catch (error) {
      console.warn('Failed to get user history from DB:', error);
    }
  }

  return [];
}

/**
 * Get popular searches from cache
 */
async function getPopularSearches(agent: string, limit: number): Promise<string[]> {
  const cacheKey = `${POPULAR_SEARCHES_KEY}:${agent}`;
  const cached = await cacheService.get<Array<{ query: string; count: number }>>(cacheKey);

  if (cached) {
    return cached.sort((a, b) => b.count - a.count).map(s => s.query).slice(0, limit);
  }

  // Default popular searches per agent
  const defaults: Record<string, string[]> = {
    learning: ['TypeScript', 'React', 'System Design', 'AWS', 'Docker', 'Kubernetes'],
    problems: ['Two Sum', 'Array', 'Dynamic Programming', 'Binary Search', 'Tree'],
    jobs: ['Software Engineer', 'Frontend', 'Backend', 'Full Stack', 'Remote'],
    travel: ['Tel Aviv', 'Paris', 'London', 'New York', 'Barcelona'],
    all: ['React', 'TypeScript', 'Software Engineer', 'System Design', 'AWS']
  };

  return defaults[agent] || defaults['all'] || [];
}

/**
 * Update popular searches in cache
 */
async function updatePopularSearches(query: string, agent: string): Promise<void> {
  const cacheKey = `${POPULAR_SEARCHES_KEY}:${agent}`;
  const existing = await cacheService.get<Array<{ query: string; count: number }>>(cacheKey) || [];

  const idx = existing.findIndex(s => s.query === query);
  if (idx >= 0) {
    existing[idx].count++;
  } else {
    existing.push({ query, count: 1 });
  }

  // Keep top 100
  const sorted = existing.sort((a, b) => b.count - a.count).slice(0, 100);
  
  // Cache for 1 hour
  await cacheService.set(cacheKey, sorted, { ttl: 3600 });
}

/**
 * Record search in database
 */
async function recordSearchInDb(query: string, agent: string): Promise<void> {
  try {
    const prisma = getPrisma();
    const defaultUser = await databaseService.getDefaultUser();
    
    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
          agent,
          action: 'search',
          details: query,
          metadata: { query },
          status: 'success'
        }
      });
    }
  } catch (error) {
    console.warn('Failed to record search in DB:', error);
  }
}

export default router;



