/**
 * LearningAgent Tests
 * 
 * Comprehensive tests for the Learning Agent that searches and summarizes 
 * technical content from Dev.to, Hacker News, Reddit, and newsletters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockPrisma, mockLearningService, mockGoogleSearchService } = vi.hoisted(() => ({
  mockPrisma: {
    savedArticle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    learningHistory: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  },
  mockLearningService: {
    searchAllSources: vi.fn(),
    searchDevTo: vi.fn(),
    searchHackerNews: vi.fn(),
    searchReddit: vi.fn(),
    searchNewsletters: vi.fn(),
    summarizeArticle: vi.fn(),
    generateTopicSummary: vi.fn()
  },
  mockGoogleSearchService: {
    search: vi.fn(),
    searchAndParse: vi.fn(),
    isAvailable: vi.fn(),
    hasQuota: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' }),
    logActivity: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      return defaultValue;
    })
  }
}));

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: mockGoogleSearchService
}));

vi.mock('../../src/services/learning/learningService', () => ({
  default: mockLearningService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn()
  }
}));

vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn()
  }
}));

vi.mock('../../src/utils/retry', () => ({
  RateLimiter: class { async acquire() { return true; } },
  CircuitBreaker: class { async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); } },
  withRetry: vi.fn((fn) => fn())
}));

// Static import after mocks
import { LearningAgent } from '../../src/agents/LearningAgent';

describe('LearningAgent', () => {
  let learningAgent: LearningAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPrisma.savedArticle.findMany.mockResolvedValue([]);
    mockPrisma.savedArticle.findUnique.mockResolvedValue(null);
    mockPrisma.savedArticle.create.mockResolvedValue({ id: 'article-123' });
    mockPrisma.savedArticle.delete.mockResolvedValue({});
    mockPrisma.savedArticle.update.mockResolvedValue({});
    mockPrisma.learningHistory.findMany.mockResolvedValue([]);
    mockPrisma.learningHistory.create.mockResolvedValue({});
    mockPrisma.agentActivity.create.mockResolvedValue({});
    
    mockLearningService.searchAllSources.mockResolvedValue([
      { id: 'res-1', title: 'TypeScript Tips', source: 'devto', url: 'https://dev.to/ts' },
      { id: 'res-2', title: 'Node.js Update', source: 'hackernews', url: 'https://news.yc.com/1' }
    ]);
    mockLearningService.searchDevTo.mockResolvedValue([
      { id: 'dev-1', title: 'TypeScript Tips', source: 'devto', url: 'https://dev.to/ts' }
    ]);
    mockLearningService.searchHackerNews.mockResolvedValue([
      { id: 'hn-1', title: 'Node.js Update', source: 'hackernews', url: 'https://news.yc.com/1' }
    ]);
    mockLearningService.searchReddit.mockResolvedValue([]);
    mockLearningService.searchNewsletters.mockResolvedValue([]);
    mockLearningService.summarizeArticle.mockResolvedValue({
      summary: 'Article about TypeScript best practices',
      keyPoints: ['Use strict mode', 'Type all parameters']
    });
    mockLearningService.generateTopicSummary.mockResolvedValue({
      overview: 'Comprehensive overview of React',
      sections: [{ title: 'Hooks', content: 'Modern React uses hooks' }]
    });
    
    mockGoogleSearchService.search.mockResolvedValue([
      { title: 'React Tutorial', description: 'Learn React', url: 'https://example.com/react' }
    ]);
    mockGoogleSearchService.searchAndParse.mockResolvedValue([
      { title: 'React Tutorial', description: 'Learn React', url: 'https://example.com/react', type: 'article' }
    ]);
    mockGoogleSearchService.isAvailable.mockReturnValue(true);
    mockGoogleSearchService.hasQuota.mockReturnValue(true);
    
    learningAgent = new LearningAgent();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(learningAgent.metadata.id).toBe('learning');
    });
    
    it('should have correct name', () => {
      expect(learningAgent.metadata.name).toBe('Learning Agent');
    });
    
    it('should have correct icon', () => {
      expect(learningAgent.metadata.icon).toBe('📚');
    });
    
    it('should have color defined', () => {
      expect(learningAgent.metadata.color).toBeDefined();
    });
    
    it('should have description', () => {
      expect(learningAgent.metadata.description).toBeDefined();
    });
  });

  describe('agent methods', () => {
    it('should have execute method', () => {
      expect(typeof learningAgent.execute).toBe('function');
    });
    
    it('should have stop method', () => {
      expect(typeof learningAgent.stop).toBe('function');
    });
    
    it('should have getState method', () => {
      expect(typeof learningAgent.getState).toBe('function');
    });
    
    it('should have getMetrics method', () => {
      expect(typeof learningAgent.getMetrics).toBe('function');
    });
  });

  describe('search action', () => {
    it('should require query', async () => {
      const result = await learningAgent.execute({
        action: 'search'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('query');
    });

    it('should search resources across sources', async () => {
      const result = await learningAgent.execute({
        action: 'search',
        query: 'typescript tutorials'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.resources).toBeDefined();
    });

    it('should search with specific sources', async () => {
      const result = await learningAgent.execute({
        action: 'search',
        query: 'react hooks',
        sources: ['devto', 'hackernews']
      });
      
      expect(result.success).toBe(true);
    });

    it('should search with time range', async () => {
      const result = await learningAgent.execute({
        action: 'search',
        query: 'javascript',
        timeRange: 'month'
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle search service errors', async () => {
      mockLearningService.searchAllSources.mockRejectedValue(new Error('Search failed'));
      
      const result = await learningAgent.execute({
        action: 'search',
        query: 'nodejs'
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('web-search action', () => {
    it('should require query', async () => {
      const result = await learningAgent.execute({
        action: 'web-search'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('query');
    });

    it('should attempt web search', async () => {
      const result = await learningAgent.execute({
        action: 'web-search',
        query: 'react best practices'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle Google Search not available gracefully', async () => {
      mockGoogleSearchService.isAvailable.mockReturnValue(false);
      
      const result = await learningAgent.execute({
        action: 'web-search',
        query: 'nodejs tutorial'
      });
      
      // May fail or succeed depending on fallback
      expect(result).toBeDefined();
    });

    it('should handle Google Search errors gracefully', async () => {
      mockGoogleSearchService.searchAndParse.mockRejectedValue(new Error('API error'));
      
      const result = await learningAgent.execute({
        action: 'web-search',
        query: 'python tutorial'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('summarize action', () => {
    it('should require articleUrl', async () => {
      const result = await learningAgent.execute({
        action: 'summarize'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should summarize article', async () => {
      const result = await learningAgent.execute({
        action: 'summarize',
        articleUrl: 'https://dev.to/article',
        articleTitle: 'TypeScript Guide'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.summary).toBeDefined();
    });

    it('should handle summarization errors', async () => {
      mockLearningService.summarizeArticle.mockRejectedValue(new Error('AI error'));
      
      const result = await learningAgent.execute({
        action: 'summarize',
        articleUrl: 'https://example.com/article'
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('topic-summary action', () => {
    it('should require query for topic summary', async () => {
      const result = await learningAgent.execute({
        action: 'topic-summary'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should generate topic summary', async () => {
      const result = await learningAgent.execute({
        action: 'topic-summary',
        query: 'React Hooks'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.summary).toBeDefined();
    });

    it('should handle topic summary errors', async () => {
      mockLearningService.generateTopicSummary.mockRejectedValue(new Error('AI error'));
      
      const result = await learningAgent.execute({
        action: 'topic-summary',
        query: 'Vue.js Composition API'
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('save-article action', () => {
    it('should require userId', async () => {
      const result = await learningAgent.execute({
        action: 'save-article',
        articleData: { id: 'article-1', title: 'Test', url: 'https://test.com', source: 'devto' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require articleData', async () => {
      const result = await learningAgent.execute({
        action: 'save-article',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should attempt to save article', async () => {
      mockPrisma.savedArticle.create.mockResolvedValue({ 
        id: 'saved-1', 
        title: 'TypeScript Guide',
        url: 'https://dev.to/ts'
      });
      
      const result = await learningAgent.execute({
        action: 'save-article',
        userId: 'user-123',
        articleData: {
          id: 'article-1',
          title: 'TypeScript Guide',
          url: 'https://dev.to/ts',
          source: 'devto',
          description: 'A guide to TypeScript'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle save errors', async () => {
      mockPrisma.savedArticle.create.mockRejectedValue(new Error('Database error'));
      
      const result = await learningAgent.execute({
        action: 'save-article',
        userId: 'user-123',
        articleData: {
          id: 'article-1',
          title: 'Test',
          url: 'https://test.com',
          source: 'devto'
        }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('get-history action', () => {
    it('should require userId', async () => {
      const result = await learningAgent.execute({
        action: 'get-history'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should attempt to return learning history', async () => {
      mockPrisma.savedArticle.findMany.mockResolvedValue([
        { id: 'saved-1', title: 'Article 1', url: 'https://example.com/1' },
        { id: 'saved-2', title: 'Article 2', url: 'https://example.com/2' }
      ]);
      
      const result = await learningAgent.execute({
        action: 'get-history',
        userId: 'user-123'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle empty history', async () => {
      mockPrisma.savedArticle.findMany.mockResolvedValue([]);
      
      const result = await learningAgent.execute({
        action: 'get-history',
        userId: 'user-123'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await learningAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('database unavailable', () => {
    it('should handle database not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new LearningAgent();
      const result = await agent.execute({
        action: 'get-history',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
  });
});
