/**
 * Learning Controller Tests
 * 
 * Tests for the Learning controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/learning/learningService', () => ({
  default: {
    searchAllSources: vi.fn().mockResolvedValue([]),
    summarizeArticle: vi.fn().mockResolvedValue('Summary content'),
    generateTopicSummary: vi.fn().mockResolvedValue('Topic summary'),
    getLinkedInIntegrationInfo: vi.fn().mockReturnValue({ isConfigured: false }),
    configureLinkedIn: vi.fn()
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn()
  }
}));

describe('Learning Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      app: {
        get: vi.fn().mockReturnValue(null)
      } as any
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchLearningResources', () => {
    it('should search resources successfully', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.searchAllSources as any).mockResolvedValue([
        { id: 'res-1', title: 'React Tutorial', source: 'devto' }
      ]);

      const { searchLearningResources } = await import('../../src/controllers/learningController');
      
      mockReq.body = { query: 'React hooks', sources: ['devto'] };

      await searchLearningResources(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        query: 'React hooks'
      }));
    });

    it('should return 400 when query missing', async () => {
      const { searchLearningResources } = await import('../../src/controllers/learningController');
      
      mockReq.body = { sources: ['devto'] };

      await searchLearningResources(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when query is not a string', async () => {
      const { searchLearningResources } = await import('../../src/controllers/learningController');
      
      mockReq.body = { query: 123 };

      await searchLearningResources(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should handle search errors', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.searchAllSources as any).mockRejectedValue(new Error('Search failed'));

      const { searchLearningResources } = await import('../../src/controllers/learningController');
      
      mockReq.body = { query: 'React' };

      await searchLearningResources(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('summarizeArticle', () => {
    it('should summarize article successfully', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.summarizeArticle as any).mockResolvedValue('This is a summary of the article.');

      const { summarizeArticle } = await import('../../src/controllers/learningController');
      
      mockReq.body = { url: 'https://example.com/article', title: 'Test Article' };

      await summarizeArticle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        url: 'https://example.com/article'
      }));
    });

    it('should return 400 when URL missing', async () => {
      const { summarizeArticle } = await import('../../src/controllers/learningController');
      
      mockReq.body = { title: 'Test Article' };

      await summarizeArticle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should handle summarization errors', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.summarizeArticle as any).mockRejectedValue(new Error('Summarization failed'));

      const { summarizeArticle } = await import('../../src/controllers/learningController');
      
      mockReq.body = { url: 'https://example.com/article' };

      await summarizeArticle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getLinkedInInfo', () => {
    it('should return LinkedIn integration info', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.getLinkedInIntegrationInfo as any).mockReturnValue({
        isConfigured: true,
        isPremium: false
      });

      const { getLinkedInInfo } = await import('../../src/controllers/learningController');

      await getLinkedInInfo(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.getLinkedInIntegrationInfo as any).mockImplementation(() => {
        throw new Error('Failed to get info');
      });

      const { getLinkedInInfo } = await import('../../src/controllers/learningController');

      await getLinkedInInfo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('configureLinkedIn', () => {
    it('should configure LinkedIn successfully', async () => {
      const { configureLinkedIn } = await import('../../src/controllers/learningController');
      
      mockReq.body = { accessToken: 'token-123', isPremium: true };

      await configureLinkedIn(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when access token missing', async () => {
      const { configureLinkedIn } = await import('../../src/controllers/learningController');
      
      mockReq.body = { isPremium: true };

      await configureLinkedIn(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateTopicSummary', () => {
    it('should generate topic summary successfully', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.generateTopicSummary as any).mockResolvedValue('Comprehensive summary of React hooks...');

      const { generateTopicSummary } = await import('../../src/controllers/learningController');
      
      mockReq.body = { topic: 'React Hooks' };

      await generateTopicSummary(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        topic: 'React Hooks'
      }));
    });

    it('should return 400 when topic missing', async () => {
      const { generateTopicSummary } = await import('../../src/controllers/learningController');
      
      mockReq.body = {};

      await generateTopicSummary(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when topic is not a string', async () => {
      const { generateTopicSummary } = await import('../../src/controllers/learningController');
      
      mockReq.body = { topic: 123 };

      await generateTopicSummary(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should handle generation errors', async () => {
      const learningService = (await import('../../src/services/learning/learningService')).default;
      (learningService.generateTopicSummary as any).mockRejectedValue(new Error('Generation failed'));

      const { generateTopicSummary } = await import('../../src/controllers/learningController');
      
      mockReq.body = { topic: 'React' };

      await generateTopicSummary(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});

