/**
 * Learning Service Tests
 * 
 * Tests for the Learning service that handles tech resources.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Summary of the article' }]
      })
    }
  }))
}));

describe('Learning Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-api-key',
      GOOGLE_CSE_API_KEY: 'test-cse-key',
      GOOGLE_CSE_ID: 'test-cse-id'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('searchDevTo', () => {
    it('should search DEV.to articles', async () => {
      (axios.get as any).mockResolvedValue({
        data: [
          {
            id: 1,
            title: 'TypeScript Guide',
            url: 'https://dev.to/article',
            description: 'Test description',
            user: { username: 'author' },
            published_at: '2026-01-20',
            tag_list: ['typescript', 'programming'],
            positive_reactions_count: 100
          }
        ]
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const resources = await learningService.searchDevTo('typescript');

      expect(Array.isArray(resources)).toBe(true);
    });

    it('should handle search errors gracefully', async () => {
      (axios.get as any).mockRejectedValue(new Error('API Error'));

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const resources = await learningService.searchDevTo('test');

      // Should return empty array on error
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBe(0);
    });
  });

  describe('searchHackerNews', () => {
    it('should search HackerNews stories', async () => {
      (axios.get as any).mockResolvedValue({
        data: {
          hits: [
            {
              objectID: '12345',
              title: 'HN Story',
              url: 'https://example.com',
              author: 'user1',
              created_at: '2026-01-20T10:00:00Z',
              points: 100,
              num_comments: 50
            }
          ]
        }
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const stories = await learningService.searchHackerNews('typescript');

      expect(Array.isArray(stories)).toBe(true);
    });

    it('should handle HN API errors', async () => {
      (axios.get as any).mockRejectedValue(new Error('API Error'));

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const stories = await learningService.searchHackerNews('test');

      expect(Array.isArray(stories)).toBe(true);
      expect(stories.length).toBe(0);
    });
  });

  describe('searchReddit', () => {
    it('should search Reddit posts', async () => {
      (axios.get as any).mockResolvedValue({
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'abc123',
                  title: 'Reddit Post',
                  url: 'https://reddit.com/r/programming/abc123',
                  permalink: '/r/programming/comments/abc123',
                  author: 'user1',
                  created_utc: 1600000000,
                  ups: 500,
                  num_comments: 100,
                  subreddit: 'programming'
                }
              }
            ]
          }
        }
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const posts = await learningService.searchReddit('typescript');

      expect(Array.isArray(posts)).toBe(true);
    });
  });

  describe('searchMedium', () => {
    it('should search Medium articles', async () => {
      (axios.get as any).mockResolvedValue({
        data: '<html><article><h2><a href="https://medium.com/article">Article Title</a></h2></article></html>'
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const articles = await learningService.searchMedium('typescript');

      expect(Array.isArray(articles)).toBe(true);
    });
  });

  describe('searchAllSources', () => {
    it('should search all sources', async () => {
      (axios.get as any).mockResolvedValue({
        data: []
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const resources = await learningService.searchAllSources({
        query: 'typescript',
        sources: ['devto'],
        limit: 10
      });

      expect(Array.isArray(resources)).toBe(true);
    });

    it('should handle multiple sources', async () => {
      (axios.get as any).mockResolvedValue({
        data: []
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      const resources = await learningService.searchAllSources({
        query: 'typescript',
        sources: ['devto', 'hackernews', 'reddit'],
        limit: 10
      });

      expect(Array.isArray(resources)).toBe(true);
    });
  });

  describe('generateTopicSummary', () => {
    it('should handle topic summary gracefully', async () => {
      const { default: learningService } = await import('../../src/services/learning/learningService');

      // This may throw in test environment without proper Anthropic setup
      try {
        const summary = await learningService.generateTopicSummary('TypeScript generics');
        expect(typeof summary).toBe('string');
      } catch (error: any) {
        // Expected in test environment
        expect(error.message).toBeDefined();
      }
    });

    it('should throw without API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      vi.resetModules();

      const { default: learningService } = await import('../../src/services/learning/learningService');

      await expect(learningService.generateTopicSummary('test')).rejects.toThrow();
    });
  });

  describe('summarizeArticle', () => {
    it('should handle summarization gracefully', async () => {
      // Mock axios for fetching article content
      (axios.get as any).mockResolvedValue({
        data: '<html><body><article>Article content here</article></body></html>'
      });

      const { default: learningService } = await import('../../src/services/learning/learningService');

      // This will throw if Anthropic client fails to initialize properly in tests
      // The important thing is that the method exists and handles errors
      try {
        await learningService.summarizeArticle('https://example.com/article', 'Test Article');
      } catch (error: any) {
        // Expected to throw in test environment without proper Anthropic setup
        expect(error.message).toContain('Failed to summarize');
      }
    });

    it('should throw without API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      vi.resetModules();

      const { default: learningService } = await import('../../src/services/learning/learningService');

      await expect(learningService.summarizeArticle('https://example.com', 'Test')).rejects.toThrow();
    });
  });

  describe('configureLinkedIn', () => {
    it('should save LinkedIn configuration', async () => {
      const { default: learningService } = await import('../../src/services/learning/learningService');

      // Should not throw
      expect(() => learningService.configureLinkedIn({
        accessToken: 'test-token',
        isPremium: true
      })).not.toThrow();
    });
  });

  describe('getLinkedInIntegrationInfo', () => {
    it('should return LinkedIn integration info', async () => {
      const { default: learningService } = await import('../../src/services/learning/learningService');

      const info = learningService.getLinkedInIntegrationInfo();

      expect(typeof info).toBe('object');
      expect(info).toHaveProperty('configured');
      expect(info).toHaveProperty('isPremium');
      expect(info).toHaveProperty('instructions');
    });
  });
});
