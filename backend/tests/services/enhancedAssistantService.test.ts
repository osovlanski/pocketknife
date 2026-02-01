/**
 * Enhanced Assistant Service Tests
 *
 * These tests verify the basic structure and exports of the enhanced assistant service.
 * Complex integration scenarios are tested in e2e tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies that are loaded on import
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
  executeTool: vi.fn(),
  executeToolsParallel: vi.fn()
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

describe('EnhancedAssistantService', () => {
  let enhancedAssistantService: typeof import('../../src/services/assistant/enhancedAssistantService').enhancedAssistantService;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../src/services/assistant/enhancedAssistantService');
    enhancedAssistantService = module.enhancedAssistantService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('service export', () => {
    it('should export enhancedAssistantService instance', async () => {
      const module = await import('../../src/services/assistant/enhancedAssistantService');
      expect(module.enhancedAssistantService).toBeDefined();
    });

    it('should have chat method', () => {
      expect(typeof enhancedAssistantService.chat).toBe('function');
    });

    it('should have chatWithImage method', () => {
      expect(typeof enhancedAssistantService.chatWithImage).toBe('function');
    });

    it('should have generatePlan method', () => {
      expect(typeof enhancedAssistantService.generatePlan).toBe('function');
    });

    it('should have executePlan method', () => {
      expect(typeof enhancedAssistantService.executePlan).toBe('function');
    });

    it('should have storeConversation method', () => {
      expect(typeof enhancedAssistantService.storeConversation).toBe('function');
    });
  });

  describe('chat - basic validation', () => {
    it('should accept valid chat parameters', async () => {
      // Re-import and setup mock after resetModules
      const { getAnthropicClient } = await import('../../src/utils/anthropicClient');

      const mockCreate = vi.fn().mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello!' }]
      });

      (getAnthropicClient as any).mockReturnValue({
        messages: { create: mockCreate }
      });

      // Re-import service to get fresh instance with new mock
      const module = await import('../../src/services/assistant/enhancedAssistantService');

      const result = await module.enhancedAssistantService.chat(
        'Hi',
        [],
        { userId: 'user-1', conversationId: 'conv-1' }
      );

      expect(result).toBeDefined();
      expect(result.toolCalls).toEqual([]);
    });
  });

  describe('storeConversation', () => {
    it('should delegate to memory service', async () => {
      const { conversationMemoryService } = await import('../../src/services/assistant/conversationMemoryService');

      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: new Date() }
      ];

      await enhancedAssistantService.storeConversation('user-1', 'conv-1', messages);

      expect(conversationMemoryService.storeMemory).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' }),
          expect.objectContaining({ role: 'assistant', content: 'Hi!' })
        ])
      );
    });
  });

  describe('executePlan - structure', () => {
    it('should process plan steps', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any).mockResolvedValue({ success: true, data: {} });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'test_tool', description: 'Test step', params: {}, status: 'pending' as const }
        ],
        explanation: 'Test plan',
        requiresApproval: false,
        estimatedActions: 1
      };

      const result = await enhancedAssistantService.executePlan(plan, 'user-1');

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(executeTool).toHaveBeenCalled();
    });

    it('should handle step failures gracefully', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any).mockResolvedValue({ success: false, error: 'Test error' });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'failing_tool', description: 'Failing step', params: {}, status: 'pending' as const }
        ],
        explanation: 'Test plan',
        requiresApproval: false,
        estimatedActions: 1
      };

      const result = await enhancedAssistantService.executePlan(plan, 'user-1');

      // Should not throw, should return result with failure info
      expect(result).toBeDefined();
      expect(result.message).toContain('failed');
    });

    it('should call streaming callbacks during execution', async () => {
      const { executeTool } = await import('../../src/services/assistant/toolCallingService');

      (executeTool as any).mockResolvedValue({ success: true, data: {} });

      const plan = {
        id: 'plan-1',
        steps: [
          { id: 'step-1', tool: 'test_tool', description: 'Test', params: {}, status: 'pending' as const }
        ],
        explanation: 'Test plan',
        requiresApproval: false,
        estimatedActions: 1
      };

      const callbacks = {
        onToken: vi.fn(),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };

      await enhancedAssistantService.executePlan(plan, 'user-1', callbacks);

      expect(callbacks.onToolCall).toHaveBeenCalled();
      expect(callbacks.onToolResult).toHaveBeenCalled();
      expect(callbacks.onComplete).toHaveBeenCalled();
    });
  });
});
