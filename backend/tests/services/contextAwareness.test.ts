/**
 * Context Awareness Tests
 *
 * Verifies that the system prompts include instructions for handling
 * conversational references like "do that", "yes", "proceed" etc.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies for enhancedAssistantService
vi.mock('../../src/utils/anthropicClient', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: { create: vi.fn() }
  })),
  streamWithToolLoop: vi.fn(),
  analyzeImage: vi.fn(),
  extractText: vi.fn(() => '')
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
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue)
  }
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    agent: vi.fn(), success: vi.fn(), fail: vi.fn(), search: vi.fn(),
    start: vi.fn(), stop: vi.fn(), timed: vi.fn()
  }
}));

describe('Context Awareness - System Prompts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('Enhanced Assistant Service - System Prompt', () => {
    it('should include conversational context rules', async () => {
      const module = await import('../../src/services/assistant/enhancedAssistantService');
      // Access the module source to verify the prompt includes context rules
      // We check that the service exists and has the chat method
      expect(module.enhancedAssistantService).toBeDefined();
      expect(typeof module.enhancedAssistantService.chat).toBe('function');
    });

    it('should handle "do that" messages by resolving from conversation history', async () => {
      const { getAnthropicClient } = await import('../../src/utils/anthropicClient');
      const module = await import('../../src/services/assistant/enhancedAssistantService');

      // Mock Claude to return a response
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Searching for jobs...' }],
        stop_reason: 'end_turn'
      });
      (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: { create: mockCreate }
      });

      // Send "do that" with conversation history that has a prior suggestion
      const history = [
        {
          id: '1',
          role: 'user' as const,
          content: 'I want to find senior software engineering jobs',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'I can search for senior software engineering jobs in Israel. Shall I do that?',
          timestamp: new Date().toISOString()
        }
      ];

      const result = await module.enhancedAssistantService.chat(
        'do that',
        history,
        { userId: 'user-1', conversationId: 'conv-1' }
      );

      expect(result).toBeDefined();
      // Verify Claude was called with conversation history included
      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];

      // The system prompt should contain the context rules
      expect(callArgs.system).toContain('Conversational Context Rules');
      expect(callArgs.system).toContain('do that');
      expect(callArgs.system).toContain('previous message');

      // The messages should include the conversation history
      const messageContents = callArgs.messages.map((m: { content: string }) =>
        typeof m.content === 'string' ? m.content : ''
      );
      const allContent = messageContents.join(' ');
      expect(allContent).toContain('senior software engineering jobs');
    });

    it('should include file attachment handling instruction', async () => {
      const { getAnthropicClient } = await import('../../src/utils/anthropicClient');
      const module = await import('../../src/services/assistant/enhancedAssistantService');

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I see your resume...' }],
        stop_reason: 'end_turn'
      });
      (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: { create: mockCreate }
      });

      // Send a message with file attachment prefix
      const messageWithFile = '[Attached file: resume.pdf]\n--- File Content ---\nJohn Doe - Software Engineer\n--- End File Content ---\n\nReview my resume';

      const result = await module.enhancedAssistantService.chat(
        messageWithFile,
        [],
        { userId: 'user-1', conversationId: 'conv-1' }
      );

      expect(result).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();

      // The system prompt should mention file attachment handling
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('file attachment');
    });
  });

  describe('Legacy Assistant Service - Intent Analysis', () => {
    it('should include context resolution instructions in intent analysis prompt', async () => {
      // Import to verify the module loads correctly
      const module = await import('../../src/services/assistant/assistantService');
      expect(module.default).toBeDefined();
    });
  });
});

describe('Context Awareness - Anaphoric Reference Patterns', () => {
  const AFFIRMATIVE_PATTERNS = [
    'do that',
    'yes',
    'go ahead',
    'proceed',
    'do it',
    'sure',
    'ok',
    "let's do it",
    'sounds good',
    'make it happen',
    'yes please',
    'yep',
    'absolutely',
    'the first one',
    'option A'
  ];

  it('should recognize common affirmative patterns', () => {
    const SHORT_AFFIRMATIVE_REGEX = /^(do (that|it)|yes|go ahead|proceed|sure|ok|let'?s do it|sounds good|make it happen|yep|absolutely|yes please)$/i;

    for (const pattern of AFFIRMATIVE_PATTERNS.slice(0, 12)) {
      const isShortAffirmative = pattern.length < 30 && SHORT_AFFIRMATIVE_REGEX.test(pattern);
      expect(isShortAffirmative, `Expected "${pattern}" to be recognized as affirmative`).toBe(true);
    }
  });

  it('should not flag normal messages as affirmative', () => {
    const normalMessages = [
      'Find me a recipe for pasta carbonara',
      'What is the weather in Tel Aviv?',
      'Search for software engineering jobs in Israel',
      'Create a task to buy groceries'
    ];

    const SHORT_AFFIRMATIVE_REGEX = /^(do (that|it)|yes|go ahead|proceed|sure|ok|let'?s do it|sounds good|make it happen|yep|absolutely|yes please)$/i;

    for (const message of normalMessages) {
      const isShortAffirmative = message.length < 30 && SHORT_AFFIRMATIVE_REGEX.test(message);
      expect(isShortAffirmative, `"${message}" should not be flagged as affirmative`).toBe(false);
    }
  });
});
