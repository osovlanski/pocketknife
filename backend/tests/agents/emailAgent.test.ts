/**
 * Email Agent Tests
 * 
 * Tests for the Email Agent that handles Gmail processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  emailStats: {
    findUnique: vi.fn().mockResolvedValue({
      userId: 'user-123',
      totalProcessed: 100,
      totalClassified: 95
    })
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

describe('Email Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', async () => {
      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();
      
      expect(agent.metadata.id).toBe('email');
      expect(agent.metadata.name).toBe('Email Agent');
      expect(agent.metadata.icon).toBe('📧');
    });
  });

  describe('process action', () => {
    it('should handle process action (delegated to endpoint)', async () => {
      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'process',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-stats action', () => {
    it('should get email stats', async () => {
      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'get-stats',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeDefined();
    });

    it('should return null stats when user not found', async () => {
      mockPrisma.emailStats.findUnique.mockResolvedValue(null);

      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'get-stats',
        userId: 'unknown-user'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.emailStats.findUnique.mockRejectedValue(new Error('DB Error'));

      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'get-stats',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
    });

    it('should return null when no userId provided', async () => {
      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'get-stats'
      });

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeNull();
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const { EmailAgent } = await import('../../src/agents/EmailAgent');
      const agent = new EmailAgent();

      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

