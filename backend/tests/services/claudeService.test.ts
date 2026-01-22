/**
 * ClaudeService Tests
 * 
 * Tests for the Claude AI service that handles AI text generation and analysis.
 * Note: These tests focus on error handling and edge cases since the actual API
 * calls require a valid API key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ClaudeService', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('initialization', () => {
    it('should throw error when API key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      await expect(claudeService.classifyEmail({ subject: 'Test', from: 'test@test.com', date: '2026-01-01', snippet: 'test' }))
        .rejects.toThrow('ANTHROPIC_API_KEY is not set');
    });
    
    it('should handle empty API key', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      await expect(claudeService.classifyEmail({ subject: 'Test', from: 'test@test.com', date: '2026-01-01', snippet: 'test' }))
        .rejects.toThrow('ANTHROPIC_API_KEY is not set');
    });
  });

  describe('service structure', () => {
    it('should have classifyEmail method', async () => {
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      expect(typeof claudeService.classifyEmail).toBe('function');
    });
    
    it('should have generateText method', async () => {
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      expect(typeof claudeService.generateText).toBe('function');
    });
    
    it('should have analyzeEmailPatterns method', async () => {
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      expect(typeof claudeService.analyzeEmailPatterns).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only API key', async () => {
      process.env.ANTHROPIC_API_KEY = '   ';
      
      const { default: claudeService } = await import('../../src/services/core/claudeService');
      
      await expect(claudeService.classifyEmail({ subject: 'Test', from: 'test@test.com', date: '2026-01-01', snippet: 'test' }))
        .rejects.toThrow('ANTHROPIC_API_KEY is not set');
    });
  });
});
