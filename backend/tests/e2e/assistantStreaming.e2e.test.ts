/**
 * Enhanced Assistant Streaming E2E Tests
 *
 * End-to-end tests for the streaming workflow including:
 * - Token streaming callbacks
 * - Tool call execution flow
 * - Plan execution
 * - Input validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/anthropicClient', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn()
    }
  })),
  streamWithToolLoop: vi.fn(),
  analyzeImage: vi.fn(),
  extractText: vi.fn((content: any[]) => {
    if (!content || content.length === 0) return '';
    const textBlock = content.find((b: any) => b.type === 'text');
    return textBlock?.text || '';
  })
}));

vi.mock('../../src/services/assistant/toolCallingService', () => ({
  createAgentTools: vi.fn(() => []),
  executeTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  executeToolsParallel: vi.fn().mockResolvedValue(new Map())
}));

vi.mock('../../src/services/assistant/conversationMemoryService', () => ({
  conversationMemoryService: {
    getMemoryContext: vi.fn().mockResolvedValue(''),
    storeMemory: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue)
  }
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

describe('Assistant Streaming E2E', () => {
  let enhancedAssistantService: typeof import('../../src/services/assistant/enhancedAssistantService').enhancedAssistantService;

  beforeEach(async () => {
    vi.resetModules();

    // Import service
    const module = await import('../../src/services/assistant/enhancedAssistantService');
    enhancedAssistantService = module.enhancedAssistantService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Streaming chat flow', () => {
    it('should call streaming callbacks in correct order', async () => {
      const { streamWithToolLoop } = await import('../../src/utils/anthropicClient');

      // Mock streaming response
      (streamWithToolLoop as any).mockImplementation(
        async (
          _messages: any,
          _tools: any,
          _executeTool: any,
          callbacks: any
        ) => {
          callbacks.onToken('Hello ');
          callbacks.onToken('world');
          return { fullText: 'Hello world' };
        }
      );

      const callbacks = {
        onToken: vi.fn(),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      await enhancedAssistantService.chat(
        'Hello',
        [],
        { userId: 'user-1', conversationId: 'conv-1', enableStreaming: true },
        callbacks
      );

      expect(callbacks.onToken).toHaveBeenCalledTimes(2);
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should accumulate tokens correctly during streaming', async () => {
      const { streamWithToolLoop } = await import('../../src/utils/anthropicClient');
      const tokens: string[] = [];

      (streamWithToolLoop as any).mockImplementation(
        async (
          _messages: any,
          _tools: any,
          _executeTool: any,
          callbacks: any
        ) => {
          const parts = ['The ', 'quick ', 'brown ', 'fox'];
          for (const part of parts) {
            callbacks.onToken(part);
          }
          return { fullText: 'The quick brown fox' };
        }
      );

      const callbacks = {
        onToken: vi.fn((token: string) => tokens.push(token)),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      const result = await enhancedAssistantService.chat(
        'Tell me a story',
        [],
        { userId: 'user-1', conversationId: 'conv-1', enableStreaming: true },
        callbacks
      );

      expect(tokens).toEqual(['The ', 'quick ', 'brown ', 'fox']);
      expect(result.message).toBe('The quick brown fox');
    });

    it('should handle streaming errors gracefully', async () => {
      const { streamWithToolLoop } = await import('../../src/utils/anthropicClient');

      (streamWithToolLoop as any).mockRejectedValueOnce(new Error('Connection lost'));

      const callbacks = {
        onToken: vi.fn(),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      await expect(
        enhancedAssistantService.chat(
          'Hello',
          [],
          { userId: 'user-1', conversationId: 'conv-1', enableStreaming: true },
          callbacks
        )
      ).rejects.toThrow('Connection lost');

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should execute tools during streaming and report via callbacks', async () => {
      const { streamWithToolLoop } = await import('../../src/utils/anthropicClient');
      const toolCalls: any[] = [];
      const toolResults: any[] = [];

      (streamWithToolLoop as any).mockImplementation(
        async (
          _messages: any,
          _tools: any,
          executeTool: any,
          callbacks: any
        ) => {
          const toolCall = {
            tool_use_id: 'tool-1',
            name: 'search_recipes',
            input: { query: 'pasta' }
          };

          callbacks.onToolCall(toolCall);
          const result = await executeTool(toolCall);
          callbacks.onToolResult('search_recipes', result);
          callbacks.onToken('Found recipes');

          return { fullText: 'Found recipes' };
        }
      );

      const callbacks = {
        onToken: vi.fn(),
        onToolCall: vi.fn((tc) => toolCalls.push(tc)),
        onToolResult: vi.fn((name, result) => toolResults.push({ name, result })),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      await enhancedAssistantService.chat(
        'Find pasta recipes',
        [],
        { userId: 'user-1', conversationId: 'conv-1', enableStreaming: true },
        callbacks
      );

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe('search_recipes');
      expect(toolResults).toHaveLength(1);
    });
  });

  describe('Plan execution flow', () => {
    it('should execute plan with progress callbacks', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any)
        .mockResolvedValueOnce({ success: true, data: { orderId: '123' } })
        .mockResolvedValueOnce({ success: true, data: { status: 'confirmed' } });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'order_groceries', description: 'Order items', params: {}, status: 'pending' as const },
          { id: 'step-2', tool: 'confirm_order', description: 'Confirm', params: {}, status: 'pending' as const }
        ],
        explanation: 'Order and confirm',
        requiresApproval: false,
        estimatedActions: 2
      };

      const callbacks = {
        onToken: vi.fn(),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      const result = await enhancedAssistantService.executePlan(plan, 'user-1', callbacks);

      expect(callbacks.onToolCall).toHaveBeenCalledTimes(2);
      expect(callbacks.onToolResult).toHaveBeenCalledTimes(2);
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(result.message).toContain('2/2 steps completed');
    });

    it('should handle partial plan failures', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any)
        .mockResolvedValueOnce({ success: true, data: {} })
        .mockResolvedValueOnce({ success: false, error: 'Payment failed' });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'add_to_cart', description: 'Add items', params: {}, status: 'pending' as const },
          { id: 'step-2', tool: 'process_payment', description: 'Pay', params: {}, status: 'pending' as const }
        ],
        explanation: 'Add and pay',
        requiresApproval: false,
        estimatedActions: 2
      };

      const result = await enhancedAssistantService.executePlan(plan, 'user-1');

      expect(plan.steps[0].status).toBe('completed');
      expect(plan.steps[1].status).toBe('failed');
      expect(result.message).toContain('1/2 steps completed');
      expect(result.message).toContain('1 steps failed');
    });

    it('should update step status during execution', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any).mockResolvedValue({ success: true, data: {} });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'test_tool', description: 'Test', params: {}, status: 'pending' as const }
        ],
        explanation: 'Test',
        requiresApproval: false,
        estimatedActions: 1
      };

      expect(plan.steps[0].status).toBe('pending');

      await enhancedAssistantService.executePlan(plan, 'user-1');

      expect(plan.steps[0].status).toBe('completed');
    });
  });

  describe('Input validation', () => {
    it('should validate image data before processing', async () => {
      const result = await enhancedAssistantService.chatWithImage(
        'What is this?',
        'not-valid-base64!@#$',
        [],
        { userId: 'user-1', conversationId: 'conv-1' }
      );

      expect(result.message).toContain('Invalid base64');
    });

    it('should reject oversized images', async () => {
      // Create a large base64 string (>10MB when decoded)
      const largeImage = 'A'.repeat(15 * 1024 * 1024);

      const result = await enhancedAssistantService.chatWithImage(
        'What is this?',
        largeImage,
        [],
        { userId: 'user-1', conversationId: 'conv-1' }
      );

      expect(result.message).toContain('too large');
    });
  });

  describe('Conversation memory', () => {
    it('should store conversation after completion', async () => {
      const { conversationMemoryService } = await import('../../src/services/assistant/conversationMemoryService');

      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date() }
      ];

      await enhancedAssistantService.storeConversation('user-1', 'conv-1', messages);

      expect(conversationMemoryService.storeMemory).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
        expect.any(Array)
      );
    });
  });

  describe('Service exports', () => {
    it('should export all required methods', () => {
      expect(typeof enhancedAssistantService.chat).toBe('function');
      expect(typeof enhancedAssistantService.chatWithImage).toBe('function');
      expect(typeof enhancedAssistantService.generatePlan).toBe('function');
      expect(typeof enhancedAssistantService.executePlan).toBe('function');
      expect(typeof enhancedAssistantService.storeConversation).toBe('function');
      expect(typeof enhancedAssistantService.emitStreamEvent).toBe('function');
      expect(typeof enhancedAssistantService.setSocketServer).toBe('function');
    });
  });
});
