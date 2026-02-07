/**
 * Agent Manifests Contract Tests
 *
 * Verifies that all agent manifests are well-formed and satisfy
 * the contract expected by the orchestrator and registry.
 */

import { describe, it, expect } from 'vitest';
import { AGENT_MANIFESTS, getManifest } from '../../src/agents/manifests';
import type { AgentId } from '../../src/agents/types';

const ALL_AGENT_IDS: AgentId[] = [
  'cooking', 'jobs', 'travel', 'todo', 'email',
  'shopping', 'learning', 'news', 'diy', 'problems', 'assistant'
];

describe('Agent Manifests', () => {
  it('should have a manifest for every AgentId', () => {
    for (const agentId of ALL_AGENT_IDS) {
      const manifest = AGENT_MANIFESTS[agentId];
      expect(manifest, `Missing manifest for agent: ${agentId}`).toBeDefined();
    }
  });

  it('should return manifests via getManifest for every AgentId', () => {
    for (const agentId of ALL_AGENT_IDS) {
      const manifest = getManifest(agentId);
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe(agentId);
    }
  });

  describe.each(ALL_AGENT_IDS)('manifest for "%s"', (agentId) => {
    const manifest = AGENT_MANIFESTS[agentId];

    it('should have matching id', () => {
      expect(manifest.id).toBe(agentId);
    });

    it('should have non-empty name', () => {
      expect(manifest.name).toBeTruthy();
      expect(typeof manifest.name).toBe('string');
      expect(manifest.name.length).toBeGreaterThan(0);
    });

    it('should have non-empty description', () => {
      expect(manifest.description).toBeTruthy();
      expect(typeof manifest.description).toBe('string');
    });

    it('should have a single emoji icon', () => {
      expect(manifest.icon).toBeTruthy();
      expect(typeof manifest.icon).toBe('string');
    });

    it('should have a valid hex color', () => {
      expect(manifest.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have non-empty keywords array', () => {
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect(manifest.keywords.length).toBeGreaterThan(0);
      for (const keyword of manifest.keywords) {
        expect(typeof keyword).toBe('string');
        expect(keyword.length).toBeGreaterThan(0);
      }
    });

    it('should have valid agentType', () => {
      expect(['simple', 'deep']).toContain(manifest.agentType);
    });

    it('should have capabilities array', () => {
      expect(Array.isArray(manifest.capabilities)).toBe(true);
    });

    it('should have well-formed capabilities', () => {
      for (const capability of manifest.capabilities) {
        expect(capability.action).toBeTruthy();
        expect(typeof capability.action).toBe('string');
        expect(capability.description).toBeTruthy();
        expect(typeof capability.description).toBe('string');
        expect(Array.isArray(capability.parameters)).toBe(true);

        for (const param of capability.parameters) {
          expect(param.name).toBeTruthy();
          expect(['string', 'number', 'boolean', 'array', 'object']).toContain(param.type);
          expect(typeof param.required).toBe('boolean');
          expect(param.description).toBeTruthy();
        }
      }
    });
  });
});

describe('getManifest error handling', () => {
  it('should throw for unknown agent ID', () => {
    expect(() => {
      // Force an invalid ID through the type system for testing
      getManifest('nonexistent' as AgentId);
    }).toThrow('No manifest found for agent: nonexistent');
  });
});
