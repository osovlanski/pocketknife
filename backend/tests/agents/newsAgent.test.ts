/**
 * News Agent Tests
 * 
 * Tests for the News Agent that handles news aggregation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available before vi.mock factories run
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    savedArticle: {
      create: vi.fn().mockResolvedValue({ id: 'article-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({})
    },
    newsPreferences: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null)
    },
    // Used by getPreferences (singular)
    newsPreference: {
      findUnique: vi.fn().mockResolvedValue({
        preferredTopics: ['technology'],
        topicWeights: {},
        excludedSources: []
      })
    },
    articleInteraction: {
      create: vi.fn().mockResolvedValue({})
    },
    agentActivity: {
      create: vi.fn().mockResolvedValue({})
    }
  }
}));

// Mock telemetryService to prevent actual telemetry calls
vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    recordRateLimitHit: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn(),
    recordEvent: vi.fn(),
    recordGauge: vi.fn(),
    recordHistogram: vi.fn(),
    recordCounter: vi.fn(),
    init: vi.fn(),
    shutdown: vi.fn(),
  },
}));

// Mock logger to prevent actual console output during tests
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    api: vi.fn(),
    found: vi.fn(),
    init: vi.fn(),
    start: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn(),
    skip: vi.fn(),
    timed: vi.fn(() => ({ end: vi.fn() })),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fail: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      agent: vi.fn(),
    })),
    ICONS: {},
  },
}));

// Mock retry utilities to prevent actual delays
vi.mock('../../src/utils/retry', () => {
  class MockRateLimiter {
    async acquire(): Promise<boolean> { return true; }
    async waitForToken(): Promise<void> { return; }
    getAvailableTokens(): number { return 60; }
  }
  
  class MockCircuitBreaker {
    async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
    getState(): string { return 'closed'; }
    reset(): void {}
  }

  return {
    withRetry: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    RateLimiter: MockRateLimiter,
    CircuitBreaker: MockCircuitBreaker,
    isDefaultRetryable: () => false
  };
});

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: (key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      if (key.includes('rateLimit')) return defaultValue || 30;
      return defaultValue ?? 10;
    }
  }
}));

vi.mock('../../src/services/news', () => ({
  newsService: {
    // Method names matching actual newsService implementation
    searchNews: async () => [
      {
        id: 'article-1',
        title: 'Tech News',
        description: 'Latest tech updates',
        url: 'https://news.example.com/1',
        source: 'TechCrunch'
      }
    ],
    getUserPreferences: async () => ({
      preferredTopics: ['technology'],
      topicWeights: {},
      excludedSources: []
    }),
    generateDigest: async () => ({ articles: [], summary: 'Daily digest' }),
    saveArticle: async () => ({ id: 'article-1' }),
    recordInteraction: async () => ({}),
    getSavedArticles: async () => [],
    getTrendingTopics: async () => [
      { topic: 'AI', count: 100 }
    ],
    updateUserPreferences: async () => ({}),
    generateSummary: async () => 'Summary of the article'
  },
  // Export type stubs (these are stripped by TypeScript at runtime)
  NewsArticle: {},
  NewsSearchParams: {},
  NewsTrend: {}
}));

// Static import after mocks are set up
import { NewsAgent } from '../../src/agents/NewsAgent';

describe('News Agent', () => {
  let agent: NewsAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new NewsAgent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.metadata.id).toBe('news');
      expect(agent.metadata.name).toBe('News Agent');
      expect(agent.metadata.icon).toBe('📰');
    });
  });

  describe('search action', () => {
    it('should search for news articles', async () => {
      const result = await agent.execute({
        action: 'search',
        query: 'artificial intelligence'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-feed action', () => {
    it('should get news feed', async () => {
      const result = await agent.execute({
        action: 'get-feed',
        userId: 'user-123',
        topics: ['technology', 'science']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('save-article action', () => {
    it('should save an article', async () => {
      const result = await agent.execute({
        action: 'save-article',
        userId: 'user-123',
        article: {
          id: 'article-1',
          title: 'Test Article',
          description: 'Description',
          url: 'https://example.com',
          source: 'Test'
        }
      });

      expect(result.success).toBe(true);
    });

    it('should fail without userId', async () => {
      const result = await agent.execute({
        action: 'save-article',
        article: { title: 'Test' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('get-saved action', () => {
    it('should get saved articles', async () => {
      mockPrisma.savedArticle.findMany.mockResolvedValue([
        { id: 'article-1', title: 'Saved Article' }
      ]);

      const result = await agent.execute({
        action: 'get-saved',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-trends action', () => {
    it('should get trending topics', async () => {
      const result = await agent.execute({
        action: 'get-trends',
        geoScope: 'global'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('record-interaction action', () => {
    it('should record article interaction', async () => {
      const result = await agent.execute({
        action: 'record-interaction',
        userId: 'user-123',
        articleId: 'article-1',
        interactionType: 'view'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('update-preferences action', () => {
    it('should update news preferences', async () => {
      const result = await agent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: {
          topicWeights: { technology: 1.5, science: 1.2 }
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-preferences action', () => {
    it('should get user preferences', async () => {
      const result = await agent.execute({
        action: 'get-preferences',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('summarize action', () => {
    it('should summarize an article', async () => {
      const result = await agent.execute({
        action: 'summarize',
        articleUrl: 'https://example.com/article'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
