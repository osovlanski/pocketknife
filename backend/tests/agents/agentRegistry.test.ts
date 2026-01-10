/**
 * Agent Registry Tests
 * 
 * Tests the agent registration and management functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('AgentRegistry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('agentRegistry', () => {
    it('should have required methods', async () => {
      const { agentRegistry } = await import('../../src/agents/AgentRegistry');
      
      expect(typeof agentRegistry.register).toBe('function');
      expect(typeof agentRegistry.get).toBe('function');
      expect(typeof agentRegistry.getAll).toBe('function');
      expect(typeof agentRegistry.getAllMetadata).toBe('function');
    });

    it('should get all agents as an array', async () => {
      const { agentRegistry } = await import('../../src/agents/AgentRegistry');
      
      const agents = agentRegistry.getAll();
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should get all agent metadata', async () => {
      const { agentRegistry } = await import('../../src/agents/AgentRegistry');
      
      const metadata = agentRegistry.getAllMetadata();
      expect(Array.isArray(metadata)).toBe(true);
    });

    it('should have initialize method', async () => {
      const { agentRegistry } = await import('../../src/agents/AgentRegistry');
      
      expect(typeof agentRegistry.initialize).toBe('function');
    });
  });
});
