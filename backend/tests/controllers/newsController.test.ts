/**
 * News Controller Tests
 * 
 * Tests for the News controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents', () => ({
  newsAgent: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    })
  }
}));

vi.mock('../../src/utils/controllerHelpers', () => ({
  getUserIdFromRequest: vi.fn().mockResolvedValue('user-123')
}));

describe('News Controller', () => {
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
      headers: { 'x-user-email': 'test@test.com' }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchNews', () => {
    it('should search news successfully', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          articles: [{ id: 'art-1', title: 'Tech News' }]
        }
      });

      const { searchNews } = await import('../../src/controllers/newsController');
      
      mockReq.body = { 
        query: 'technology',
        topics: ['tech'],
        maxResults: 10
      };

      await searchNews(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when agent fails', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Search failed'
      });

      const { searchNews } = await import('../../src/controllers/newsController');
      
      mockReq.body = { query: 'tech' };

      await searchNews(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getFeed', () => {
    it('should return personalized feed', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          articles: [{ id: 'art-1', title: 'Personalized News' }]
        }
      });

      const { getFeed } = await import('../../src/controllers/newsController');

      await getFeed(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { getFeed } = await import('../../src/controllers/newsController');

      await getFeed(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getDigest', () => {
    it('should return news digest', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          digest: { summary: 'Daily news digest...' }
        }
      });

      const { getDigest } = await import('../../src/controllers/newsController');

      await getDigest(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { getDigest } = await import('../../src/controllers/newsController');

      await getDigest(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('saveArticle', () => {
    it('should save article successfully', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { saved: true }
      });

      const { saveArticle } = await import('../../src/controllers/newsController');
      
      mockReq.body = { 
        article: { id: 'art-1', title: 'Tech News', url: 'https://example.com' }
      };

      await saveArticle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { saveArticle } = await import('../../src/controllers/newsController');
      
      mockReq.body = { article: { title: 'Test' } };

      await saveArticle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('recordInteraction', () => {
    it('should record interaction successfully', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { recorded: true }
      });

      const { recordInteraction } = await import('../../src/controllers/newsController');
      
      mockReq.body = { 
        articleId: 'art-1',
        interactionType: 'click',
        readDuration: 60
      };

      await recordInteraction(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { recordInteraction } = await import('../../src/controllers/newsController');
      
      mockReq.body = { articleId: 'art-1' };

      await recordInteraction(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getSavedArticles', () => {
    it('should return saved articles', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          articles: [{ id: 'art-1', title: 'Saved Article' }]
        }
      });

      const { getSavedArticles } = await import('../../src/controllers/newsController');

      await getSavedArticles(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { getSavedArticles } = await import('../../src/controllers/newsController');

      await getSavedArticles(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getTrends', () => {
    it('should return trending topics', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          trends: [{ topic: 'AI', count: 100 }]
        }
      });

      const { getTrends } = await import('../../src/controllers/newsController');
      
      mockReq.query = { geoScope: 'global' };

      await getTrends(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { updated: true }
      });

      const { updatePreferences } = await import('../../src/controllers/newsController');
      
      mockReq.body = { 
        preferences: { topics: ['technology', 'science'] }
      };

      await updatePreferences(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { updatePreferences } = await import('../../src/controllers/newsController');
      
      mockReq.body = { preferences: {} };

      await updatePreferences(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          topics: ['technology'],
          language: 'en'
        }
      });

      const { getPreferences } = await import('../../src/controllers/newsController');

      await getPreferences(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return default preferences when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { getPreferences } = await import('../../src/controllers/newsController');

      await getPreferences(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        topics: expect.any(Array),
        language: 'en'
      }));
    });
  });

  describe('summarizeArticle', () => {
    it('should summarize article successfully', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          summary: 'Article summary...'
        }
      });

      const { summarizeArticle } = await import('../../src/controllers/newsController');
      
      mockReq.body = { 
        articleUrl: 'https://example.com/article',
        article: { title: 'Test Article' }
      };

      await summarizeArticle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when summarization fails', async () => {
      const { newsAgent } = await import('../../src/agents');
      (newsAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Summarization failed'
      });

      const { summarizeArticle } = await import('../../src/controllers/newsController');
      
      mockReq.body = { articleUrl: 'https://example.com' };

      await summarizeArticle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });
});

