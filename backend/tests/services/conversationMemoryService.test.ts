/**
 * Conversation Memory Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn()
}));

// Mock cache service
vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock Anthropic client
vi.mock('../../src/utils/anthropicClient', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

// Mock config service
vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue)
  }
}));

describe('ConversationMemoryService', () => {
  let conversationMemoryService: typeof import('../../src/services/assistant/conversationMemoryService').conversationMemoryService;
  let mockPrisma: any;
  let mockCacheService: any;
  let mockAnthropicClient: any;

  beforeEach(async () => {
    vi.resetModules();

    mockPrisma = {
      conversationMemory: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn()
      }
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    };

    mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };

    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);

    const cacheModule = await import('../../src/services/core/cacheService');
    Object.assign(cacheModule.cacheService, mockCacheService);

    const { getAnthropicClient } = await import('../../src/utils/anthropicClient');
    (getAnthropicClient as any).mockReturnValue(mockAnthropicClient);

    const module = await import('../../src/services/assistant/conversationMemoryService');
    conversationMemoryService = module.conversationMemoryService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentMemories', () => {
    it('should return cached memories if available', async () => {
      const cachedMemories = [
        {
          id: '1',
          userId: 'user-1',
          conversationId: 'conv-1',
          summary: 'Test conversation',
          entities: { topics: ['test'] },
          messageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockCacheService.get.mockResolvedValueOnce(cachedMemories);

      const result = await conversationMemoryService.getRecentMemories('user-1');

      expect(result).toEqual(cachedMemories);
      expect(mockCacheService.get).toHaveBeenCalledWith('memory:recent:user-1');
      expect(mockPrisma.conversationMemory.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);

      const dbMemories = [
        {
          id: '1',
          userId: 'user-1',
          conversationId: 'conv-1',
          summary: 'Test conversation',
          entities: JSON.stringify({ topics: ['test'] }),
          messageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.conversationMemory.findMany.mockResolvedValueOnce(dbMemories);

      const result = await conversationMemoryService.getRecentMemories('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe('Test conversation');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return empty array if database is not available', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);

      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValueOnce(null);

      const result = await conversationMemoryService.getRecentMemories('user-1');

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockPrisma.conversationMemory.findMany.mockResolvedValueOnce([]);

      await conversationMemoryService.getRecentMemories('user-1', 10);

      expect(mockPrisma.conversationMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10
        })
      );
    });
  });

  describe('getMemoryContext', () => {
    it('should return formatted context string', async () => {
      mockCacheService.get.mockResolvedValueOnce([
        {
          id: '1',
          userId: 'user-1',
          conversationId: 'conv-1',
          summary: 'User asked about recipes',
          entities: {
            preferences: [{ category: 'food', preference: 'vegetarian' }],
            actionItems: [{ task: 'Find pasta recipe', status: 'pending' }],
            topics: ['cooking']
          },
          messageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const result = await conversationMemoryService.getMemoryContext('user-1');

      expect(result).toContain('Previous Conversations Context');
      expect(result).toContain('User asked about recipes');
      expect(result).toContain('vegetarian');
      expect(result).toContain('Find pasta recipe');
    });

    it('should return empty string if no memories', async () => {
      mockCacheService.get.mockResolvedValueOnce([]);

      const result = await conversationMemoryService.getMemoryContext('user-1');

      expect(result).toBe('');
    });
  });

  describe('storeMemory', () => {
    it('should store conversation memory with AI summary', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: 'User discussed cooking recipes',
            entities: {
              people: [],
              places: [],
              dates: [],
              preferences: [{ category: 'food', preference: 'Italian cuisine' }],
              actionItems: [],
              topics: ['cooking', 'recipes'],
              custom: {}
            }
          })
        }]
      });

      const messages = [
        { role: 'user' as const, content: 'I want to cook pasta', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Here are some pasta recipes...', timestamp: new Date() }
      ];

      await conversationMemoryService.storeMemory('user-1', 'conv-1', messages);

      expect(mockPrisma.conversationMemory.upsert).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalledWith('memory:recent:user-1');
    });

    it('should not store if less than 2 messages', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello', timestamp: new Date() }
      ];

      await conversationMemoryService.storeMemory('user-1', 'conv-1', messages);

      expect(mockPrisma.conversationMemory.upsert).not.toHaveBeenCalled();
    });

    it('should handle AI summary failure gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValueOnce(new Error('API Error'));

      const messages = [
        { role: 'user' as const, content: 'Test message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Response', timestamp: new Date() }
      ];

      // Should not throw
      await conversationMemoryService.storeMemory('user-1', 'conv-1', messages);

      // Should still try to store with fallback summary
      expect(mockPrisma.conversationMemory.upsert).toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should return deduplicated preferences', async () => {
      mockCacheService.get.mockResolvedValueOnce([
        {
          id: '1',
          entities: {
            preferences: [
              { category: 'food', preference: 'vegetarian' },
              { category: 'travel', preference: 'budget' }
            ]
          }
        },
        {
          id: '2',
          entities: {
            preferences: [
              { category: 'food', preference: 'vegan' } // Should override vegetarian
            ]
          }
        }
      ]);

      const result = await conversationMemoryService.getUserPreferences('user-1');

      // Should have deduplicated by category, keeping most recent
      expect(result).toContainEqual({ category: 'food', preference: 'vegan' });
      expect(result).toContainEqual({ category: 'travel', preference: 'budget' });
    });
  });

  describe('getPendingActionItems', () => {
    it('should return only pending action items', async () => {
      mockCacheService.get.mockResolvedValueOnce([
        {
          id: '1',
          conversationId: 'conv-1',
          entities: {
            actionItems: [
              { task: 'Buy groceries', status: 'pending' },
              { task: 'Call mom', status: 'completed' }
            ]
          }
        }
      ]);

      const result = await conversationMemoryService.getPendingActionItems('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'Buy groceries',
        conversationId: 'conv-1'
      });
    });
  });

  describe('cleanupOldMemories', () => {
    it('should delete memories older than specified age', async () => {
      mockPrisma.conversationMemory.deleteMany.mockResolvedValueOnce({ count: 5 });

      const result = await conversationMemoryService.cleanupOldMemories('user-1', 30 * 24 * 60 * 60 * 1000);

      expect(result).toBe(5);
      expect(mockPrisma.conversationMemory.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            updatedAt: expect.any(Object)
          })
        })
      );
    });

    it('should return 0 if database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValueOnce(null);

      const result = await conversationMemoryService.cleanupOldMemories('user-1');

      expect(result).toBe(0);
    });
  });
});
