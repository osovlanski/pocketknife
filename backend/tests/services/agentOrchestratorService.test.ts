/**
 * AgentOrchestratorService Tests
 * 
 * Tests for the AgentOrchestratorService that handles
 * agent capability discovery and workflow execution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockAgentRegistry, mockConfigService } = vi.hoisted(() => {
  const mockCookingAgent = {
    metadata: {
      id: 'cooking',
      name: 'Cooking Agent',
      description: 'Handle recipes and cooking tasks',
      icon: '🍳',
      color: '#F59E0B'
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: {} }),
    isRunning: vi.fn().mockReturnValue(false),
    getState: vi.fn().mockReturnValue('idle')
  };

  return {
    mockAgentRegistry: {
      getAll: vi.fn().mockReturnValue([mockCookingAgent]),
      get: vi.fn().mockReturnValue(mockCookingAgent),
      has: vi.fn().mockReturnValue(true)
    },
    mockConfigService: {
      get: vi.fn((key: string, defaultValue: any) => defaultValue)
    }
  };
});

// Mock dependencies
vi.mock('../../src/agents/AgentRegistry', () => ({
  agentRegistry: mockAgentRegistry
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: mockConfigService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    agent: vi.fn(),
    processing: vi.fn()
  }
}));

// Static import after mocks
import { agentOrchestratorService } from '../../src/services/assistant/agentOrchestratorService';

describe('AgentOrchestratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAvailableAgents', () => {
    it('should return list of available agents', () => {
      const agents = agentOrchestratorService.getAvailableAgents();
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('getAgentKeywords', () => {
    it('should return keywords for cooking agent', () => {
      const keywords = agentOrchestratorService.getAgentKeywords('cooking');
      expect(Array.isArray(keywords)).toBe(true);
    });

    it('should return empty array for unknown agent', () => {
      const keywords = agentOrchestratorService.getAgentKeywords('unknown' as any);
      expect(keywords).toEqual([]);
    });
  });

  describe('findAgentByKeyword', () => {
    it('should find cooking agent by recipe keyword', () => {
      const agentId = agentOrchestratorService.findAgentByKeyword('#recipe');
      expect(agentId).toBe('cooking');
    });

    it('should return null for unknown keyword', () => {
      const agentId = agentOrchestratorService.findAgentByKeyword('#unknown123xyz');
      expect(agentId).toBeNull();
    });
  });

  describe('getAgentCapabilities', () => {
    it('should return capabilities for cooking agent', () => {
      const capabilities = agentOrchestratorService.getAgentCapabilities('cooking');
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown agent', () => {
      const capabilities = agentOrchestratorService.getAgentCapabilities('unknown' as any);
      expect(capabilities).toEqual([]);
    });
  });

  describe('buildCapabilitiesPrompt', () => {
    it('should generate capabilities prompt string', () => {
      // Ensure mock returns array
      mockAgentRegistry.getAll.mockReturnValue([{
        metadata: {
          id: 'cooking',
          name: 'Cooking Agent',
          description: 'Handle recipes',
          icon: '🍳',
          color: '#F59E0B'
        },
        isRunning: vi.fn().mockReturnValue(false),
        getState: vi.fn().mockReturnValue('idle')
      }]);
      
      const prompt = agentOrchestratorService.buildCapabilitiesPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('executeAgentAction', () => {
    it('should execute action on agent', async () => {
      const result = await agentOrchestratorService.executeAgentAction(
        'cooking',
        'find-recipes',
        { query: 'pasta' },
        'user123'
      );
      expect(result).toBeDefined();
    });

    it('should return error for unknown agent', async () => {
      mockAgentRegistry.get.mockReturnValueOnce(undefined);
      
      const result = await agentOrchestratorService.executeAgentAction(
        'unknown' as any,
        'some-action',
        {},
        'user123'
      );
      expect(result.success).toBe(false);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute empty workflow successfully', async () => {
      const result = await agentOrchestratorService.executeWorkflow([], 'user123');
      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
    });

    it('should execute single step workflow', async () => {
      const steps = [{
        id: 'step-1',
        agentId: 'cooking' as const,
        action: 'find-recipes',
        params: { query: 'pasta' },
        status: 'pending' as const
      }];
      
      const result = await agentOrchestratorService.executeWorkflow(steps, 'user123');
      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(1);
    });
  });
});
