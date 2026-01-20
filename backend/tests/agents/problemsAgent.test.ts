/**
 * Problems Agent Tests
 * 
 * Tests for the Problems Agent that handles coding problems.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  solvedProblem: {
    create: vi.fn().mockResolvedValue({ id: 'problem-1', title: 'Two Sum' }),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({})
  },
  userPreferences: {
    upsert: vi.fn().mockResolvedValue({ preferredLanguage: 'JavaScript' })
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

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: {
    search: vi.fn().mockResolvedValue([
      {
        title: 'Two Sum - LeetCode',
        link: 'https://leetcode.com/problems/two-sum/',
        snippet: 'Given an array of integers...'
      }
    ])
  }
}));

describe('Problems Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();
      
      expect(agent.metadata.id).toBe('problems');
      expect(agent.metadata.name).toBe('Problems Agent');
      expect(agent.metadata.icon).toBe('💻');
    });
  });

  describe('save-solution action', () => {
    it('should save a solution successfully', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'save-solution',
        userId: 'user-123',
        problemData: {
          title: 'Two Sum',
          difficulty: 'Easy',
          source: 'LeetCode'
        },
        code: 'function twoSum(nums, target) { ... }',
        language: 'JavaScript'
      });

      expect(result.success).toBe(true);
    });

    it('should fail without userId', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'save-solution',
        problemData: { title: 'Test' },
        code: 'code'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should fail without problem data', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'save-solution',
        userId: 'user-123',
        code: 'code'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Problem data and code are required');
    });
  });

  describe('get-solved action', () => {
    it('should get solved problems', async () => {
      mockPrisma.solvedProblem.findMany.mockResolvedValue([
        { id: 'p1', title: 'Two Sum', difficulty: 'Easy' },
        { id: 'p2', title: 'Add Two Numbers', difficulty: 'Medium' }
      ]);

      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'get-solved',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.solvedProblems).toBeDefined();
    });

    it('should filter by difficulty', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      await agent.execute({
        action: 'get-solved',
        userId: 'user-123',
        difficulty: 'Easy'
      });

      expect(mockPrisma.solvedProblem.findMany).toHaveBeenCalled();
    });
  });

  describe('search-solutions action', () => {
    it('should search for solutions', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'search-solutions',
        query: 'two sum solution'
      });

      expect(result.success).toBe(true);
      expect(result.data?.solutionResults).toBeDefined();
    });

    it('should fail without query', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'search-solutions'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search query is required');
    });
  });

  describe('update-preferences action', () => {
    it('should update user preferences', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: {
          preferredLanguage: 'Python',
          preferredDifficulty: 'Medium'
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const { ProblemsAgent } = await import('../../src/agents/ProblemsAgent');
      const agent = new ProblemsAgent();

      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

