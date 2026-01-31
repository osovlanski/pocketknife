/**
 * Perplexity Service Tests
 *
 * Basic tests for the Perplexity API service.
 * These tests verify service configuration and basic functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

describe('PerplexityService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', async () => {
      process.env.PERPLEXITY_API_KEY = 'test-api-key';
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');
      expect(perplexityService.isConfigured()).toBe(true);
    });

    it('should return false when API key is not set', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');
      expect(perplexityService.isConfigured()).toBe(false);
    });

    it('should return false when API key is empty', async () => {
      process.env.PERPLEXITY_API_KEY = '';
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');
      expect(perplexityService.isConfigured()).toBe(false);
    });
  });

  describe('search (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.search('test query')).rejects.toThrow('Perplexity API key not configured');
    });
  });

  describe('answer (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.answer('What is TypeScript?')).rejects.toThrow('Perplexity API key not configured');
    });
  });

  describe('summarizeTopic (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.summarizeTopic('Machine Learning')).rejects.toThrow('Perplexity API key not configured');
    });
  });

  describe('searchProducts (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.searchProducts('laptop')).rejects.toThrow('Perplexity API key not configured');
    });
  });

  describe('searchRecipes (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.searchRecipes('pasta')).rejects.toThrow('Perplexity API key not configured');
    });
  });

  describe('searchTravel (unconfigured)', () => {
    it('should throw error when not configured', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      const { perplexityService } = await import('../../src/services/integrations/perplexityService');

      await expect(perplexityService.searchTravel('Tokyo')).rejects.toThrow('Perplexity API key not configured');
    });
  });
});
