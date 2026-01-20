/**
 * News Agent Tests
 * 
 * Tests for the News Agent that handles news aggregation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  savedArticle: {
    create: vi.fn().mockResolvedValue({ id: 'article-1' }),
    findMany: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue({})
  },
  newsPreferences: {
    upsert: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null)
  },
  articleInteraction: {
    create: vi.fn().mockResolvedValue({})
  },
  agentActivity: {
    create: vi.fn().mockResolvedValue({})
  }
};

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn().mockReturnValue(mockPrisma),
  databaseService: {
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockReturnValue(10)
  }
}));

vi.mock('../../src/services/news', () => ({
  newsService: {
    search: vi.fn().mockResolvedValue([
      {
        id: 'article-1',
        title: 'Tech News',
        description: 'Latest tech updates',
        url: 'https://news.example.com/1',
        source: 'TechCrunch'
      }
    ]),
    getTrends: vi.fn().mockResolvedValue([
      { topic: 'AI', count: 100 }
    ]),
    summarize: vi.fn().mockResolvedValue('Summary of the article')
  }
}));

describe('News Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();
      
      expect(agent.metadata.id).toBe('news');
      expect(agent.metadata.name).toBe('News Agent');
      expect(agent.metadata.icon).toBe('📰');
    });
  });

  describe('search action', () => {
    it('should search for news articles', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'search',
        query: 'artificial intelligence'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-feed action', () => {
    it('should get news feed', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

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
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

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
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

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

      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'get-saved',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-trends action', () => {
    it('should get trending topics', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'get-trends',
        geoScope: 'global'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('record-interaction action', () => {
    it('should record article interaction', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

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
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

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
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'get-preferences',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('summarize action', () => {
    it('should summarize an article', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'summarize',
        articleUrl: 'https://example.com/article'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const { NewsAgent } = await import('../../src/agents/NewsAgent');
      const agent = new NewsAgent();

      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

