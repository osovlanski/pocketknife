/**
 * Email Agent Tests
 * 
 * Tests for the Email Agent that handles Gmail processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available when vi.mock runs
const { mockPrisma, mockGetPrisma } = vi.hoisted(() => {
  const prisma = {
    emailStats: {
      findUnique: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  };

  return {
    mockPrisma: prisma,
    mockGetPrisma: vi.fn(() => prisma)
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
import { EmailAgent } from '../../src/agents/EmailAgent';

describe('Email Agent', () => {
  let agent: EmailAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new EmailAgent();
    
    // Set up default mock implementations
    mockPrisma.emailStats.findUnique.mockResolvedValue({
      userId: 'user-123',
      totalProcessed: 100,
      totalClassified: 95
    });
    mockPrisma.agentActivity.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.metadata.id).toBe('email');
      expect(agent.metadata.name).toBe('Email Agent');
      expect(agent.metadata.icon).toBe('📧');
    });
  });

  describe('process action', () => {
    it('should handle process action (delegated to endpoint)', async () => {
      const result = await agent.execute({
        action: 'process',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-stats action', () => {
    it('should get email stats', async () => {
      const result = await agent.execute({
        action: 'get-stats',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeDefined();
    });

    it('should return null stats when user not found', async () => {
      mockPrisma.emailStats.findUnique.mockResolvedValue(null);

      const result = await agent.execute({
        action: 'get-stats',
        userId: 'unknown-user'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeNull();
    });

    it('should handle database errors', async () => {
      // Configure mock to reject
      mockPrisma.emailStats.findUnique.mockRejectedValueOnce(new Error('DB Error'));

      const result = await agent.execute({
        action: 'get-stats',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
    });

    it('should return null when no userId provided', async () => {
      const result = await agent.execute({
        action: 'get-stats'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeNull();
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
