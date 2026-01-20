/**
 * AbstractAgent Tests
 * 
 * Tests for the base agent class features:
 * - Rate limiting
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Metrics/telemetry
 * - Input validation
 * - Circuit breaker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    isConfigured: () => false,
    getDefaultUser: () => null,
    logActivity: vi.fn()
  },
  getPrisma: () => null
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    agent: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('AbstractAgent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('AgentConfig', () => {
    it('should use default config values when no config provided', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      // Create a concrete implementation
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test agent for testing',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      
      // Check default config via rate limit status
      const rateLimitStatus = agent.getRateLimitStatus();
      expect(rateLimitStatus.limit).toBe(60); // Default rate limit
    });

    it('should accept custom config overrides', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test agent for testing',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent({
        rateLimit: 30,
        defaultTimeoutMs: 5000,
        circuitBreakerThreshold: 3
      });
      
      const rateLimitStatus = agent.getRateLimitStatus();
      expect(rateLimitStatus.limit).toBe(30);
    });
  });

  describe('Rate Limiting', () => {
    it('should return rate limit status', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent({ rateLimit: 10 });
      const status = agent.getRateLimitStatus();
      
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('limit');
      expect(status.limit).toBe(10);
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in closed state', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      expect(agent.getCircuitBreakerState()).toBe('closed');
    });

    it('should reset circuit breaker', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      agent.resetCircuitBreaker();
      expect(agent.getCircuitBreakerState()).toBe('closed');
    });
  });

  describe('Metrics', () => {
    it('should initialize with zero metrics', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      const metrics = agent.getMetrics();
      
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.rateLimitHits).toBe(0);
      expect(metrics.retryCount).toBe(0);
      expect(metrics.circuitBreakerTrips).toBe(0);
    });

    it('should reset metrics', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      agent.resetMetrics();
      
      const metrics = agent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate params against registered schema', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected validationSchemas = {
          'test-action': z.object({
            action: z.literal('test-action'),
            userId: z.string().min(1, 'User ID is required'),
            data: z.string()
          })
        };
        
        protected async run(params: any) {
          return { success: true, data: params };
        }
      }
      
      const agent = new TestAgent();
      
      // Test invalid params
      const result = await agent.execute({ action: 'test-action', userId: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should pass validation when no schema registered', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      
      // No schema registered, should pass
      vi.useRealTimers();
      const result = await agent.execute({ action: 'unknown-action' });
      expect(result.success).toBe(true);
    });
  });

  describe('Agent State', () => {
    it('should start in idle state', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      const state = agent.getState();
      
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
    });

    it('should report not running when idle', async () => {
      const { AbstractAgent } = await import('../../src/agents/AbstractAgent');
      
      class TestAgent extends AbstractAgent {
        readonly metadata = {
          id: 'test' as const,
          name: 'Test Agent',
          description: 'Test',
          icon: '🧪',
          color: '#FF0000'
        };
        
        protected async run() {
          return { success: true };
        }
      }
      
      const agent = new TestAgent();
      expect(agent.isRunning()).toBe(false);
    });
  });
});



