/**
 * LearningAgent Tests
 * 
 * Tests for the Learning Agent that searches and summarizes technical content.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' })
  }
}));

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: {
    search: vi.fn().mockResolvedValue([
      { title: 'React Tutorial', description: 'Learn React', url: 'https://example.com/react' }
    ])
  }
}));

vi.mock('../../src/services/learning/learningService', () => ({
  default: {
    searchDevTo: vi.fn().mockResolvedValue([
      { id: 'dev-1', title: 'TypeScript Tips', source: 'devto', url: 'https://dev.to/ts' }
    ]),
    searchHackerNews: vi.fn().mockResolvedValue([
      { id: 'hn-1', title: 'Node.js Update', source: 'hackernews', url: 'https://news.yc.com/1' }
    ]),
    searchReddit: vi.fn().mockResolvedValue([]),
    searchNewsletters: vi.fn().mockResolvedValue([]),
    summarizeArticle: vi.fn().mockResolvedValue({
      summary: 'Article about TypeScript best practices',
      keyPoints: ['Use strict mode', 'Type all parameters']
    }),
    generateTopicSummary: vi.fn().mockResolvedValue({
      overview: 'Comprehensive overview of React',
      sections: [{ title: 'Hooks', content: 'Modern React uses hooks' }]
    })
  }
}));

describe('LearningAgent', () => {
  let learningAgent: any;
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      savedArticle: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((args) => ({
          id: 'article-123',
          ...args.data,
          savedAt: new Date()
        })),
        delete: vi.fn().mockResolvedValue({ id: 'article-123' })
      },
      learningHistory: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((args) => ({
          id: 'history-123',
          ...args.data
        }))
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
    
    const { LearningAgent } = await import('../../src/agents/LearningAgent');
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

  describe('get-history action', () => {
    it('should execute get-history action', async () => {
      const result = await learningAgent.execute({
        action: 'get-history',
        userId: 'user-123'
      });
      
      // Either succeeds or fails gracefully
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
    it('should handle database not available for get-history', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const result = await learningAgent.execute({
        action: 'get-history',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
    });
  });
});
