/**
 * AssistantAgent Tests
 * 
 * Comprehensive tests for the AssistantAgent class that handles all AI chat operations
 * including conversation management, capabilities, and workflow orchestration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockAssistantService, mockAgentOrchestrator, mockCacheService } = vi.hoisted(() => ({
  mockAssistantService: {
    handleMessage: vi.fn()
  },
  mockAgentOrchestrator: {
    getAvailableAgents: vi.fn()
  },
  mockCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/assistant', () => ({
  assistantService: mockAssistantService,
  agentOrchestratorService: mockAgentOrchestrator
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: mockCacheService
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      const configs: Record<string, any> = {
        'assistant.agent.rateLimit': 30,
        'assistant.agent.timeoutMs': 120000,
        'assistant.conversation.maxHistory': 20,
        'assistant.cache.conversationTtlSeconds': 3600
      };
      return configs[key] ?? defaultValue;
    })
  }
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

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

// Static import after mocks
import { AssistantAgent } from '../../src/agents/AssistantAgent';

describe('AssistantAgent', () => {
  let agent: AssistantAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AssistantAgent();
    
    // Default mock implementations
    mockAssistantService.handleMessage.mockResolvedValue({
      message: 'Hello! How can I help you?',
      workflowResult: null,
      suggestions: ['Tell me more', 'What else?'],
      sources: ['AI Knowledge']
    });
    
    mockAgentOrchestrator.getAvailableAgents.mockReturnValue([
      { id: 'cooking', name: 'Cooking Agent', isAvailable: true },
      { id: 'jobs', name: 'Jobs Agent', isAvailable: true }
    ]);
    
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // METADATA
  // ===========================================================================

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(agent.metadata.id).toBe('assistant');
    });

    it('should have correct name', () => {
      expect(agent.metadata.name).toBe('Assistant');
    });

    it('should have correct icon', () => {
      expect(agent.metadata.icon).toBe('🤖');
    });

    it('should have correct color', () => {
      expect(agent.metadata.color).toBe('#6B7280');
    });

    it('should have a description', () => {
      expect(agent.metadata.description).toBeDefined();
      expect(agent.metadata.description.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // CHAT ACTION
  // ===========================================================================

  describe('chat action', () => {
    it('should require userId', async () => {
      const result = await agent.execute({
        action: 'chat',
        message: 'Hello'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require message', async () => {
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Message is required');
    });

    it('should process a chat message successfully', async () => {
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Find me a recipe'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('Hello! How can I help you?');
      expect(result.data?.conversationId).toBe('test-uuid-1234');
      expect(result.data?.suggestions).toEqual(['Tell me more', 'What else?']);
    });

    it('should use provided conversationId', async () => {
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Hello',
        conversationId: 'existing-conv-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.conversationId).toBe('existing-conv-123');
    });

    it('should use provided history', async () => {
      const history = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' }
      ];
      
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Follow up question',
        history
      });
      
      expect(result.success).toBe(true);
      expect(mockAssistantService.handleMessage).toHaveBeenCalledWith(
        'Follow up question',
        'user123',
        expect.arrayContaining([
          expect.objectContaining({ content: 'Previous message' }),
          expect.objectContaining({ content: 'Previous response' }),
          expect.objectContaining({ content: 'Follow up question' })
        ]),
        expect.any(Function)
      );
    });

    it('should cache conversation history', async () => {
      await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Hello'
      });
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('assistant:conversation:user123:'),
        expect.any(Array),
        expect.objectContaining({ ttl: 3600 })
      );
    });

    it('should handle workflow results', async () => {
      mockAssistantService.handleMessage.mockResolvedValue({
        message: 'Here are your recipes',
        workflowResult: {
          steps: [
            { id: '1', agentId: 'cooking', action: 'find-recipes', status: 'completed' }
          ]
        },
        sources: ['Cooking Agent']
      });
      
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Find recipes'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.workflowSteps).toHaveLength(1);
      expect(result.data?.workflowSteps?.[0].agentId).toBe('cooking');
    });

    it('should handle errors gracefully', async () => {
      mockAssistantService.handleMessage.mockRejectedValue(new Error('API Error'));
      
      const result = await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'Hello'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should load cached conversation history', async () => {
      const cachedHistory = [
        { id: '1', role: 'user', content: 'Old message', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Old response', timestamp: new Date() }
      ];
      mockCacheService.get.mockResolvedValue(cachedHistory);
      
      await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'New message',
        conversationId: 'existing-conv'
      });
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'assistant:conversation:user123:existing-conv'
      );
    });
  });

  // ===========================================================================
  // GET CAPABILITIES
  // ===========================================================================

  describe('get-capabilities action', () => {
    it('should return available agents', async () => {
      const result = await agent.execute({
        action: 'get-capabilities'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.capabilities).toHaveLength(2);
      expect(result.data?.capabilities?.[0].id).toBe('cooking');
    });

    it('should handle errors when getting capabilities', async () => {
      mockAgentOrchestrator.getAvailableAgents.mockImplementation(() => {
        throw new Error('Registry error');
      });
      
      const result = await agent.execute({
        action: 'get-capabilities'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registry error');
    });
  });

  // ===========================================================================
  // GET CONVERSATION
  // ===========================================================================

  describe('get-conversation action', () => {
    it('should require userId', async () => {
      const result = await agent.execute({
        action: 'get-conversation',
        conversationId: 'conv123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require conversationId', async () => {
      const result = await agent.execute({
        action: 'get-conversation',
        userId: 'user123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation ID is required');
    });

    it('should return cached messages', async () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() }
      ];
      mockCacheService.get.mockResolvedValue(messages);
      
      const result = await agent.execute({
        action: 'get-conversation',
        userId: 'user123',
        conversationId: 'conv123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.messages).toEqual(messages);
      expect(result.data?.conversationId).toBe('conv123');
    });

    it('should return empty array when no cached messages', async () => {
      mockCacheService.get.mockResolvedValue(null);
      
      const result = await agent.execute({
        action: 'get-conversation',
        userId: 'user123',
        conversationId: 'conv123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.messages).toEqual([]);
    });
  });

  // ===========================================================================
  // CLEAR CONVERSATION
  // ===========================================================================

  describe('clear-conversation action', () => {
    it('should require userId', async () => {
      const result = await agent.execute({
        action: 'clear-conversation',
        conversationId: 'conv123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should require conversationId', async () => {
      const result = await agent.execute({
        action: 'clear-conversation',
        userId: 'user123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation ID is required');
    });

    it('should delete cached conversation', async () => {
      const result = await agent.execute({
        action: 'clear-conversation',
        userId: 'user123',
        conversationId: 'conv123'
      });
      
      expect(result.success).toBe(true);
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'assistant:conversation:user123:conv123'
      );
    });
  });

  // ===========================================================================
  // UNKNOWN ACTION
  // ===========================================================================

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await agent.execute({
        action: 'unknown-action' as any,
        userId: 'user123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ===========================================================================
  // CONVERSATION HISTORY LIMITS
  // ===========================================================================

  describe('conversation history management', () => {
    it('should trim history to max length when saving', async () => {
      // Create history with 25 messages (more than max of 20)
      const longHistory = Array.from({ length: 25 }, (_, i) => ({
        id: String(i),
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));
      mockCacheService.get.mockResolvedValue(longHistory);
      
      await agent.execute({
        action: 'chat',
        userId: 'user123',
        message: 'New message',
        conversationId: 'existing-conv'
      });
      
      // Check that saved history is trimmed to max (20) + 2 (new user + assistant messages)
      // Actually, the code trims to maxHistory (20) after adding new messages
      expect(mockCacheService.set).toHaveBeenCalled();
      const setCall = mockCacheService.set.mock.calls[0];
      const savedHistory = setCall[1];
      expect(savedHistory.length).toBeLessThanOrEqual(20);
    });
  });
});
