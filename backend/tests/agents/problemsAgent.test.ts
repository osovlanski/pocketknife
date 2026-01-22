/**
 * Problems Agent Tests
 * 
 * Tests for the Problems Agent that handles coding problems.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available when vi.mock runs
const { mockPrisma, mockGetPrisma, mockGoogleSearch } = vi.hoisted(() => {
  const prisma = {
    solvedProblem: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    userPreferences: {
      upsert: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  };

  const googleSearch = {
    search: vi.fn(),
    searchAndParse: vi.fn(),
    isAvailable: () => true,  // Use plain function, not vi.fn mock
    hasQuota: () => true,
    getQuotaStatus: () => ({ remaining: 100, limit: 100 })
  };

  return {
    mockPrisma: prisma,
    mockGetPrisma: vi.fn(() => prisma),
    mockGoogleSearch: googleSearch
  };
});

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: mockGetPrisma,
  databaseService: {
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

// Mock retry utilities to prevent async waits
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

// Mock telemetry to prevent actual telemetry calls
vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    recordRateLimitHit: vi.fn(),
    recordRetry: vi.fn(),
    recordCircuitBreakerTrip: vi.fn(),
    setAgentState: vi.fn()
  }
}));

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: mockGoogleSearch
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
      // Return sensible defaults for timeout-related config
      if (key.includes('timeout') || key.includes('Timeout')) {
        return defaultValue || 5000;
      }
      return defaultValue ?? 10;
    })
  }
}));

// Mock logger to prevent console noise
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    agent: vi.fn(),
    start: vi.fn(),
    api: vi.fn(),
    db: vi.fn()
  }
}));

// Import agent AFTER mocks are set up
import { ProblemsAgent } from '../../src/agents/ProblemsAgent';

describe('Problems Agent', () => {
  let agent: ProblemsAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ProblemsAgent();
    
    // Set up default mock implementations
    mockPrisma.solvedProblem.create.mockResolvedValue({ id: 'problem-1', title: 'Two Sum' });
    mockPrisma.solvedProblem.findMany.mockResolvedValue([]);
    mockPrisma.solvedProblem.update.mockResolvedValue({});
    mockPrisma.solvedProblem.upsert.mockResolvedValue({ id: 'problem-1', title: 'Two Sum', source: 'LeetCode' });
    mockPrisma.userPreferences.upsert.mockResolvedValue({ preferredLanguage: 'JavaScript' });
    mockPrisma.agentActivity.create.mockResolvedValue({});
    
    mockGoogleSearch.search.mockResolvedValue([
      {
        title: 'Two Sum - LeetCode',
        link: 'https://leetcode.com/problems/two-sum/',
        snippet: 'Given an array of integers...'
      }
    ]);
    mockGoogleSearch.searchAndParse.mockResolvedValue([
      {
        title: 'Two Sum - LeetCode Solution',
        description: 'Given an array of integers...',
        url: 'https://leetcode.com/problems/two-sum/',
        source: 'LeetCode',
        metadata: { language: 'JavaScript', concepts: ['Arrays', 'Hash Maps'] }
      }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.metadata.id).toBe('problems');
      expect(agent.metadata.name).toBe('Problems Agent');
      expect(agent.metadata.icon).toBe('💻');
    });
  });

  describe('save-solution action', () => {
    it('should save a solution successfully', async () => {
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
      const result = await agent.execute({
        action: 'save-solution',
        problemData: { title: 'Test' },
        code: 'code'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should fail without problem data', async () => {
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

      const result = await agent.execute({
        action: 'get-solved',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.solvedProblems).toBeDefined();
    });

    it('should filter by difficulty', async () => {
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
      const result = await agent.execute({
        action: 'search-solutions',
        query: 'two sum solution'
      });

      expect(result.success).toBe(true);
      expect(result.data?.solutionResults).toBeDefined();
    });

    it('should fail without query', async () => {
      const result = await agent.execute({
        action: 'search-solutions'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search query is required');
    });
  });

  describe('update-preferences action', () => {
    it('should update user preferences', async () => {
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
      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
