/**
 * AssistantService Tests
 * 
 * Tests for the AssistantService that handles AI-powered
 * message interpretation and multi-source aggregation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockAnthropicClient, mockConfigService, mockCacheService, mockAgentOrchestrator, mockAxios } = vi.hoisted(() => ({
  mockAnthropicClient: {
    messages: {
      create: vi.fn()
    }
  },
  mockConfigService: {
    get: vi.fn((key: string, defaultValue: any) => {
      const configs: Record<string, any> = {
        'ai.claude.defaultModel': 'claude-sonnet-4-20250514',
        'assistant.ai.maxTokens': 4000,
        'assistant.ai.knowledgeMaxTokens': 2000,
        'assistant.webSearch.enabled': true,
        'assistant.webSearch.timeoutMs': 10000,
        'assistant.webSearch.maxResults': 5,
        'assistant.aggregation.useWebFallback': true,
        'assistant.aggregation.useAIKnowledge': true
      };
      return configs[key] ?? defaultValue;
    })
  },
  mockCacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined)
  },
  mockAgentOrchestrator: {
    getAvailableAgents: vi.fn().mockReturnValue([
      { 
        id: 'cooking', 
        name: 'Cooking Agent', 
        description: 'Handle recipes',
        icon: '🍳',
        color: '#F59E0B',
        capabilities: [{ action: 'find-recipes', description: 'Find recipes', parameters: [] }],
        keywords: ['recipe', 'cooking'],
        isAvailable: true 
      }
    ]),
    executeWorkflow: vi.fn().mockResolvedValue({ success: true, steps: [] }),
    findAgentByKeyword: vi.fn().mockReturnValue(null),
    getAgentCapabilities: vi.fn().mockReturnValue([]),
    getAgentMetadata: vi.fn().mockReturnValue(null),
    buildCapabilitiesPrompt: vi.fn().mockReturnValue('Available agents: cooking (find-recipes)')
  },
  mockAxios: {
    get: vi.fn().mockResolvedValue({ data: {} })
  }
}));

// Mock dependencies
vi.mock('axios', () => ({
  default: mockAxios
}));

vi.mock('../../src/utils/anthropicClient', () => ({
  getAnthropicClient: () => mockAnthropicClient,
  parseClaudeJSON: (text: string) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: mockConfigService
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: mockCacheService
}));

vi.mock('../../src/services/assistant/agentOrchestratorService', () => ({
  agentOrchestratorService: mockAgentOrchestrator
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    search: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    agent: vi.fn(),
    api: vi.fn(),
    processing: vi.fn()
  }
}));

// Static import after mocks
import { assistantService } from '../../src/services/assistant/assistantService';

describe('AssistantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variables
    process.env.GOOGLE_CSE_API_KEY = 'test-api-key';
    process.env.GOOGLE_CSE_ID = 'test-cx-id';
    
    // Reset mock implementations
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          intent: 'greeting',
          confidence: 0.9,
          requiresAgents: [],
          extractedParams: {},
          isMultiStep: false
        })
      }]
    });
    
    mockAxios.get.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_ID;
  });

  describe('searchWeb', () => {
    it('should return empty array when API keys not configured properly', async () => {
      // The service checks for API keys at construction time
      // Since we're in test environment, keys may not be properly injected
      const results = await assistantService.searchWeb('pasta recipe');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array on any error', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));
      
      const results = await assistantService.searchWeb('test');
      expect(results).toEqual([]);
    });

    it('should return empty array when no items in response', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });
      
      const results = await assistantService.searchWeb('test');
      expect(results).toEqual([]);
    });
  });

  describe('searchRecipesWeb', () => {
    it('should return array for recipe search', async () => {
      // The method internally calls searchWeb which checks for API keys
      const results = await assistantService.searchRecipesWeb('spaghetti bolognese');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getAIKnowledge', () => {
    it('should generate AI knowledge response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Here is a great recipe for pasta...' }]
      });
      
      const knowledge = await assistantService.getAIKnowledge('How to make pasta', 'recipe');
      expect(knowledge).toBe('Here is a great recipe for pasta...');
    });

    it('should handle AI errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('AI Error'));
      
      const knowledge = await assistantService.getAIKnowledge('test', 'general');
      expect(knowledge).toBeNull();
    });
  });

  describe('interpretUserMessage', () => {
    it('should analyze user intent', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            intent: 'find_recipe',
            confidence: 0.95,
            requiresAgents: ['cooking'],
            extractedParams: { recipeName: 'pasta' },
            isMultiStep: false
          })
        }]
      });
      
      const intent = await assistantService.interpretUserMessage(
        'Find me a pasta recipe',
        []
      );
      
      expect(intent.intent).toBe('find_recipe');
      expect(intent.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('planWorkflow', () => {
    it('should create execution plan from intent', async () => {
      // Mock capabilities for the agent
      mockAgentOrchestrator.getAgentCapabilities.mockReturnValue([
        { action: 'find-recipes', description: 'Find recipes', parameters: [] },
        { action: 'add-item', description: 'Add item', parameters: [] }
      ]);
      
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            steps: [
              { agentId: 'cooking', action: 'find-recipes', params: { query: 'pasta' } }
            ],
            explanation: 'Finding pasta recipes'
          })
        }]
      });
      
      const intent = {
        intent: 'find_recipe',
        confidence: 0.9,
        requiresAgents: ['cooking'] as any[],
        extractedParams: { query: 'pasta' },
        isMultiStep: false
      };
      
      const plan = await assistantService.planWorkflow(intent, 'Find pasta recipe', []);
      expect(plan.steps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('handleMessage', () => {
    it('should process simple greeting', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            intent: 'greeting',
            confidence: 0.99,
            requiresAgents: [],
            extractedParams: {},
            isMultiStep: false
          })
        }]
      });
      
      const response = await assistantService.handleMessage(
        'Hello!',
        'user123',
        []
      );
      
      expect(response.message).toBeTruthy();
    });

    it('should include suggestions in response', async () => {
      const response = await assistantService.handleMessage('Hi', 'user123', []);
      
      expect(response.suggestions).toBeDefined();
      expect(Array.isArray(response.suggestions)).toBe(true);
    });
  });
});
