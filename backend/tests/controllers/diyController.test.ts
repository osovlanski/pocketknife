/**
 * DIY Controller Tests
 * 
 * Tests for the DIY controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents', () => ({
  diyAgent: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    })
  }
}));

vi.mock('../../src/utils/controllerHelpers', () => ({
  getUserIdFromRequest: vi.fn().mockResolvedValue('user-123')
}));

describe('DIY Controller', () => {
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

  describe('generateProject', () => {
    it('should generate project successfully', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { project: { id: 'proj-1', title: 'Build a Shelf' } }
      });

      const { generateProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { 
        description: 'I want to build a wooden shelf for my garage',
        category: 'woodworking',
        budget: 100
      };

      await generateProject(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when description missing', async () => {
      const { generateProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { category: 'woodworking' };

      await generateProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when description too short', async () => {
      const { generateProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { description: 'abcd' }; // < 5 chars

      await generateProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when description too long', async () => {
      const { generateProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { description: 'a'.repeat(2001) }; // > 2000 chars

      await generateProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when agent returns error', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Failed to generate project'
      });

      const { generateProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { description: 'Build a wooden table' };

      await generateProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getProject', () => {
    it('should return project by id', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { project: { id: 'proj-1', title: 'Build a Shelf' } }
      });

      const { getProject } = await import('../../src/controllers/diyController');
      
      mockReq.params = { id: 'proj-1' };

      await getProject(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when project not found', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Project not found'
      });

      const { getProject } = await import('../../src/controllers/diyController');
      
      mockReq.params = { id: 'nonexistent' };

      await getProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getProjects', () => {
    it('should return user projects', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { projects: [{ id: 'proj-1', title: 'Build a Shelf' }] }
      });

      const { getProjects } = await import('../../src/controllers/diyController');

      await getProjects(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return empty array when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { getProjects } = await import('../../src/controllers/diyController');

      await getProjects(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ projects: [] });
    });
  });

  describe('saveProject', () => {
    it('should save project successfully', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { project: { id: 'proj-1', title: 'Build a Shelf' } }
      });

      const { saveProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { project: { title: 'Build a Shelf' } };

      await saveProject(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { saveProject } = await import('../../src/controllers/diyController');
      
      mockReq.body = { project: { title: 'Test' } };

      await saveProject(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('updateProjectStatus', () => {
    it('should update project status', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { project: { id: 'proj-1', status: 'in_progress' } }
      });

      const { updateProjectStatus } = await import('../../src/controllers/diyController');
      
      mockReq.params = { id: 'proj-1' };
      mockReq.body = { status: 'in_progress' };

      await updateProjectStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getMaterialsWithLinks', () => {
    it('should return materials with purchase links', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          materials: [
            { name: 'Wood Planks', links: ['https://store.com/wood'] }
          ] 
        }
      });

      const { getMaterialsWithLinks } = await import('../../src/controllers/diyController');
      
      mockReq.body = { 
        materials: ['Wood Planks', 'Screws'],
        location: 'US'
      };

      await getMaterialsWithLinks(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('createShoppingList', () => {
    it('should create shopping list from materials', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { list: { id: 'list-1' } }
      });

      const { createShoppingList } = await import('../../src/controllers/diyController');
      
      mockReq.body = { projectId: 'proj-1', materials: ['Wood', 'Screws'] };

      await createShoppingList(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getUserIdFromRequest } = await import('../../src/utils/controllerHelpers');
      (getUserIdFromRequest as any).mockResolvedValue(null);

      const { createShoppingList } = await import('../../src/controllers/diyController');
      
      mockReq.body = { materials: ['Wood'] };

      await createShoppingList(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('searchIdeas', () => {
    it('should search DIY ideas', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { ideas: [{ id: 'idea-1', title: 'DIY Coffee Table' }] }
      });

      const { searchIdeas } = await import('../../src/controllers/diyController');
      
      mockReq.query = { query: 'coffee table' };

      await searchIdeas(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when query missing', async () => {
      const { searchIdeas } = await import('../../src/controllers/diyController');
      
      mockReq.query = {};

      await searchIdeas(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getTemplates', () => {
    it('should return DIY templates', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { templates: [{ id: 'tmpl-1', name: 'Basic Shelf' }] }
      });

      const { getTemplates } = await import('../../src/controllers/diyController');

      await getTemplates(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('addFeedback', () => {
    it('should add project feedback', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { feedback: { id: 'fb-1' } }
      });

      const { addFeedback } = await import('../../src/controllers/diyController');
      
      mockReq.params = { id: 'proj-1' };
      mockReq.body = { rating: 5, notes: 'Great project!' };

      await addFeedback(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return categories', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          categories: ['woodworking', 'electronics', 'home_improvement']
        }
      });

      const { getCategories } = await import('../../src/controllers/diyController');

      await getCategories(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getFeaturedIdeas', () => {
    it('should return featured ideas', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { ideas: [{ id: 'idea-1', title: 'Featured Project' }] }
      });

      const { getFeaturedIdeas } = await import('../../src/controllers/diyController');

      await getFeaturedIdeas(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getInspiration', () => {
    it('should return random inspiration', async () => {
      const { diyAgent } = await import('../../src/agents');
      (diyAgent.execute as any).mockResolvedValue({
        success: true,
        data: { inspiration: { title: 'DIY Bird Feeder' } }
      });

      const { getInspiration } = await import('../../src/controllers/diyController');

      await getInspiration(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });
});

